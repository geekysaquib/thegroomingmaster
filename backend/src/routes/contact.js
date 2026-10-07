import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { wrap } from "../middleware.js";

const router = Router();

// Public: website contact / appointment-request form. Stored in Supabase `enquiries`.
// Very small per-IP throttle so the open endpoint can't be used to flood the table.
const recent = new Map();
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 5;

router.post("/", wrap(async (req, res) => {
  const now = Date.now();
  const hits = (recent.get(req.ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return res.status(429).json({ error: "Too many requests - please try again in a minute." });
  recent.set(req.ip, [...hits, now]);

  const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = clean(req.body.name, 120), email = clean(req.body.email, 160);
  const phone = clean(req.body.phone, 30), message = clean(req.body.message, 2000);
  const source = req.body.source === "appointment" ? "appointment" : "contact";

  if (!name) return res.status(400).json({ error: "Please enter your name." });
  if (!phone && !email) return res.status(400).json({ error: "Please enter a phone number or an email so we can reach you." });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "That email address doesn't look right." });

  unwrap(await supabase.from("enquiries").insert({ name, email: email || null, phone: phone || null, message: message || null, source }));
  res.status(201).json({ ok: true });
}));

export default router;
