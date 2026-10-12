import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireDeveloper, wrap } from "../middleware.js";
import { getSmtp } from "../lib/mailer.js";

const router = Router();
router.use(requireAuth, requireDeveloper);

const count = async (q) => { const { count: n, error } = await q; if (error) throw new Error(error.message); return n || 0; };

// Health snapshot for whoever is watching the salon.
router.get("/overview", wrap(async (_req, res) => {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const users = (role) => supabase.from("users").select("id", { count: "exact", head: true }).eq("role", role);
  const [customers, staff, admins, blocked, bookings, invoices, errors24h, writes24h, smtp] = await Promise.all([
    count(users("customer")), count(users("staff")), count(users("admin")),
    count(supabase.from("users").select("id", { count: "exact", head: true }).eq("active", false)),
    count(supabase.from("bookings").select("id", { count: "exact", head: true })),
    count(supabase.from("invoices").select("id", { count: "exact", head: true })),
    count(supabase.from("activity_log").select("id", { count: "exact", head: true }).gte("status", 400).gte("at", since)),
    count(supabase.from("activity_log").select("id", { count: "exact", head: true }).lt("status", 400).gte("at", since)),
    getSmtp(),
  ]);
  res.json({ customers, staff, admins, blocked, bookings, invoices, errors24h, writes24h, smtp_configured: !!smtp?.host, node: process.version, time: new Date().toISOString() });
}));

// Activity & error feed. ?errors=1 -> only failures; ?search= matches user, path or detail.
router.get("/logs", wrap(async (req, res) => {
  let q = supabase.from("activity_log").select("*").order("at", { ascending: false }).limit(Math.min(Number(req.query.limit) || 200, 500));
  if (req.query.errors === "1") q = q.gte("status", 400);
  const term = String(req.query.search || "").replace(/[,()%*\\]/g, " ").trim();
  if (term) q = q.or(`user_name.ilike.%${term}%,path.ilike.%${term}%,detail.ilike.%${term}%,method.ilike.%${term}%`);
  res.json(unwrap(await q));
}));

export default router;
