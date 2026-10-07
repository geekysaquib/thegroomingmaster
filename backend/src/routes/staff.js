import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap, STAFF_ROLES } from "../middleware.js";

const router = Router();
router.use(requireAuth, requireRole(...STAFF_ROLES));

// Any staff can list colleagues (for assigning a stylist); pay details are admin-only.
router.get("/", wrap(async (req, res) => {
  const cols = req.user.role === "admin" ? "id, name, email, phone, role, base_salary, commission_pct, active" : "id, name, role";
  res.json(unwrap(await supabase.from("users").select(cols).in("role", STAFF_ROLES).order("name")));
}));

router.post("/", requireRole("admin"), wrap(async (req, res) => {
  const { name, email, phone, password, role = "staff", base_salary = 0, commission_pct = 0 } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (!STAFF_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  const row = { name, email: email.toLowerCase(), phone, role, base_salary, commission_pct, password_hash: await bcrypt.hash(password, 10) };
  res.status(201).json(unwrap(await supabase.from("users").insert(row).select("id, name, email, role, base_salary, commission_pct, active").single()));
}));

router.put("/:id", requireRole("admin"), wrap(async (req, res) => {
  const patch = {};
  for (const k of ["name", "phone", "role", "base_salary", "commission_pct", "active"]) if (req.body[k] !== undefined) patch[k] = req.body[k];
  if (req.body.password) patch.password_hash = await bcrypt.hash(req.body.password, 10);
  res.json(unwrap(await supabase.from("users").update(patch).eq("id", req.params.id).in("role", STAFF_ROLES)
    .select("id, name, email, role, base_salary, commission_pct, active").single()));
}));

export default router;
