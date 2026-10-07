import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap } from "../middleware.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const day = (iso) => iso.slice(0, 10);

// Sales telemetry for the dashboard. ?days=30 (default), max 365.
router.get("/summary", wrap(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const invoices = unwrap(await supabase.from("invoices").select("total, items, payment_method, created_at, customer_id, staff:users!invoices_staff_id_fkey(name)").gte("created_at", since));
  const bookings = unwrap(await supabase.from("bookings").select("status, start_at, service:services(name, category)").gte("start_at", since));
  const newCustomers = unwrap(await supabase.from("users").select("id, created_at").eq("role", "customer").gte("created_at", since));

  const revenueByDay = {}, byPayment = {}, byStaff = {}, byService = {};
  let revenue = 0;
  for (const inv of invoices) {
    const t = Number(inv.total);
    revenue += t;
    revenueByDay[day(inv.created_at)] = (revenueByDay[day(inv.created_at)] || 0) + t;
    byPayment[inv.payment_method] = (byPayment[inv.payment_method] || 0) + t;
    const sn = inv.staff?.name || "Unassigned";
    byStaff[sn] = (byStaff[sn] || 0) + t;
    for (const it of inv.items) byService[it.name] = (byService[it.name] || 0) + it.price * it.qty;
  }

  // Fill empty days so the line chart has a continuous x-axis.
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    series.push({ date: d, revenue: Math.round((revenueByDay[d] || 0) * 100) / 100 });
  }

  const toList = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  const bookingStatus = {}, bookingCategory = {};
  for (const b of bookings) {
    bookingStatus[b.status] = (bookingStatus[b.status] || 0) + 1;
    const c = b.service?.category || "unknown";
    bookingCategory[c] = (bookingCategory[c] || 0) + 1;
  }

  res.json({
    days,
    totals: {
      revenue: Math.round(revenue * 100) / 100,
      invoices: invoices.length,
      avgTicket: invoices.length ? Math.round((revenue / invoices.length) * 100) / 100 : 0,
      bookings: bookings.length,
      newCustomers: newCustomers.length,
    },
    revenueByDay: series,
    byService: toList(byService).slice(0, 8),
    byStaff: toList(byStaff),
    byPayment: toList(byPayment),
    bookingStatus: toList(bookingStatus),
    bookingCategory: toList(bookingCategory),
  });
}));

export default router;
