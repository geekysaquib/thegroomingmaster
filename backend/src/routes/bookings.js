import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, wrap, STAFF_ROLES } from "../middleware.js";
import { DAY_NAMES, getHours, salonDay, withinWindow } from "../lib/settings.js";
import { notifyBookingCreated, notifyBookingChanged } from "../lib/mailer.js";

const router = Router();
router.use(requireAuth);

const SELECT = "*, customer:users!bookings_customer_id_fkey(id, name, email, phone, avatar), staff:users!bookings_staff_id_fkey(id, name, email, avatar), service:services(id, name, price, price_type, duration_min, category)";
const ACTIVE = ["pending", "booked"]; // statuses that occupy a stylist's time

/**
 * One booking can hold several services (`items`, a snapshot taken at booking time). Clients get `services` (the list) and a
 * combined `service` ("Haircut + Hair Spa", total price, total minutes) so single-service screens keep working.
 * Older bookings have no `items`; they fall back to their one linked service.
 */
export function shape(b) {
  const base = b.service || {};
  const services = b.items?.length ? b.items : [{ service_id: base.id, name: base.name, price: base.price, price_type: base.price_type, duration_min: base.duration_min }];
  return {
    ...b, services,
    service: { ...base, name: services.map((x) => x.name).join(" + "), price: services.reduce((t, x) => t + Number(x.price), 0), duration_min: services.reduce((t, x) => t + Number(x.duration_min), 0), count: services.length },
  };
}

// Customers see only their own bookings; staff can filter by date range, status and customer.
router.get("/", wrap(async (req, res) => {
  let q = supabase.from("bookings").select(SELECT).order("start_at");
  if (req.user.role === "customer") q = q.eq("customer_id", req.user.id);
  else if (req.query.customer_id) q = q.eq("customer_id", req.query.customer_id);
  if (req.query.from) q = q.gte("start_at", req.query.from);
  if (req.query.to) q = q.lt("start_at", req.query.to);
  if (req.query.status) q = q.eq("status", req.query.status);
  res.json(unwrap(await q).map(shape));
}));

/** True when `staffId` already has an active booking overlapping [start, end) (ignoring `exceptId`). */
async function staffClash(staffId, start, end, exceptId) {
  let q = supabase.from("bookings").select("id").eq("staff_id", staffId).in("status", ACTIVE)
    .lt("start_at", end.toISOString()).gt("end_at", start.toISOString());
  if (exceptId) q = q.neq("id", exceptId);
  return unwrap(await q).length > 0;
}

/** Throws a 400 when the stylist has a shift and [start, end) falls outside it. */
async function checkShift(staffId, start, end) {
  if (!staffId) return;
  const u = unwrap(await supabase.from("users").select("name, shift_start, shift_end").eq("id", staffId).single());
  if (u.shift_start && u.shift_end && !withinWindow(start, end, u.shift_start, u.shift_end)) {
    const err = new Error(`${u.name}'s shift is ${u.shift_start} - ${u.shift_end}; pick a time inside it`); err.status = 400; throw err;
  }
}

router.post("/", wrap(async (req, res) => {
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const { start_at, notes, staff_id } = req.body;
  // A customer can pick several services; they all go into a single booking.
    const ids = Array.isArray(req.body.service_ids) ? [...new Set(req.body.service_ids)] : req.body.service_id ? [req.body.service_id] : [];
  if (ids.length > 10) return res.status(400).json({ error: "Please choose at most 10 services per booking" });
  const customer_id = isStaff ? req.body.customer_id : req.user.id;
  if (!customer_id || !ids.length || !start_at) return res.status(400).json({ error: "Customer, service and time are required" });

  const start = new Date(start_at);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
  if (isStaff) {
    const c = unwrap(await supabase.from("users").select("active").eq("id", customer_id).eq("role", "customer"));
    if (!c.length) return res.status(400).json({ error: "Customer not found" });
    if (!c[0].active) return res.status(400).json({ error: "This customer is blocked. Unblock them first to book." });
  }
  if (!isStaff && start < new Date()) return res.status(400).json({ error: "Please pick a future time" });

  const found = unwrap(await supabase.from("services").select("id, name, price, price_type, duration_min, active").in("id", ids));
  const byId = Object.fromEntries(found.map((x) => [x.id, x]));
  if (ids.some((id) => !byId[id])) return res.status(400).json({ error: "One of the selected services was not found" });
  if (ids.some((id) => !byId[id].active)) return res.status(400).json({ error: "One of the selected services is no longer offered" });
  const services = ids.map((id) => byId[id]);
  const end = new Date(start.getTime() + services.reduce((t, x) => t + x.duration_min, 0) * 60000); // end of the whole visit

  // Slots follow the salon hours set by the admin. Bookings are never limited by how many others exist at that time.
  if (!isStaff) {
    const hours = await getHours();
    const day = hours.days[salonDay(start)];
    if (day.closed) return res.status(400).json({ error: `We're closed on ${DAY_NAMES[salonDay(start)]}s; please pick another day` });
    if (!withinWindow(start, end, day.open, day.close)) return res.status(400).json({ error: `On ${DAY_NAMES[salonDay(start)]}s we're open ${day.open} - ${day.close}; please pick a time inside those hours` });
  }
  if (isStaff && staff_id) await checkShift(staff_id, start, end);

  if (staff_id && (await staffClash(staff_id, start, end))) return res.status(409).json({ error: "That stylist is already booked at this time" });

  // ONE booking for the whole visit: it spans the total time and lists every chosen service.
  // Salon-made bookings are confirmed immediately; online requests wait for the salon to accept them.
  const items = services.map((x) => ({ service_id: x.id, name: x.name, price: Number(x.price), price_type: x.price_type, duration_min: x.duration_min }));
  const row = { customer_id, service_id: items[0].service_id, items, staff_id: isStaff ? staff_id || null : null, start_at: start.toISOString(), end_at: end.toISOString(), notes, created_by: req.user.id, status: isStaff ? "booked" : "pending" };
  const created = shape(unwrap(await supabase.from("bookings").insert(row).select(SELECT).single()));
  await notifyBookingCreated(created);
  res.status(201).json(created);
}));

router.patch("/:id", wrap(async (req, res) => {
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const booking = unwrap(await supabase.from("bookings").select("customer_id, status, staff_id, start_at, end_at").eq("id", req.params.id).single());
  if (!isStaff && booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });
  // Customers may only cancel; staff can also accept / complete / no-show / assign a stylist / reschedule.
  const allowed = isStaff ? ["status", "staff_id", "notes"] : ["status"];
  const patch = Object.fromEntries(allowed.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (!isStaff && patch.status !== "cancelled") return res.status(403).json({ error: "You can only cancel a booking" });

  if (isStaff && req.body.start_at) {
    const start = new Date(req.body.start_at);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
    const end = new Date(start.getTime() + (new Date(booking.end_at) - new Date(booking.start_at))); // keep the same length
    const stylist = patch.staff_id !== undefined ? patch.staff_id : booking.staff_id;
    await checkShift(stylist, start, end);
    if (stylist && (await staffClash(stylist, start, end, req.params.id))) return res.status(409).json({ error: "That stylist is already booked at this time" });
    Object.assign(patch, { start_at: start.toISOString(), end_at: end.toISOString() });
  }
  const updated = shape(unwrap(await supabase.from("bookings").update(patch).eq("id", req.params.id).select(SELECT).single()));
  await notifyBookingChanged(booking, updated, req.user);
  res.json(updated);
}));

export default router;
