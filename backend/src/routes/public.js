import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "../supabase.js";
import { wrap } from "../middleware.js";
import { DAY_NAMES, getHours, salonDay, withinWindow } from "../lib/settings.js";
import { notifyBookingCreated } from "../lib/mailer.js";
import { SELECT, shape } from "./bookings.js";

// Public endpoints behind the "Scan to book" QR page (/scan/booking). No login needed to open it, but booking always ends with an
// account: name + phone + email + password. A new email registers a new account; an email that already has an account must give
// its password (so nobody can book as someone else); a salon-made profile (no login yet) is upgraded to a full account.
// The booking is a *pending* request for the salon to accept.
const router = Router();

// Small in-memory throttle (per warm server instance) so the open endpoint can't be used to flood the salon.
const hits = new Map();
const tooMany = (key, max, windowMs) => { const now = Date.now(); const list = (hits.get(key) || []).filter((t) => now - t < windowMs); hits.set(key, [...list, now]); return list.length >= max; };

const fail = (status, error) => Object.assign(new Error(error), { status });

/** Indian mobile -> 10 digits, or null. Accepts "+91 98765 43210", "09876543210", "98765-43210"... */
function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

router.get("/hours", wrap(async (_req, res) => res.json(await getHours())));

router.post("/book", wrap(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // honeypot: real people never fill this hidden field
  if (tooMany(`ip:${req.ip}`, 10, 3600_000)) throw fail(429, "Too many requests - please try again in a little while.");

  // ---- validate the form ----
  const name = String(b.name || "").trim().slice(0, 120);
  const phone = normalizePhone(b.phone);
  const email = String(b.email || "").trim().toLowerCase();
  const gender = ["male", "female", "other"].includes(b.gender) ? b.gender : null;
  const password = typeof b.password === "string" ? b.password : "";
  const notes = String(b.notes || "").trim().slice(0, 500) || null;
  if (name.length < 2) throw fail(400, "Please enter your name.");
  if (!phone) throw fail(400, "Please enter a valid 10-digit mobile number.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw fail(400, "That email address doesn't look right.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw fail(400, "Please enter a valid email address - your account is created with it.");
  if (password.length < 8 || password.length > 200) throw fail(400, "Please choose a password with at least 8 characters.");
  if (tooMany(`pw:${email}`, 10, 3600_000)) throw fail(429, "Too many attempts for this email - please try again in an hour or reset your password.");
  if (tooMany(`phone:${phone}`, 6, 24 * 3600_000)) throw fail(429, "Too many requests for this number today - please call the salon.");

  const ids = Array.isArray(b.service_ids) ? [...new Set(b.service_ids.map(String))] : [];
  if (!ids.length) throw fail(400, "Please choose at least one service.");
  if (ids.length > 10) throw fail(400, "Please choose at most 10 services per booking.");
  const start = new Date(b.start_at);
  if (Number.isNaN(start.getTime())) throw fail(400, "Please pick a date and time.");
  if (start < new Date()) throw fail(400, "Please pick a future time.");

  const found = unwrap(await supabase.from("services").select("id, name, price, price_type, duration_min, active").in("id", ids));
  const byId = Object.fromEntries(found.map((x) => [x.id, x]));
  if (ids.some((id) => !byId[id] || !byId[id].active)) throw fail(400, "One of the selected services is no longer available.");
  const services = ids.map((id) => byId[id]);
  const end = new Date(start.getTime() + services.reduce((t, x) => t + x.duration_min, 0) * 60000);

  // Salon hours for that weekday (set by the admin). Never limited by how many other bookings exist.
  const hours = await getHours();
  const dayName = DAY_NAMES[salonDay(start)], day = hours.days[salonDay(start)];
  if (day.closed) throw fail(400, `We're closed on ${dayName}s - please pick another day.`);
  if (!withinWindow(start, end, day.open, day.close)) throw fail(400, `On ${dayName}s we're open ${day.open} - ${day.close}; please pick a time inside those hours.`);

  // ---- account: find, verify or create ----
  const cols = "id, name, email, phone, role, active, password_hash";
  let customer = unwrap(await supabase.from("users").select(cols).eq("email", email))[0] || null;
  let existing = false, accountCreated = false;
  if (customer) {
    if (customer.role !== "customer") throw fail(400, "Please use a different email address for online booking.");
    if (!customer.active) throw fail(403, "We can't take online bookings for this account - please call the salon.");
    existing = true;
    if (customer.password_hash) {
      if (!(await bcrypt.compare(password, customer.password_hash))) throw fail(401, "This email already has an account - please enter its password (or use Forgot password to reset it).");
    } else { // a salon-made profile with no login yet: this booking gives it one
      unwrap(await supabase.from("users").update({ password_hash: await bcrypt.hash(password, 10), ...(customer.phone ? {} : { phone }) }).eq("id", customer.id));
      accountCreated = true;
    }
  } else {
    // A walk-in profile the salon made from this phone number (no email yet) is upgraded instead of duplicated.
    const walkIn = unwrap(await supabase.from("users").select(cols).eq("phone", phone).eq("role", "customer").is("email", null).is("password_hash", null).order("created_at").limit(1))[0];
    const password_hash = await bcrypt.hash(password, 10);
    if (walkIn) {
      if (!walkIn.active) throw fail(403, "We can't take online bookings for this profile - please call the salon.");
      customer = unwrap(await supabase.from("users").update({ email, password_hash }).eq("id", walkIn.id).select(cols).single());
      existing = true;
    } else {
      customer = unwrap(await supabase.from("users").insert({ name, phone, email, gender, role: "customer", password_hash }).select(cols).single());
    }
    accountCreated = true;
  }

  // ---- the booking request (same shape as every other booking: one booking, many services) ----
  const items = services.map((x) => ({ service_id: x.id, name: x.name, price: Number(x.price), price_type: x.price_type, duration_min: x.duration_min }));
  const row = { customer_id: customer.id, service_id: items[0].service_id, items, staff_id: null, start_at: start.toISOString(), end_at: end.toISOString(), notes, created_by: customer.id, status: "pending" };
  const booking = shape(unwrap(await supabase.from("bookings").insert(row).select(SELECT).single()));
  await notifyBookingCreated(booking);

  res.status(201).json({
    ok: true, existing, account_created: accountCreated,
    customer: { name: customer.name },
    booking: { id: booking.id, start_at: booking.start_at, end_at: booking.end_at, services: booking.services, total: booking.service.price, minutes: booking.service.duration_min },
  });
}));

export default router;
