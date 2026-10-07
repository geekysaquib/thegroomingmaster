import { Router } from "express";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "../supabase.js";
import { signToken, requireAuth, wrap } from "../middleware.js";

const router = Router();
const PUBLIC_FIELDS = "id, name, email, phone, gender, role, avatar";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const SIGNATURES = { "image/png": [0x89, 0x50, 0x4e, 0x47], "image/jpeg": [0xff, 0xd8, 0xff], "image/gif": [0x47, 0x49, 0x46], "image/webp": [0x52, 0x49, 0x46, 0x46] };

/** Validates a base64 image data URL: allowed type, real image bytes, <= 2 MB. Returns an error string or null. */
function checkAvatar(dataUrl) {
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,/.exec(dataUrl);
  if (!m) return "Profile picture must be a PNG, JPG, GIF or WebP image.";
  const bytes = Buffer.from(dataUrl.slice(m[0].length), "base64");
  if (bytes.length > MAX_AVATAR_BYTES) return "Profile picture must be 2 MB or smaller.";
  if (!SIGNATURES[m[1]].every((b, i) => bytes[i] === b)) return "That file is not a valid image.";
  return null;
}

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

// Update own profile: name, phone and/or profile picture (avatar: base64 data URL, or null to remove).
router.patch("/me", requireAuth, wrap(async (req, res) => {
  const patch = {};
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: "Name can't be empty." });
    patch.name = name;
  }
  if (req.body.phone !== undefined) patch.phone = String(req.body.phone).trim().slice(0, 30) || null;
  if (req.body.avatar !== undefined) {
    if (req.body.avatar !== null) {
      const problem = typeof req.body.avatar === "string" ? checkAvatar(req.body.avatar) : "Invalid picture.";
      if (problem) return res.status(problem.includes("2 MB") ? 413 : 400).json({ error: problem });
    }
    patch.avatar = req.body.avatar;
  }
  if (!Object.keys(patch).length) return res.status(400).json({ error: "Nothing to update." });
  res.json(unwrap(await supabase.from("users").update(patch).eq("id", req.user.id).select(PUBLIC_FIELDS).single()));
}));

export default router;
