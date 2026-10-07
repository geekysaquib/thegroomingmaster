import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, wrap, STAFF_ROLES } from "../middleware.js";

const router = Router();
router.use(requireAuth);

const SELECT = "*, customer:users!bookings_customer_id_fkey(id, name, phone, avatar), staff:users!bookings_staff_id_fkey(id, name, avatar), service:services(id, name, price, duration_min, category)";
const ACTIVE = ["pending", "booked"]; // statuses that occupy a stylist's time

// Customers see only their own bookings; staff can filter by date range, status and customer.
router.get("/", wrap(async (req, res) => {
  let q = supabase.from("bookings").select(SELECT).order("start_at");
  if (req.user.role === "customer") q = q.eq("customer_id", req.user.id);
  else if (req.query.customer_id) q = q.eq("customer_id", req.query.customer_id);
  if (req.query.from) q = q.gte("start_at", req.query.from);
  if (req.query.to) q = q.lt("start_at", req.query.to);
  if (req.query.status) q = q.eq("status", req.query.status);
  res.json(unwrap(await q));
}));

/** True when `staffId` already has an active booking overlapping [start, end) (ignoring `exceptId`). */
async function staffClash(staffId, start, end, exceptId) {
  let q = supabase.from("bookings").select("id").eq("staff_id", staffId).in("status", ACTIVE)
    .lt("start_at", end.toISOString()).gt("end_at", start.toISOString());
  if (exceptId) q = q.neq("id", exceptId);
  return unwrap(await q).length > 0;
}

router.post("/", wrap(async (req, res) => {
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const { service_id, start_at, notes, staff_id } = req.body;
  const customer_id = isStaff ? req.body.customer_id : req.user.id;
  if (!customer_id || !service_id || !start_at) return res.status(400).json({ error: "Customer, service and time are required" });

  const start = new Date(start_at);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
  if (!isStaff && start < new Date()) return res.status(400).json({ error: "Please pick a future time" });

  const service = unwrap(await supabase.from("services").select("duration_min, active").eq("id", service_id).single());
  if (!service.active) return res.status(400).json({ error: "This service is no longer offered" });
  const end = new Date(start.getTime() + service.duration_min * 60000);

  if (staff_id && (await staffClash(staff_id, start, end))) return res.status(409).json({ error: "That stylist is already booked at this time" });

  // Salon-made bookings are confirmed immediately; online requests wait for the salon to accept them.
  const row = { customer_id, service_id, staff_id: isStaff ? staff_id || null : null, start_at: start.toISOString(), end_at: end.toISOString(), notes, created_by: req.user.id, status: isStaff ? "booked" : "pending" };
  res.status(201).json(unwrap(await supabase.from("bookings").insert(row).select(SELECT).single()));
}));

router.patch("/:id", wrap(async (req, res) => {
  const isStaff = STAFF_ROLES.includes(req.user.role);
  const booking = unwrap(await supabase.from("bookings").select("customer_id, status, staff_id, start_at, service:services(duration_min)").eq("id", req.params.id).single());
  if (!isStaff && booking.customer_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });
  // Customers may only cancel; staff can also accept / complete / no-show / assign a stylist / reschedule.
  const allowed = isStaff ? ["status", "staff_id", "notes"] : ["status"];
  const patch = Object.fromEntries(allowed.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (!isStaff && patch.status !== "cancelled") return res.status(403).json({ error: "You can only cancel a booking" });

  if (isStaff && req.body.start_at) {
    const start = new Date(req.body.start_at);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: "Invalid start time" });
    const end = new Date(start.getTime() + booking.service.duration_min * 60000);
    const stylist = patch.staff_id !== undefined ? patch.staff_id : booking.staff_id;
    if (stylist && (await staffClash(stylist, start, end, req.params.id))) return res.status(409).json({ error: "That stylist is already booked at this time" });
    Object.assign(patch, { start_at: start.toISOString(), end_at: end.toISOString() });
  }
  res.json(unwrap(await supabase.from("bookings").update(patch).eq("id", req.params.id).select(SELECT).single()));
}));

export default router;
