import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap, STAFF_ROLES } from "../middleware.js";

const router = Router();
router.use(requireAuth, requireRole(...STAFF_ROLES));

router.get("/", wrap(async (req, res) => {
  let q = supabase.from("users").select("id, name, email, phone, gender, created_at, password_hash")
    .eq("role", "customer").order("created_at", { ascending: false });
  // Strip PostgREST filter syntax characters so a search term can't inject extra conditions.
  const term = String(req.query.search || "").replace(/[,()%*\\]/g, " ").trim();
  if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  const rows = unwrap(await q);
  res.json(rows.map(({ password_hash, ...c }) => ({ ...c, has_account: !!password_hash })));
}));

// Staff adds a walk-in customer (no password; they can claim the profile by registering later).
router.post("/", wrap(async (req, res) => {
  const { name, email, phone, gender } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const row = { name, phone, gender, role: "customer", email: email ? email.toLowerCase() : null };
  res.status(201).json(unwrap(await supabase.from("users").insert(row).select("id, name, email, phone, gender").single()));
}));

// Admin-only CSV export of the whole customer base with lifetime spend / visits.
router.get("/export", requireRole("admin"), wrap(async (_req, res) => {
  const customers = unwrap(await supabase.from("users").select("id, name, email, phone, gender, created_at").eq("role", "customer"));
  const invoices = unwrap(await supabase.from("invoices").select("customer_id, total, created_at"));
  const stats = {};
  for (const inv of invoices) {
    const s = (stats[inv.customer_id] ||= { spent: 0, visits: 0, last: null });
    s.spent += Number(inv.total); s.visits += 1;
    if (!s.last || inv.created_at > s.last) s.last = inv.created_at;
  }
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Name", "Email", "Phone", "Gender", "Joined", "Visits", "Total spent", "Last visit"].join(",")];
  for (const c of customers) {
    const s = stats[c.id] || { spent: 0, visits: 0, last: "" };
    lines.push([c.name, c.email, c.phone, c.gender, c.created_at?.slice(0, 10), s.visits, s.spent.toFixed(2), s.last?.slice(0, 10)].map(esc).join(","));
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="customers.csv"');
  res.send(lines.join("\n"));
}));

export default router;
