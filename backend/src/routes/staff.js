import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap, STAFF_ROLES } from "../middleware.js";
import { TIME_RE, toMins } from "../lib/settings.js";
import { notifyStaffWelcome } from "../lib/mailer.js";

const router = Router();
const OUT = "id, name, email, phone, role, base_salary, commission_pct, shift_start, shift_end, active";

/** Shift is 'HH:MM' start/end set together; returns an error message or null. */
function shiftError({ shift_start, shift_end }) {
  if (!TIME_RE.test(shift_start || "") || !TIME_RE.test(shift_end || "")) return "Shift start and end must both be set as HH:MM";
  return toMins(shift_start) < toMins(shift_end) ? null : "Shift end must be after shift start";
}
router.use(requireAuth, requireRole(...STAFF_ROLES));

// Any staff can list colleagues (for assigning a stylist); pay details are admin-only.
router.get("/", wrap(async (req, res) => {
  const cols = req.user.role === "admin" ? "id, name, email, phone, role, base_salary, commission_pct, shift_start, shift_end, active" : "id, name, role, shift_start, shift_end";
  res.json(unwrap(await supabase.from("users").select(cols).in("role", STAFF_ROLES).order("name")));
}));

router.post("/", requireRole("admin"), wrap(async (req, res) => {
  const { name, email, phone, password, role = "staff", base_salary = 0, commission_pct = 0, shift_start, shift_end } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (!STAFF_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  const bad = shiftError(req.body);
  if (bad) return res.status(400).json({ error: `Assign a shift: ${bad}` });
  const row = { name, email: email.toLowerCase(), phone, role, base_salary, commission_pct, shift_start, shift_end, password_hash: await bcrypt.hash(password, 10) };
  const created = unwrap(await supabase.from("users").insert(row).select(OUT).single());
  await notifyStaffWelcome(created, password);
  res.status(201).json(created);
}));

router.put("/:id", requireRole("admin"), wrap(async (req, res) => {
  const patch = {};
  for (const k of ["name", "phone", "role", "base_salary", "commission_pct", "shift_start", "shift_end", "active"]) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (req.body.shift_start !== undefined || req.body.shift_end !== undefined) {
    const bad = shiftError(req.body);
    if (bad) return res.status(400).json({ error: bad });
  }
  if (req.body.password) patch.password_hash = await bcrypt.hash(req.body.password, 10);
  res.json(unwrap(await supabase.from("users").update(patch).eq("id", req.params.id).in("role", STAFF_ROLES)
    .select(OUT).single()));
}));

export default router;
