import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight, Printer, Receipt, RefreshCw, Scissors, UserPlus, Users, Wallet } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtTime, money } from "../../lib/format";
import Avatar from "../../components/Avatar";
import WelcomeBanner from "../../components/WelcomeBanner";
import { Button, EmptyState, ErrorNote, Skeleton } from "../../components/ui";
import { StatusPill, layoutDay } from "./CalendarPage";

// Salon dashboard: KPI cards, stylist day-schedule, statistics, revenue vs expenses, breakdown charts and an
// upcoming-appointments rail. Every widget shows "No data" when there is nothing to display.

const AXIS = { fontSize: 11, fill: "var(--text-muted)" };
const STAFF_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);
const PAY_COLOR = { cash: "var(--series-1)", card: "var(--series-2)", upi: "var(--series-3)", other: "var(--series-4)" };
const RANGES = [[1, "Today"], [7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 12 months"]];
const START_H = 9, END_H = 21, ROW = 52;
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dateInput = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const abbr = (n) => (n >= 100000 ? `${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : n);

function useCountUp(value, ms = 700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(value); return undefined; }
    let raf, t0;
    const step = (t) => { t0 ??= t; const p = Math.min((t - t0) / ms, 1); setV(Math.round(value * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return v;
}

function Delta({ cur, prev, className = "" }) {
  if (prev === undefined || prev === null) return null;
  if (!prev) return <span className={className}>{cur ? "New this period" : "No change"}</span>;
  const pct = ((cur - prev) / prev) * 100;
  return <span className={className}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs previous</span>;
}

function KpiCard({ label, value, format = (v) => v, icon: Icon, sub, tone }) {
  const shown = useCountUp(value);
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ${tone}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-6 h-24 w-24 rounded-full bg-black/5" />
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/25"><Icon size={18} /></span>
      <div className="relative mt-3 text-3xl font-semibold leading-none tracking-tight">{format(shown)}</div>
      <div className="relative mt-1.5 text-sm font-medium opacity-90">{label}</div>
      <div className="relative mt-1 text-xs opacity-80">{sub}</div>
    </div>
  );
}

function StatTile({ label, value, children, to }) {
  const body = (
    <div className="rounded-xl border border-border bg-surface-1 p-3.5 transition-colors hover:bg-surface-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink-primary">{value}</div>
      <div className="mt-0.5 text-xs text-ink-secondary">{children}</div>
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

function Card({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface-1 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4">
        <div><h2 className="text-[15px] font-semibold text-ink-primary">{title}</h2>{subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}</div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-lg bg-surface-2 p-0.5">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${value === k ? "bg-surface-1 text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary"}`}>{l}</button>
      ))}
    </div>
  );
}

function ChartTip({ active, payload, label, fmt = money, lines }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-3 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink-primary">{label ?? payload[0].payload.name}</div>
      {(lines ? lines(payload) : payload.map((p) => ({ name: p.name, value: fmt(p.value), color: p.color || p.fill }))).map((l) => (
        <div key={l.name} className="flex items-center gap-2 text-ink-secondary"><span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />{l.name}<span className="ml-auto pl-3 font-semibold text-ink-primary">{l.value}</span></div>
      ))}
    </div>
  );
}

const hasValue = (rows, key = "value") => rows?.some((r) => Number(r[key]) > 0);

/** Horizontal bar list (top services / stylists). */
function HBar({ data, fmt, color = "var(--series-1)" }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={abbr} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={118} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--hover-overlay)" }} content={<ChartTip fmt={fmt} />} />
          <Bar isAnimationActive={false} dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentDonut({ data }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((t, d) => t + d.value, 0);
  const cur = active === null ? null : data[active];
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="var(--surface-1)" strokeWidth={2} isAnimationActive={false}
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {data.map((d, i) => <Cell key={d.name} fill={PAY_COLOR[d.name] || "var(--series-4)"} fillOpacity={active === null || active === i ? 1 : 0.35} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-ink-muted">{cur ? cap(cur.name) : "Total"}</div>
          <div className="text-lg font-semibold text-ink-primary">{money(cur ? cur.value : total)}</div>
        </div>
      </div>
      <ul className="min-w-[150px] flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PAY_COLOR[d.name] || "var(--series-4)" }} />
            <span className="text-ink-primary">{cap(d.name)}</span>
            <span className="ml-auto text-ink-secondary">{money(d.value)} · {total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DaySchedule({ date, bookings, staff, now, onStep, onOpen }) {
  const rows = bookings.filter((b) => b.status !== "cancelled");
  const unassigned = rows.filter((b) => !b.staff_id);
  const columns = [...staff.map((s, i) => ({ id: s.id, name: s.name, color: STAFF_COLORS[i % 8] })), ...(unassigned.length ? [{ id: null, name: "Unassigned", color: "var(--text-muted)" }] : [])];
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START_H) * ROW;
  const showNow = sameDay(date, now) && nowTop >= 0 && nowTop <= HOURS.length * ROW;

  return (
    <Card title="Day schedule" subtitle={date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      actions={<>
        <button onClick={() => onStep(-1)} aria-label="Previous day" className="rounded p-1 text-ink-secondary hover:bg-surface-3"><ChevronLeft size={16} /></button>
        <button onClick={() => onStep(1)} aria-label="Next day" className="rounded p-1 text-ink-secondary hover:bg-surface-3"><ChevronRight size={16} /></button>
      </>}>
      {rows.length === 0 ? <EmptyState hint={`No appointments on ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`} /> : (
        <>
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary" aria-label="Stylists">
            {columns.map((c) => <li key={c.id ?? "none"} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />{c.name}</li>)}
          </ul>
          <div className="overflow-x-auto rounded-xl border border-border">
            <div style={{ minWidth: 70 + columns.length * 112 }}>
              <div className="grid border-b border-border bg-surface-2 text-center text-[11px] font-medium text-ink-secondary" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))` }}>
                <div />{columns.map((c) => <div key={c.id ?? "none"} className="truncate border-l border-border px-1 py-2">{c.name}</div>)}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `52px repeat(${columns.length}, minmax(0, 1fr))`, height: HOURS.length * ROW }}>
                <div>{HOURS.map((h) => <div key={h} style={{ height: ROW }} className="pr-2 pt-0.5 text-right text-[10px] text-ink-muted">{h % 12 || 12} {h < 12 ? "AM" : "PM"}</div>)}</div>
                {columns.map((c) => (
                  <div key={c.id ?? "none"} className="relative border-l border-border">
                    {HOURS.map((h) => <div key={h} style={{ height: ROW }} className="border-b border-border/60" />)}
                    {layoutDay(rows.filter((b) => (b.staff_id || null) === c.id)).map(({ b, s, e, col, n }) => {
                      const st = new Date(s), en = new Date(e);
                      return (
                        <button key={b.id} onClick={() => onOpen(b)} title={`${fmtTime(b.start_at)} · ${b.customer.name} · ${b.service.name}`}
                          style={{ top: (st.getHours() + st.getMinutes() / 60 - START_H) * ROW, height: Math.max(((en - st) / 3600000) * ROW - 3, 24), left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)`, borderColor: c.color, background: `color-mix(in srgb, ${c.color} 16%, var(--surface-1))` }}
                          className="absolute overflow-hidden rounded-lg border-l-4 px-1.5 py-1 text-left text-[10px] leading-tight text-ink-primary hover:brightness-95">
                          <div className="truncate font-semibold">{b.service.name}</div><div className="truncate text-ink-secondary">{b.customer.name}</div>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {showNow && <div aria-label="Current time" style={{ top: nowTop }} className="pointer-events-none absolute inset-x-0 z-10 flex items-center"><span className="ml-[46px] h-2.5 w-2.5 rounded-full bg-link" /><span className="h-px flex-1 bg-link" /></div>}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Upcoming({ date, setDate, bookings, pending, now, onOpen }) {
  const weekStart = addDays(startOfDay(date), -date.getDay()); // Sunday-first strip like the design
  const list = bookings.filter((b) => b.status !== "cancelled").sort((a, b) => a.start_at.localeCompare(b.start_at));
  return (
    <aside aria-label="Upcoming appointments" className="rounded-2xl border border-border bg-surface-1">
      <div className="border-b border-border px-4 py-3.5"><h2 className="text-[15px] font-semibold text-ink-primary">Upcoming appointments</h2></div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-primary">{date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
          <div className="flex gap-1">
            <button onClick={() => setDate(addDays(date, -7))} aria-label="Previous week" className="rounded p-1 hover:bg-surface-3"><ChevronLeft size={15} /></button>
            <button onClick={() => setDate(addDays(date, 7))} aria-label="Next week" className="rounded p-1 hover:bg-surface-3"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
            const sel = sameDay(d, date), today = sameDay(d, now);
            return (
              <button key={d.toISOString()} onClick={() => setDate(startOfDay(d))} aria-pressed={sel} aria-label={d.toDateString()}
                className={`rounded-xl py-1.5 ${sel ? "bg-ink-primary text-surface-1" : "hover:bg-surface-3"} ${today && !sel ? "ring-2 ring-accent" : ""}`}>
                <div className={`text-[10px] ${sel ? "opacity-80" : "text-ink-muted"}`}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</div>
                <div className="text-sm font-semibold">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        {pending > 0 && (
          <Link to="/salon/calendar" className="mt-3 flex items-center justify-between rounded-xl bg-accent/20 px-3 py-2 text-xs font-medium text-ink-primary hover:bg-accent/30">
            <span>{pending} booking request{pending > 1 ? "s" : ""} waiting for you</span><ChevronRight size={14} />
          </Link>
        )}
        <ul className="mt-3 max-h-[520px] space-y-2.5 overflow-y-auto">
          {list.length === 0 && <li><EmptyState hint="No appointments on this day." /></li>}
          {list.map((b) => (
            <li key={b.id}>
              <button onClick={() => onOpen(b)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-surface-2">
                <Avatar user={b.customer} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink-primary">{b.customer.name}</div>
                  <div className="truncate text-xs text-ink-secondary">{b.service.name}</div>
                  <div className="truncate text-[11px] text-ink-muted">{fmtTime(b.start_at)}{b.staff ? ` · ${b.staff.name}` : ""}</div>
                </div>
                <div className="text-right"><div className="text-sm font-semibold text-ink-primary">{money(b.service.price)}</div><StatusPill status={b.status} className="mt-1" /></div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [tab, setTab] = useState("revenue");
  const [svcMetric, setSvcMetric] = useState("revenue");
  const [data, setData] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState("");
  const jumpRef = useRef(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => { api.get("/staff").then((r) => setStaff(r.data.filter((s) => s.active !== false))).catch(() => {}); }, []);

  useEffect(() => {
    let live = true;
    setData(null); setError("");
    api.get("/analytics/summary", { params: { days, staff_id: staffId || undefined } })
      .then((r) => live && setData(r.data)).catch((e) => live && setError(errMsg(e)));
    return () => { live = false; };
  }, [days, staffId, tick]);

  useEffect(() => {
    let live = true;
    api.get("/bookings", { params: { from: startOfDay(date).toISOString(), to: addDays(startOfDay(date), 1).toISOString() } })
      .then((r) => live && setDayBookings(r.data)).catch(() => {});
    return () => { live = false; };
  }, [date, tick]);

  const scheduleStaff = useMemo(() => staff.filter((s) => !staffId || s.id === staffId), [staff, staffId]);
  const dayRows = useMemo(() => dayBookings.filter((b) => !staffId || b.staff_id === staffId), [dayBookings, staffId]);
  const openBooking = useCallback(() => navigate("/salon/calendar"), [navigate]);
  const rangeLabel = RANGES.find(([d]) => d === days)?.[1] || "";
  const t = data?.totals, prev = data?.previous;

  const seriesView = {
    revenue: { key: "revenue", name: "Revenue", fmt: money },
    bookings: { key: "bookings", name: "Appointments", fmt: (v) => v },
    customers: { key: "customers", name: "New clients", fmt: (v) => v },
  }[tab];
  const peak = data?.series?.reduce((m, r) => (r[seriesView.key] > (m?.[seriesView.key] ?? 0) ? r : m), null);
  const busiest = data?.byWeekday?.reduce((m, r) => (r.value > (m?.value ?? 0) ? r : m), null);

  const pendingTxt = t?.pendingRequests ? `${t.pendingRequests} booking request${t.pendingRequests > 1 ? "s are" : " is"} waiting for you.` : "You're all caught up on booking requests.";

  return (
    <div className="print-page space-y-4">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Filter by staff" className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-[13px] text-ink-primary">
            <option value="">All staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex items-center rounded-xl border border-border bg-surface-1">
            <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day" className="px-2.5 py-2 text-ink-secondary hover:bg-surface-3"><ChevronLeft size={15} /></button>
            <button onClick={() => setDate(startOfDay(new Date()))} className="border-x border-border px-3 py-2 text-[13px] font-medium text-ink-primary hover:bg-surface-3">Today</button>
            <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day" className="px-2.5 py-2 text-ink-secondary hover:bg-surface-3"><ChevronRight size={15} /></button>
          </div>
          <div className="relative">
            <Button variant="secondary" onClick={() => jumpRef.current?.showPicker?.() || jumpRef.current?.focus()}>Jump to date</Button>
            <input ref={jumpRef} type="date" tabIndex={-1} aria-label="Jump to date" value={dateInput(date)} onChange={(e) => e.target.value && setDate(startOfDay(new Date(`${e.target.value}T00:00:00`)))} className="pointer-events-none absolute inset-0 opacity-0" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range" className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-[13px] text-ink-primary">
            {RANGES.map(([d, l]) => <option key={d} value={d}>{l}</option>)}
          </select>
          <Button variant="secondary" onClick={() => setTick((n) => n + 1)} aria-label="Refresh data"><RefreshCw size={14} /></Button>
          <Button variant="secondary" onClick={() => window.print()} aria-label="Print dashboard"><Printer size={14} /></Button>
        </div>
      </div>

      <WelcomeBanner user={user} message={data ? pendingTxt : "Loading your salon's numbers…"}>
        <Button variant="gold" onClick={() => navigate("/salon/new-booking")}><CalendarPlus size={15} /> New booking</Button>
        <Button variant="glass" onClick={() => navigate("/salon/billing")}><Receipt size={15} /> New invoice</Button>
        <Button variant="glass" onClick={() => navigate("/salon/customers")}><UserPlus size={15} /> Add client</Button>
      </WelcomeBanner>

      <ErrorNote>{error}</ErrorNote>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          {/* Overview */}
          <section aria-label="Overview">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-ink-primary">Overview</h2><span className="text-xs text-ink-muted">{rangeLabel}</span></div>
            {!data ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[140px] rounded-2xl" />)}</div> : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="Total clients" value={t.customersTotal} icon={Users} tone="bg-gradient-to-br from-[#e0c98f] to-[#b8964f] text-[#1f1a0d]" sub={`+${t.newCustomers} new in this period`} />
                <KpiCard label="Appointments" value={t.bookings} icon={CalendarCheck} tone="bg-gradient-to-br from-[#2cc3ae] to-[#168f7e] text-white" sub={<Delta cur={t.bookings} prev={prev.bookings} />} />
                <KpiCard label="Services on menu" value={t.activeServices} icon={Scissors} tone="bg-gradient-to-br from-[#4d8dff] to-[#2358d8] text-white" sub="Active services" />
                <KpiCard label="Revenue" value={t.revenue} format={money} icon={Wallet} tone="bg-gradient-to-br from-[#ff9a4d] to-[#e5651a] text-white" sub={<Delta cur={t.revenue} prev={prev.revenue} />} />
              </div>
            )}
            {data && (
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Average ticket" value={money(t.avgTicket)}><Delta cur={t.avgTicket} prev={prev.avgTicket} /></StatTile>
                <StatTile label="New clients" value={t.newCustomers}><Delta cur={t.newCustomers} prev={prev.newCustomers} /></StatTile>
                <StatTile label="Cancellation rate" value={`${t.cancellationRate}%`}>of {t.bookings} appointments</StatTile>
                <StatTile label="Booking requests" value={t.pendingRequests} to="/salon/calendar">{t.pendingRequests ? "Review and accept →" : "Nothing waiting"}</StatTile>
              </div>
            )}
          </section>

          <div className="grid gap-4 min-[1500px]:grid-cols-2">
            <DaySchedule date={date} bookings={dayRows} staff={scheduleStaff} now={now} onStep={(n) => setDate(addDays(date, n))} onOpen={openBooking} />

            <div className="space-y-4">
              <Card title="Statistics" subtitle={`${rangeLabel} · hover the chart for details`} actions={<Tabs label="Statistic" value={tab} onChange={setTab} tabs={[["revenue", "Revenue"], ["bookings", "Appointments"], ["customers", "Clients"]]} />}>
                {!data ? <Skeleton className="h-60" /> : !hasValue(data.series, seriesView.key) ? <EmptyState /> : (
                  <>
                    {peak && <p className="mb-2 text-xs text-ink-secondary">Peak: <span className="font-semibold text-ink-primary">{seriesView.fmt(peak[seriesView.key])}</span> on {peak.date}</p>}
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.series} margin={{ left: 0, right: 12, top: 8 }}>
                          <defs><linearGradient id="statFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.32} /><stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid vertical={false} stroke="var(--grid)" />
                          <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} minTickGap={36} tickFormatter={(d) => d.slice(5)} />
                          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} tickFormatter={abbr} allowDecimals={false} />
                          <Tooltip cursor={{ stroke: "var(--border-strong)", strokeDasharray: "4 4" }} content={<ChartTip fmt={seriesView.fmt} />} />
                          <Area isAnimationActive={false} type="monotone" dataKey={seriesView.key} name={seriesView.name} stroke="var(--series-1)" strokeWidth={2} fill="url(#statFill)" activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </Card>

              <Card title="Revenue generation" subtitle="Last 6 months · revenue vs salary expenses">
                {!data ? <Skeleton className="h-60" /> : !(hasValue(data.monthly, "revenue") || hasValue(data.monthly, "expenses")) ? <EmptyState /> : (
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthly} margin={{ left: 0, right: 8, top: 4 }} barGap={4}>
                        <CartesianGrid vertical={false} stroke="var(--grid)" />
                        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} tickFormatter={abbr} />
                        <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
                        <Tooltip cursor={{ fill: "var(--hover-overlay)" }} content={<ChartTip lines={(p) => [...p.map((x) => ({ name: x.name, value: money(x.value), color: x.fill })), { name: "Net", value: money(p[0].payload.revenue - p[0].payload.expenses), color: "var(--text-muted)" }]} />} />
                        <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                        <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card title="Top services" subtitle={rangeLabel} actions={<Tabs label="Service metric" value={svcMetric} onChange={setSvcMetric} tabs={[["revenue", "Revenue"], ["orders", "Orders"]]} />}>
              {!data ? <Skeleton className="h-64" /> : data.byService.length === 0 ? <EmptyState /> :
                <HBar data={data.byService.map((s) => ({ name: s.name, value: svcMetric === "revenue" ? s.value : s.count }))} fmt={svcMetric === "revenue" ? money : (v) => `${v} orders`} />}
            </Card>
            <Card title="Payment methods" subtitle={rangeLabel}>
              {!data ? <Skeleton className="h-48" /> : !hasValue(data.byPayment) ? <EmptyState /> : <PaymentDonut data={data.byPayment} />}
            </Card>
            <Card title="Busiest days" subtitle={busiest?.value ? `${busiest.name} is your busiest day` : rangeLabel}>
              {!data ? <Skeleton className="h-52" /> : !hasValue(data.byWeekday) ? <EmptyState /> : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byWeekday} margin={{ left: 0, right: 8, top: 4 }}>
                      <CartesianGrid vertical={false} stroke="var(--grid)" />
                      <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                      <YAxis tick={AXIS} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "var(--hover-overlay)" }} content={<ChartTip fmt={(v) => `${v} appointments`} />} />
                      <Bar isAnimationActive={false} dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                        {data.byWeekday.map((d) => <Cell key={d.name} fill="var(--series-1)" fillOpacity={d.name === busiest?.name ? 1 : 0.45} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
            <Card title="Revenue by stylist" subtitle={rangeLabel}>
              {!data ? <Skeleton className="h-64" /> : data.byStaff.length === 0 ? <EmptyState /> : <HBar data={data.byStaff} fmt={money} color="var(--series-3)" />}
            </Card>
          </div>
        </div>

        <Upcoming date={date} setDate={setDate} bookings={dayRows} pending={t?.pendingRequests || 0} now={now} onOpen={openBooking} />
      </div>
    </div>
  );
}
