import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap } from "../middleware.js";
import { DAY_NAMES, getHours, getSetting, setSetting, TIME_RE, toMins } from "../lib/settings.js";
import { getSmtp, mailEnabled, sendMailStrict, testEmail } from "../lib/mailer.js";

const router = Router();
router.use(requireAuth);

// Everyone signed in can read the salon hours (customers need them to see bookable slots); only admins change them.
router.get("/hours", wrap(async (_req, res) => res.json(await getHours())));

router.put("/hours", requireRole("admin"), wrap(async (req, res) => {
  const slot_min = Number(req.body.slot_min || 30);
  if (!Number.isInteger(slot_min) || slot_min < 5 || slot_min > 240) return res.status(400).json({ error: "Slot interval must be between 5 and 240 minutes" });
  const input = req.body.days;
  if (!Array.isArray(input) || input.length !== 7) return res.status(400).json({ error: "Hours must be given for all 7 days" });
  const days = [];
  for (let i = 0; i < 7; i++) {
    const { open, close, closed } = input[i] || {};
    if (closed) { days.push({ open: TIME_RE.test(open || "") ? open : "10:00", close: TIME_RE.test(close || "") ? close : "21:00", closed: true }); continue; }
    if (!TIME_RE.test(open || "") || !TIME_RE.test(close || "")) return res.status(400).json({ error: `${DAY_NAMES[i]}: opening and closing time must be HH:MM` });
    if (toMins(open) >= toMins(close)) return res.status(400).json({ error: `${DAY_NAMES[i]}: closing time must be after opening time` });
    days.push({ open, close, closed: false });
  }
  await setSetting("hours", { slot_min, days });
  res.json(await getHours());
}));

// Email: admin only. Built for app passwords (Gmail, Outlook, Yahoo, Zoho...): sender address + app password.
// The password is never sent back to the browser.
const smtpView = (c, enabled = true) => ({ enabled, provider: c?.provider || "gmail", host: c?.host || "", port: c?.port || 587, secure: !!c?.secure, user: c?.user || "", from_name: c?.from_name || "The Grooming Master", has_pass: !!c?.pass, configured: !!(c?.host && c?.user && c?.pass) });

router.get("/smtp", requireRole("admin"), wrap(async (_req, res) => res.json(smtpView(await getSmtp(), await mailEnabled()))));

// Master on/off switch for every outgoing email (the saved SMTP details are kept).
router.put("/smtp/enabled", requireRole("admin"), wrap(async (req, res) => {
  if (typeof req.body.enabled !== "boolean") return res.status(400).json({ error: "enabled must be true or false" });
  await setSetting("mail_enabled", { enabled: req.body.enabled });
  res.json({ enabled: req.body.enabled });
}));

router.put("/smtp", requireRole("admin"), wrap(async (req, res) => {
  const { provider, host, port, secure, user, pass, from_name } = req.body;
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test((host || "").trim())) return res.status(400).json({ error: "SMTP host must be a server name like smtp.gmail.com (not an email address). Choose your mail provider to fill it in." });
  if (!/^\S+@\S+\.\S+$/.test((user || "").trim())) return res.status(400).json({ error: "Enter the full email address you'll send from" });
  const prev = (await getSetting("smtp")) || {};
  // App passwords are often displayed in groups ("abcd efgh ijkl mnop"); spaces aren't part of the password.
  const password = pass ? String(pass).replace(/\s+/g, "") : prev.pass || "";
  if (!password) return res.status(400).json({ error: "Enter the app password" });
  const next = { provider: provider || "custom", host: host.trim(), port: Number(port) || 587, secure: !!secure, user: user.trim(), pass: password, from_name: (from_name || "").trim() };
  await setSetting("smtp", next);
  res.json(smtpView(next, await mailEnabled()));
}));

router.post("/smtp/test", requireRole("admin"), wrap(async (req, res) => {
  const me = unwrap(await supabase.from("users").select("email").eq("id", req.user.id).single());
  const to = (req.body.to || me.email || "").trim();
  if (!to) return res.status(400).json({ error: "Enter an address to send the test to" });
  try {
    await sendMailStrict(testEmail(to));
  } catch (e) { return res.status(400).json({ error: `Could not send: ${e.message}` }); }
  res.json({ ok: true, sent_to: to });
}));

export default router;
