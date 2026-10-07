import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "../supabase.js";
import { signToken, requireAuth, wrap } from "../middleware.js";

const router = Router();
const PUBLIC_FIELDS = "id, name, email, phone, gender, role";

// Customers self-register. Staff accounts are created by an admin (see /api/staff).
router.post("/register", wrap(async (req, res) => {
  const { name, email, phone, gender, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  const existing = unwrap(await supabase.from("users").select("id, password_hash").eq("email", email.toLowerCase()));
  const password_hash = await bcrypt.hash(password, 10);

  let user;
  if (existing[0] && !existing[0].password_hash) {
    // A walk-in customer staff created earlier - let them claim that profile (and history).
    user = unwrap(await supabase.from("users").update({ name, phone, gender, password_hash })
      .eq("id", existing[0].id).select(PUBLIC_FIELDS).single());
  } else if (existing[0]) {
    return res.status(409).json({ error: "An account with this email already exists" });
  } else {
    user = unwrap(await supabase.from("users")
      .insert({ name, email: email.toLowerCase(), phone, gender, password_hash, role: "customer" })
      .select(PUBLIC_FIELDS).single());
  }
  res.status(201).json({ token: signToken(user), user });
}));

// One login endpoint; `audience` keeps the customer and staff portals from accepting each other's accounts.
router.post("/login", wrap(async (req, res) => {
  const { email, password, audience } = req.body;
  const rows = unwrap(await supabase.from("users").select("*").eq("email", (email || "").toLowerCase()).eq("active", true));
  const user = rows[0];
  const ok = user?.password_hash && (await bcrypt.compare(password || "", user.password_hash));
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const isStaff = user.role !== "customer";
  if (audience === "staff" && !isStaff) return res.status(403).json({ error: "This is not a staff account" });
  if (audience === "customer" && isStaff) return res.status(403).json({ error: "Staff must sign in from the staff portal" });

  const { password_hash, base_salary, commission_pct, ...safe } = user;
  res.json({ token: signToken(user), user: safe });
}));

router.get("/me", requireAuth, wrap(async (req, res) => {
  res.json(unwrap(await supabase.from("users").select(PUBLIC_FIELDS).eq("id", req.user.id).single()));
}));

export default router;
