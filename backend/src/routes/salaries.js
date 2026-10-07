import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap, STAFF_ROLES } from "../middleware.js";
import { salarySlipPdf } from "../lib/pdf.js";

const router = Router();
router.use(requireAuth, requireRole(...STAFF_ROLES));

const SELECT = "*, staff:users!salaries_staff_id_fkey(id, name, email, role)";
const round = (n) => Math.round(n * 100) / 100;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  return [new Date(Date.UTC(y, m - 1, 1)).toISOString(), new Date(Date.UTC(y, m, 1)).toISOString()];
}

// Admin sees everyone; normal staff only see their own slips.
router.get("/", wrap(async (req, res) => {
  let q = supabase.from("salaries").select(SELECT).order("month", { ascending: false });
  if (req.user.role !== "admin") q = q.eq("staff_id", req.user.id);
  else if (req.query.month) q = q.eq("month", req.query.month);
  res.json(unwrap(await q));
}));

// Admin: generate for all staff. Staff: generate their own slip. Paid slips are never overwritten.
router.post("/generate", wrap(async (req, res) => {
  const { month } = req.body;
  if (!MONTH_RE.test(month || "")) return res.status(400).json({ error: "month must be YYYY-MM" });

  let q = supabase.from("users").select("id, base_salary, commission_pct").in("role", STAFF_ROLES).eq("active", true);
  if (req.user.role !== "admin") q = q.eq("id", req.user.id);
  const staff = unwrap(await q);

  const [from, to] = monthRange(month);
  const invoices = unwrap(await supabase.from("invoices").select("staff_id, total").gte("created_at", from).lt("created_at", to));
  const existing = unwrap(await supabase.from("salaries").select("*").eq("month", month));
  const byStaff = Object.fromEntries(existing.map((s) => [s.staff_id, s]));

  const rows = [];
  for (const s of staff) {
    const prev = byStaff[s.id];
    if (prev?.status === "paid") continue;
    const sales = invoices.filter((i) => i.staff_id === s.id).reduce((t, i) => t + Number(i.total), 0);
    const base = Number(s.base_salary || 0);
    const commission = round((sales * Number(s.commission_pct || 0)) / 100);
    const bonus = Number(prev?.bonus || 0), deductions = Number(prev?.deductions || 0);
    rows.push({ staff_id: s.id, month, base, commission, bonus, deductions, net: round(base + commission + bonus - deductions) });
  }
  if (rows.length) unwrap(await supabase.from("salaries").upsert(rows, { onConflict: "staff_id,month" }));
  const q2 = supabase.from("salaries").select(SELECT).eq("month", month);
  res.json(unwrap(req.user.role === "admin" ? await q2 : await q2.eq("staff_id", req.user.id)));
}));

router.patch("/:id", requireRole("admin"), wrap(async (req, res) => {
  const cur = unwrap(await supabase.from("salaries").select("*").eq("id", req.params.id).single());
  const next = { ...cur };
  for (const k of ["base", "bonus", "deductions"]) if (req.body[k] !== undefined) next[k] = Number(req.body[k]);
  const patch = { base: next.base, bonus: next.bonus, deductions: next.deductions, net: round(next.base + Number(cur.commission) + next.bonus - next.deductions) };
  if (req.body.status === "paid" && cur.status !== "paid") Object.assign(patch, { status: "paid", paid_at: new Date().toISOString() });
  res.json(unwrap(await supabase.from("salaries").update(patch).eq("id", req.params.id).select(SELECT).single()));
}));

router.get("/:id/pdf", wrap(async (req, res) => {
  const slip = unwrap(await supabase.from("salaries").select(SELECT).eq("id", req.params.id).single());
  if (req.user.role !== "admin" && slip.staff_id !== req.user.id) return res.status(403).json({ error: "Not allowed" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="salary-${slip.month}.pdf"`);
  res.send(await salarySlipPdf(slip, slip.staff));
}));

export default router;
