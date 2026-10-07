import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap } from "../middleware.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

// The salon is in India: bucket days in IST (UTC+5:30) so "today" and weekdays match the shop floor.
const TZ_OFFSET_MS = 330 * 60000;
const local = (iso) => new Date(new Date(iso).getTime() + TZ_OFFSET_MS);
const day = (iso) => local(iso).toISOString().slice(0, 10);
const monthKey = (iso) => local(iso).toISOString().slice(0, 7);
const round2 = (n) => Math.round(n * 100) / 100;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Supabase returns at most 1000 rows per request, so page through to avoid silently truncated stats. */
async function fetchAll(makeQuery) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = unwrap(await makeQuery().range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const count = async (query) => {
  const { count: n, error } = await query;
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return n || 0;
};

// Dashboard data. ?days=30 (1-365) and optional ?staff_id=. Also returns the previous period of the same
// length so the UI can show "vs previous" deltas.
router.get("/summary", wrap(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  const staffId = req.query.staff_id || null;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const prevSince = new Date(Date.now() - 2 * days * 86400000).toISOString();

  // Last 6 calendar months (IST) for the revenue-vs-expenses chart.
  const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
  const monthStarts = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth() - (5 - i), 1)));
  const monthsSince = new Date(monthStarts[0].getTime() - TZ_OFFSET_MS).toISOString();
  const earliest = monthsSince < prevSince ? monthsSince : prevSince;

  const [invoicesAll, bookingsAll, customersAll, salaries, customersTotal, activeServices, pendingRequests] = await Promise.all([
    fetchAll(() => supabase.from("invoices").select("total, items, payment_method, created_at, staff_id, staff:users!invoices_staff_id_fkey(name)").gte("created_at", earliest).order("created_at")),
    fetchAll(() => supabase.from("bookings").select("status, start_at, staff_id").gte("start_at", prevSince).order("start_at")),
    fetchAll(() => supabase.from("users").select("id, created_at").eq("role", "customer").gte("created_at", prevSince).order("created_at")),
    fetchAll(() => supabase.from("salaries").select("month, net, staff_id").gte("month", monthKey(monthsSince)).order("month")),
    count(supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "customer")),
    count(supabase.from("services").select("id", { count: "exact", head: true }).eq("active", true)),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")),
  ]);

  const byStaffFilter = (list) => (staffId ? list.filter((x) => x.staff_id === staffId) : list);
  const invoicesF = byStaffFilter(invoicesAll);
  const invoices = invoicesF.filter((i) => i.created_at >= since), prevInvoices = invoicesF.filter((i) => i.created_at >= prevSince && i.created_at < since);
  const bookingsF = byStaffFilter(bookingsAll);
  const bookings = bookingsF.filter((b) => b.start_at >= since), prevBookings = bookingsF.filter((b) => b.start_at < since);
  const newCustomers = customersAll.filter((c) => c.created_at >= since), prevNewCustomers = customersAll.filter((c) => c.created_at < since);
  const sum = (list) => list.reduce((t, i) => t + Number(i.total), 0);

  const revenueByDay = {}, byPayment = {}, byStaff = {}, byService = {};
  for (const inv of invoices) {
    const t = Number(inv.total), d = day(inv.created_at);
    revenueByDay[d] = (revenueByDay[d] || 0) + t;
    byPayment[inv.payment_method] = (byPayment[inv.payment_method] || 0) + t;
    const sn = inv.staff?.name || "Unassigned";
    byStaff[sn] = (byStaff[sn] || 0) + t;
    for (const it of inv.items) {
      const s = (byService[it.name] ||= { value: 0, count: 0 });
      s.value += it.price * it.qty; s.count += Number(it.qty);
    }
  }

  // Bookings (not cancelled) per day and per weekday, new customers per day.
  const bookingsByDay = {}, customersByDay = {}, weekdayCounts = Array(7).fill(0), bookingStatus = {};
  for (const b of bookings) {
    bookingStatus[b.status] = (bookingStatus[b.status] || 0) + 1;
    if (b.status === "cancelled") continue;
    bookingsByDay[day(b.start_at)] = (bookingsByDay[day(b.start_at)] || 0) + 1;
    weekdayCounts[local(b.start_at).getUTCDay()] += 1;
  }
  for (const c of newCustomers) customersByDay[day(c.created_at)] = (customersByDay[day(c.created_at)] || 0) + 1;

  // Fill empty days so the charts have a continuous x-axis.
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000 + TZ_OFFSET_MS).toISOString().slice(0, 10);
    series.push({ date: d, revenue: round2(revenueByDay[d] || 0), bookings: bookingsByDay[d] || 0, customers: customersByDay[d] || 0 });
  }

  // Revenue vs salary expenses for the last 6 months.
  const salaryF = staffId ? salaries.filter((s) => s.staff_id === staffId) : salaries;
  const monthly = monthStarts.map((m) => {
    const key = m.toISOString().slice(0, 7);
    return {
      month: key, label: MONTHS[m.getUTCMonth()],
      revenue: round2(sum(invoicesF.filter((i) => monthKey(i.created_at) === key))),
      expenses: round2(salaryF.filter((s) => s.month === key).reduce((t, s) => t + Number(s.net), 0)),
    };
  });

  const toList = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value: round2(value) })).sort((a, b) => b.value - a.value);
  const revenue = sum(invoices), prevRevenue = sum(prevInvoices);
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  res.json({
    days,
    totals: {
      revenue: round2(revenue),
      invoices: invoices.length,
      avgTicket: invoices.length ? round2(revenue / invoices.length) : 0,
      bookings: bookings.length,
      newCustomers: newCustomers.length,
      customersTotal, activeServices, pendingRequests,
      cancellationRate: bookings.length ? round2((cancelled / bookings.length) * 100) : 0,
    },
    previous: {
      revenue: round2(prevRevenue),
      invoices: prevInvoices.length,
      avgTicket: prevInvoices.length ? round2(prevRevenue / prevInvoices.length) : 0,
      bookings: prevBookings.length,
      newCustomers: prevNewCustomers.length,
    },
    series,
    monthly,
    byService: Object.entries(byService).map(([name, s]) => ({ name, value: round2(s.value), count: s.count })).sort((a, b) => b.value - a.value).slice(0, 8),
    byStaff: toList(byStaff),
    byPayment: toList(byPayment),
    bookingStatus: toList(bookingStatus),
    byWeekday: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ name: WEEKDAYS[d], value: weekdayCounts[d] })),
  });
}));

export default router;
