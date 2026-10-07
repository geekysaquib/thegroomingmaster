import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { fmtDateTime, fmtTime, money, toLocalInput } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import Avatar from "../../components/Avatar";
import { Button, DataTable, EmptyState, ErrorNote, Field, Input, Modal, Select } from "../../components/ui";

// Booking calendar: weekly / daily / monthly views, status-coloured cards, mini calendar and a
// "New booking" request panel (online requests wait here until the salon accepts them).

const STATUS = { pending: "Pending", booked: "Confirmed", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };
const START_H = 9, END_H = 21, ROW = 64; // visible hours and px per hour
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
const WEEKDAYS_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const hourLabel = (h) => `${String(h % 12 || 12).padStart(2, "0")}:00 ${h < 12 ? "AM" : "PM"}`;
const gmtLabel = () => { const o = -new Date().getTimezoneOffset(); const a = Math.abs(o); return `GMT${o < 0 ? "-" : "+"}${Math.floor(a / 60)}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`; };

const tint = (status) => ({ background: `var(--ev-${status}-bg)` });
const solid = (status) => ({ background: `var(--ev-${status}-pill)` });

export function StatusPill({ status, className = "" }) {
  return <span style={solid(status)} className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold leading-tight text-white ${className}`}>{STATUS[status]}</span>;
}

/** Side-by-side layout for overlapping bookings within one day. */
export function layoutDay(items) {
  const sorted = items.map((b) => ({ b, s: +new Date(b.start_at), e: +new Date(b.end_at) })).sort((x, y) => x.s - y.s);
  const out = [];
  let cluster = [], clusterEnd = -Infinity;
  const flush = () => {
    const cols = [];
    for (const ev of cluster) {
      let c = cols.findIndex((end) => end <= ev.s);
      if (c === -1) { c = cols.length; cols.push(ev.e); } else cols[c] = ev.e;
      ev.col = c;
    }
    cluster.forEach((ev) => out.push({ ...ev, n: cols.length }));
    cluster = []; clusterEnd = -Infinity;
  };
  for (const ev of sorted) {
    if (cluster.length && ev.s >= clusterEnd) flush();
    cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.e);
  }
  flush();
  return out;
}

function EventCard({ ev, onOpen }) {
  const { b, s, e, col, n } = ev;
  const start = new Date(s), end = new Date(e);
  const top = (start.getHours() + start.getMinutes() / 60 - START_H) * ROW;
  const height = Math.max(((end - start) / 3600000) * ROW - 3, 34);
  return (
    <button onClick={() => onOpen(b)} title={`${b.customer.name} - ${b.service.name}`}
      style={{ ...tint(b.status), top, height, left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
      className={`absolute overflow-hidden rounded-xl p-2 text-left text-[11px] leading-tight text-ink-primary shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted ${b.status === "cancelled" ? "opacity-70" : ""}`}>
      <div className={`truncate font-semibold ${b.status === "cancelled" ? "line-through" : ""}`}>Client: {b.customer.name}</div>
      <div className="mt-0.5 truncate text-ink-secondary">{b.service.name}</div>
      {height > 56 && <StatusPill status={b.status} className="mt-1.5" />}
      {height > 88 && (
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
          {b.staff ? <Avatar user={b.staff} size={20} className="ring-2 ring-white/70" /> : <span className="text-[10px] text-ink-muted">Any stylist</span>}
          <span className="rounded-md bg-surface-1/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink-primary">{money(b.service.price)}</span>
        </div>
      )}
    </button>
  );
}

function TimeGrid({ days, bookings, now, onOpen, onPickDay, selected }) {
  const cols = `64px repeat(${days.length}, minmax(0, 1fr))`;
  const nowTop = (now.getHours() + now.getMinutes() / 60 - START_H) * ROW;
  const nowVisible = nowTop >= 0 && nowTop <= HOURS.length * ROW;
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 780 : 360 }}>
        <div className="grid border-b border-border" style={{ gridTemplateColumns: cols }}>
          <div className="flex items-center justify-center p-2"><span className="rounded-md bg-surface-2 px-2 py-1 text-[10px] font-medium text-ink-secondary">{gmtLabel()}</span></div>
          {days.map((d) => {
            const today = sameDay(d, now), sel = sameDay(d, selected);
            return (
              <button key={d.toISOString()} onClick={() => onPickDay(d)} aria-label={`Open ${d.toDateString()}`}
                className={`relative py-2.5 text-center hover:bg-surface-2 ${sel ? "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-accent" : ""}`}>
                <span className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${today ? "bg-accent text-accent-foreground" : "text-ink-primary"}`}>{d.getDate()}</span>
                <span className="text-[11px] text-ink-muted">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              </button>
            );
          })}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: cols, height: HOURS.length * ROW }}>
          <div>{HOURS.map((h) => <div key={h} style={{ height: ROW }} className="pr-3 text-right text-[11px] text-ink-muted">{hourLabel(h)}</div>)}</div>
          {days.map((d) => (
            <div key={d.toISOString()} className="relative border-l border-border">
              {HOURS.map((h) => <div key={h} style={{ height: ROW }} className="border-b border-border/60" />)}
              {layoutDay(bookings.filter((b) => sameDay(new Date(b.start_at), d))).map((ev) => <EventCard key={ev.b.id} ev={ev} onOpen={onOpen} />)}
              {sameDay(d, now) && nowVisible && (
                <div style={{ top: nowTop }} className="pointer-events-none absolute inset-x-0 z-10 flex items-center" aria-label="Current time">
                  <span className="-ml-1.5 h-3 w-3 rounded-full border-2 border-surface-1 bg-link" /><span className="h-px flex-1 bg-link" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ date, bookings, now, onPickDay }) {
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d) => {
            const items = bookings.filter((b) => sameDay(new Date(b.start_at), d) && b.status !== "cancelled");
            const inMonth = d.getMonth() === first.getMonth();
            return (
              <button key={d.toISOString()} onClick={() => onPickDay(d)} className={`min-h-[104px] border-b border-r border-border p-1.5 text-left align-top hover:bg-surface-2 ${inMonth ? "" : "bg-surface-2/50"}`}>
                <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${sameDay(d, now) ? "bg-accent text-accent-foreground" : inMonth ? "text-ink-primary" : "text-ink-muted"}`}>{d.getDate()}</span>
                <div className="space-y-0.5">
                  {items.slice(0, 3).map((b) => (
                    <div key={b.id} style={tint(b.status)} className="truncate rounded px-1.5 py-0.5 text-[10px] text-ink-primary">{fmtTime(b.start_at)} {b.customer.name}</div>
                  ))}
                  {items.length > 3 && <div className="px-1 text-[10px] font-medium text-ink-muted">+{items.length - 3} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ date, onPick, now }) {
  const [month, setMonth] = useState(startOfMonth(date));
  useEffect(() => setMonth(startOfMonth(date)), [date]);
  const lead = month.getDay(); // Sunday-first grid
  const cells = Array.from({ length: 42 }, (_, i) => addDays(month, i - lead));
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-surface-3"><ChevronLeft size={15} /></button>
        <div className="text-sm font-semibold text-ink-primary">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</div>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-surface-3"><ChevronRight size={15} /></button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS_SUN.map((d) => <div key={d} className="pb-1 text-[11px] text-ink-muted">{d}</div>)}
        {cells.map((d) => {
          const out = d.getMonth() !== month.getMonth(), sel = sameDay(d, date), today = sameDay(d, now);
          return (
            <button key={d.toISOString()} onClick={() => onPick(d)} aria-label={d.toDateString()} aria-pressed={sel}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${sel ? "bg-ink-primary font-semibold text-surface-1" : today ? "border-2 border-accent font-semibold text-ink-primary" : out ? "text-ink-muted/50 hover:bg-surface-3" : "text-ink-primary hover:bg-surface-3"}`}>{d.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}

function NewBookings({ rows, sort, setSort, onAccept, onReject, onReschedule, onAll }) {
  const sorted = [...rows].sort((a, b) => (sort === "newest" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));
  return (
    <div className="rounded-2xl border border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink-primary">New booking {rows.length > 0 && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">{rows.length}</span>}</h2>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort new bookings" className="rounded-lg border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary"><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
      </div>
      <div className="max-h-[560px] space-y-3 overflow-y-auto p-3">
        {sorted.length === 0 && <EmptyState hint="Online booking requests will appear here." />}
        {sorted.slice(0, 5).map((b) => (
          <div key={b.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-link"><CalendarDays size={14} />{fmtDateTime(b.start_at)}</span>
              <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">New booking</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Avatar user={b.customer} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink-primary">{b.customer.name}</div>
                <div className="truncate text-xs text-ink-muted">{b.customer.phone || "No phone"}</div>
              </div>
              <div className="text-right"><div className="text-[11px] text-ink-muted">Price</div><div className="text-sm font-semibold text-ink-primary">{money(b.service.price)}</div></div>
            </div>
            <div className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs"><span className="text-ink-muted">Service </span><span className="font-medium text-ink-primary">{b.service.name}</span> <span className="text-ink-muted">· {b.service.duration_min} min</span></div>
            {b.notes && <p className="mt-2 truncate text-xs text-ink-muted" title={b.notes}>“{b.notes}”</p>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" onClick={() => onReschedule(b)}>New time</Button>
              <Button size="sm" variant="secondary" onClick={() => onReject(b)}>Reject</Button>
              <Button size="sm" onClick={() => onAccept(b)}>Accept <Check size={13} /></Button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3"><button onClick={onAll} className="w-full rounded-full border border-border py-2 text-[13px] font-medium text-ink-primary hover:bg-surface-3">All new bookings</button></div>
    </div>
  );
}

function RescheduleModal({ booking, staff, onClose, onSaved }) {
  const [start, setStart] = useState(toLocalInput(new Date(booking.start_at)));
  const [stylist, setStylist] = useState(booking.staff_id || "");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    try {
      const { data } = await api.patch(`/bookings/${booking.id}`, { start_at: new Date(start).toISOString(), staff_id: stylist || null, status: booking.status === "pending" ? "booked" : booking.status });
      onSaved(data);
    } catch (err) { setError(errMsg(err)); }
  };
  return (
    <Modal title={booking.status === "pending" ? "Set a new time and accept" : "Reschedule booking"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <p className="text-sm text-ink-secondary">{booking.customer.name} · {booking.service.name}</p>
        <Field label="Date & time"><Input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Stylist"><Select value={stylist} onChange={(e) => setStylist(e.target.value)}><option value="">Any available</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{booking.status === "pending" ? "Save & accept" : "Save"}</Button></div>
      </form>
    </Modal>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [view, setView] = useState("weekly"); // daily | weekly | monthly
  const [mode, setMode] = useState("calendar"); // calendar | list
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState([]);
  const [pending, setPending] = useState([]);
  const [staff, setStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const range = useMemo(() => {
    if (view === "daily") return [startOfDay(date), addDays(startOfDay(date), 1)];
    if (view === "weekly") return [startOfWeek(date), addDays(startOfWeek(date), 7)];
    const s = startOfWeek(startOfMonth(date)); return [s, addDays(s, 42)];
  }, [view, date]);

  const load = useCallback(() => {
    api.get("/bookings", { params: { from: range[0].toISOString(), to: range[1].toISOString() } }).then((r) => setBookings(r.data)).catch((e) => setError(errMsg(e)));
    api.get("/bookings", { params: { status: "pending" } }).then((r) => setPending(r.data)).catch(() => {});
  }, [range]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/staff").then((r) => setStaff(r.data)).catch(() => {}); }, []);

  const visible = bookings.filter((b) => !statusFilter || b.status === statusFilter);
  const days = view === "daily" ? [startOfDay(date)] : Array.from({ length: 7 }, (_, i) => addDays(range[0], i));

  const step = (dir) => setDate((d) => (view === "daily" ? addDays(d, dir) : view === "weekly" ? addDays(d, 7 * dir) : new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  const openDay = (d) => { setDate(startOfDay(d)); setView("daily"); };

  const patch = async (b, body, done) => {
    setError("");
    try { const { data } = await api.patch(`/bookings/${b.id}`, body); load(); if (done) done(data); } catch (e) { setError(errMsg(e)); }
  };
  const accept = (b) => patch(b, { status: "booked" });
  const reject = (b) => { if (window.confirm(`Reject the request from ${b.customer.name}?`)) patch(b, { status: "cancelled" }); };

  const listRows = statusFilter === "pending" && mode === "list" ? pending : visible;
  const label = view === "daily" ? date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const seg = (active) => `rounded-lg px-3 py-1.5 text-[13px] font-medium ${active ? "bg-surface-1 text-ink-primary shadow-sm" : "text-ink-secondary hover:text-ink-primary"}`;
  const modeBtn = (active) => `flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium ${active ? "bg-ink-primary text-surface-1" : "text-ink-secondary"}`;

  return (
    <>
      <ErrorNote>{error}</ErrorNote>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-1">
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-ink-primary">Booking calendar</h2>
                <div className="flex items-center gap-1 text-sm text-ink-secondary">
                  <button onClick={() => step(-1)} aria-label="Previous" className="rounded p-1 hover:bg-surface-3"><ChevronLeft size={16} /></button>
                  <span className="min-w-[110px] text-center font-medium text-ink-primary">{label}</span>
                  <button onClick={() => step(1)} aria-label="Next" className="rounded p-1 hover:bg-surface-3"><ChevronRight size={16} /></button>
                  <button onClick={() => setDate(startOfDay(new Date()))} className="ml-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-3">Today</button>
                </div>
              </div>
              <div className="flex rounded-xl border border-border p-0.5 text-[13px]">
                <button onClick={() => setMode("list")} aria-pressed={mode === "list"} className={modeBtn(mode === "list")}><List size={14} /> List mode</button>
                <button onClick={() => setMode("calendar")} aria-pressed={mode === "calendar"} className={modeBtn(mode === "calendar")}><CalendarDays size={14} /> Calendar mode</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-xl bg-surface-2 p-0.5" role="group" aria-label="Calendar view">
                {[["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([k, l]) => <button key={k} onClick={() => { setView(k); setMode("calendar"); }} aria-pressed={view === k} className={seg(view === k)}>{l}</button>)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <span style={statusFilter ? solid(statusFilter) : { background: "var(--text-muted)" }} className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-sm" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" className="rounded-xl border border-border bg-surface-1 py-2 pl-8 pr-3 text-[13px] text-ink-primary">
                    <option value="">All statuses</option>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <Button onClick={() => navigate("/salon/new-booking")} className="rounded-xl"><Plus size={14} /> Add Booking</Button>
              </div>
            </div>
          </div>

          {mode === "list" ? (
            <DataTable rows={listRows} onRowClick={setSelected} columns={[
              { key: "when", header: "When", render: (b) => fmtDateTime(b.start_at) },
              { key: "client", header: "Client", render: (b) => <span className="font-medium">{b.customer.name}</span> },
              { key: "service", header: "Service", render: (b) => b.service.name },
              { key: "stylist", header: "Stylist", render: (b) => b.staff?.name || "Unassigned" },
              { key: "price", header: "Price", render: (b) => money(b.service.price) },
              { key: "status", header: "Status", render: (b) => <StatusPill status={b.status} /> },
            ]} />
          ) : view === "monthly" ? (
            <MonthGrid date={date} bookings={visible} now={now} onPickDay={openDay} />
          ) : (
            <TimeGrid days={days} bookings={visible} now={now} onOpen={setSelected} onPickDay={openDay} selected={date} />
          )}
          {mode === "calendar" && visible.length === 0 && <div className="border-t border-border"><EmptyState hint="No bookings in this period." /></div>}
        </section>

        <aside className="space-y-4">
          <MiniCalendar date={date} now={now} onPick={(d) => { setDate(startOfDay(d)); setMode("calendar"); }} />
          <NewBookings rows={pending} sort={sort} setSort={setSort} onAccept={accept} onReject={reject} onReschedule={setRescheduling}
            onAll={() => { setStatusFilter("pending"); setMode("list"); }} />
        </aside>
      </div>

      {selected && (
        <Modal title="Booking details" onClose={() => setSelected(null)}>
          <dl className="space-y-2 text-sm">
            {[["Client", `${selected.customer.name}${selected.customer.phone ? ` · ${selected.customer.phone}` : ""}`], ["Service", `${selected.service.name} · ${money(selected.service.price)}`],
              ["When", fmtDateTime(selected.start_at)], ["Stylist", selected.staff?.name || "Unassigned"], ["Notes", selected.notes || "-"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-ink-muted">{k}</dt><dd className="text-right text-ink-primary">{v}</dd></div>
            ))}
            <div className="flex justify-between"><dt className="text-ink-muted">Status</dt><dd><StatusPill status={selected.status} /></dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {(selected.status === "pending" || selected.status === "booked") && <>
              <Button size="sm" variant="secondary" onClick={() => { setRescheduling(selected); setSelected(null); }}>{selected.status === "pending" ? "New time" : "Reschedule"}</Button>
              <Button size="sm" variant="secondary" onClick={() => patch(selected, { status: "cancelled" }, setSelected)}>{selected.status === "pending" ? "Reject" : "Cancel booking"}</Button>
            </>}
            {selected.status === "pending" && <Button size="sm" onClick={() => patch(selected, { status: "booked" }, setSelected)}>Accept <Check size={13} /></Button>}
            {selected.status === "booked" && <>
              <Button size="sm" variant="secondary" onClick={() => patch(selected, { status: "no_show" }, setSelected)}>No-show</Button>
              {user.role === "admin"
                ? <Button size="sm" onClick={() => navigate(`/salon/billing?booking=${selected.id}`)}>Complete &amp; bill</Button>
                : <Button size="sm" onClick={() => patch(selected, { status: "completed" }, setSelected)}>Mark completed</Button>}
            </>}
          </div>
        </Modal>
      )}
      {rescheduling && <RescheduleModal booking={rescheduling} staff={staff} onClose={() => setRescheduling(null)} onSaved={() => { setRescheduling(null); load(); }} />}
    </>
  );
}
