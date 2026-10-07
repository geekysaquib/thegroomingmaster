import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtDateTime, fmtTime, money } from "../../lib/format";
import { Badge, Button, ErrorNote, Modal, PageTitle, Panel, Select, statusTone } from "../../components/ui";

const START_H = 9, END_H = 21, ROW = 56; // px per hour
const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);

function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; } // Monday
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a.toDateString() === b.toDateString();

const chip = { booked: "border-accent bg-primary-100 text-ink-primary", completed: "border-success bg-success/15 text-ink-primary", cancelled: "border-border bg-surface-2 text-ink-muted line-through", no_show: "border-warning bg-warning/15 text-ink-primary" };

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [bookings, setBookings] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffFilter, setStaffFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/bookings", { params: { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() } })
      .then((r) => setBookings(r.data)).catch((e) => setError(errMsg(e)));
  }, [weekStart]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/staff").then((r) => setStaff(r.data)).catch(() => {}); }, []);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visible = bookings.filter((b) => !staffFilter || b.staff_id === staffFilter);

  const update = async (patch) => {
    try { const { data } = await api.patch(`/bookings/${selected.id}`, patch); setSelected(data); load(); } catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <PageTitle title="Booking calendar"
        subtitle={`${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
        actions={<>
          <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="Filter by stylist" className="!w-auto">
            <option value="">All stylists</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft size={16} /></Button>
          <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
          <Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week"><ChevronRight size={16} /></Button>
          <Button onClick={() => navigate("/staff/new-booking")}><Plus size={14} /> New booking</Button>
        </>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-surface-2 text-center text-xs">
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className={`py-2 font-medium ${sameDay(d, new Date()) ? "text-ink-primary font-bold" : "text-ink-secondary"}`}>
                {d.toLocaleDateString("en-IN", { weekday: "short" })} <span className="text-ink-primary">{d.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: hours.length * ROW }}>
            <div>{hours.map((h) => <div key={h} style={{ height: ROW }} className="pr-2 text-right text-[11px] text-ink-muted">{h}:00</div>)}</div>
            {days.map((d) => (
              <div key={d.toISOString()} className="relative border-l border-border">
                {hours.map((h) => <div key={h} style={{ height: ROW }} className="border-b border-border/60" />)}
                {visible.filter((b) => sameDay(new Date(b.start_at), d)).map((b) => {
                  const s = new Date(b.start_at), e = new Date(b.end_at);
                  const top = ((s.getHours() + s.getMinutes() / 60) - START_H) * ROW;
                  const h = Math.max(((e - s) / 3600000) * ROW, 22);
                  return (
                    <button key={b.id} onClick={() => setSelected(b)} style={{ top, height: h }} title={`${b.customer.name} - ${b.service.name}`}
                      className={`absolute inset-x-0.5 overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight ${chip[b.status]}`}>
                      <div className="truncate font-semibold">{fmtTime(b.start_at)} {b.customer.name}</div>
                      <div className="truncate text-ink-secondary">{b.service.name}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {selected && (
        <Modal title="Booking details" onClose={() => setSelected(null)}>
          <dl className="space-y-2 text-sm">
            {[["Customer", `${selected.customer.name}${selected.customer.phone ? ` · ${selected.customer.phone}` : ""}`], ["Service", `${selected.service.name} · ${money(selected.service.price)}`],
              ["When", fmtDateTime(selected.start_at)], ["Stylist", selected.staff?.name || "Unassigned"], ["Notes", selected.notes || "-"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-ink-muted">{k}</dt><dd className="text-right text-ink-primary">{v}</dd></div>
            ))}
            <div className="flex justify-between"><dt className="text-ink-muted">Status</dt><dd><Badge tone={statusTone[selected.status]}>{selected.status.replace("_", " ")}</Badge></dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {selected.status === "booked" && <>
              <Button size="sm" variant="secondary" onClick={() => update({ status: "no_show" })}>No-show</Button>
              <Button size="sm" variant="secondary" onClick={() => update({ status: "cancelled" })}>Cancel booking</Button>
              {user.role === "admin"
                ? <Button size="sm" onClick={() => navigate(`/staff/billing?booking=${selected.id}`)}>Complete &amp; bill</Button>
                : <Button size="sm" onClick={() => update({ status: "completed" })}>Mark completed</Button>}
            </>}
          </div>
        </Modal>
      )}
    </>
  );
}
