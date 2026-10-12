import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, UserPlus, X } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { SECTIONS, categoryLabel, money, priceLabel } from "../../lib/format";
import { toSalon } from "../../lib/salonTime";
import { DEFAULT_HOURS, dayHours, salonTodayStr, slotsFor, toMins, zoned } from "../../lib/slots";
import AddCustomerModal from "../../components/AddCustomerModal";
import Avatar from "../../components/Avatar";
import { Button, EmptyState, ErrorNote, Field, Input, PageTitle, Panel, SearchSelect, Spinner, Textarea } from "../../components/ui";

const Step = ({ n, children }) => (
  <span className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-btn text-[11px] font-semibold text-btn-foreground">{n}</span>{children}</span>
);
const salonMinutes = (date) => { const l = toSalon(date); return l.getHours() * 60 + l.getMinutes(); };

export default function NewBooking() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [customerId, setCustomerId] = useState("");
  const [selected, setSelected] = useState([]); // services in the order they'll be done
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(salonTodayStr());
  const [slot, setSlot] = useState(null);
  const [customTime, setCustomTime] = useState(""); // "HH:MM" - for a time that isn't on the slot grid
  const [staffId, setStaffId] = useState("");
  const [notes, setNotes] = useState("");
  const [dayBookings, setDayBookings] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/customers"), api.get("/services"), api.get("/staff"), api.get("/settings/hours")])
      .then(([c, s, st, h]) => { setCustomers(c.data.filter((x) => x.active !== false)); setServices(s.data); setStaff(st.data.filter((x) => x.active !== false)); setHours(h.data); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  // That day's bookings, to show which stylists are free for the chosen time.
  useEffect(() => {
    const [y, m, d] = date.split("-").map(Number);
    const from = zoned(y, m, d, 0, hours.timezone);
    api.get("/bookings", { params: { from: from.toISOString(), to: new Date(+from + 86400000).toISOString() } })
      .then((r) => setDayBookings(r.data.filter((b) => b.staff_id && (b.status === "pending" || b.status === "booked")))).catch(() => setDayBookings([]));
  }, [date, hours.timezone]);

  const toggle = (sv) => setSelected((cur) => (cur.some((x) => x.id === sv.id) ? cur.filter((x) => x.id !== sv.id) : [...cur, sv]));
  const totalMin = selected.reduce((t, x) => t + x.duration_min, 0);
  const totalPrice = selected.reduce((t, x) => t + Number(x.price), 0);
  const totalLabel = `${money(totalPrice)}${selected.some((x) => x.price_type === "onwards") ? " onwards" : ""}`;

  const stylist = staff.find((s) => s.id === staffId);
  /** null when `s` can take [start, end); otherwise why not. Mirrors the server's shift + clash rules. */
  const unavailable = (s, start) => {
    const end = new Date(+start + (totalMin || 30) * 60000);
    if (s.shift_start && s.shift_end) {
      const sm = salonMinutes(start);
      if (sm < toMins(s.shift_start) || sm + (totalMin || 30) > toMins(s.shift_end)) return "Off shift";
    }
    if (dayBookings.some((b) => b.staff_id === s.id && +new Date(b.start_at) < +end && +new Date(b.end_at) > +start)) return "Busy";
    return null;
  };

  const slots = useMemo(() => slotsFor(date, totalMin || 30, hours), [date, totalMin, hours]);
  const start = useMemo(() => {
    if (customTime) { const [y, m, d] = date.split("-").map(Number); return zoned(y, m, d, toMins(customTime), hours.timezone); }
    return slot;
  }, [customTime, slot, date, hours.timezone]);
  useEffect(() => { setSlot(null); }, [date, totalMin]);

  const q = search.trim().toLowerCase();
  const list = services.filter((s) => (filter === "all" || s.section === filter) && (!q || `${s.name} ${s.section} ${s.description || ""}`.toLowerCase().includes(q)));
  const customer = customers?.find((c) => c.id === customerId);
  const clash = stylist && start ? unavailable(stylist, start) : null;
  const ready = customerId && selected.length && start && !clash;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await api.post("/bookings", { customer_id: customerId, service_ids: selected.map((x) => x.id), staff_id: staffId || null, start_at: start.toISOString(), notes });
      navigate("/salon/calendar");
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  if (!customers) return <Spinner />;
  const fmtSlot = (d) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: hours.timezone });

  return (
    <>
    <form onSubmit={submit} className="flex min-h-full flex-col lg:h-full lg:min-h-[560px]">
      <PageTitle subtitle="Book an appointment on behalf of a customer. Pick the customer, the services, then a time." />
      <ErrorNote>{error}</ErrorNote>
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:grid-rows-1">
        {/* Left: who + what. The services card takes whatever height is left and scrolls inside. */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:col-span-3">
          <Panel className="shrink-0" title={<Step n="1">Customer</Step>}>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SearchSelect required value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Search customer by name or phone…" searchPlaceholder="Search name or phone…" ariaLabel="Customer" />
              </div>
              <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="shrink-0"><UserPlus size={14} /> New customer</Button>
            </div>
            {customer && (
              <div className="mt-3 flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2">
                <Avatar user={customer} size={32} />
                <div className="min-w-0 text-xs"><div className="truncate text-[13px] font-medium text-ink-primary">{customer.name}</div><div className="truncate text-ink-muted">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}</div></div>
              </div>
            )}
          </Panel>

          <Panel fill bodyClassName="flex min-h-0 flex-1 flex-col p-4" title={<Step n="2">Services</Step>} actions={
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter services" className="rounded border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary">
              <option value="all">All sections</option>{SECTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>}>
            <Input className="mb-3" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search services" />
            {list.length === 0 && <EmptyState title="No services match" />}
            <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((s) => {
                const on = selected.some((x) => x.id === s.id);
                return (
                  <button type="button" key={s.id} onClick={() => toggle(s)} aria-pressed={on}
                    className={`relative h-full rounded-md border p-2.5 text-left transition-colors ${on ? "border-accent bg-primary-100" : "border-border hover:bg-surface-3"}`}>
                    {on && <CheckCircle2 size={15} className="absolute right-2 top-2 text-success" />}
                    <div className="pr-5 text-[10px] font-semibold uppercase tracking-wider text-link">{s.section} · {categoryLabel[s.category]}</div>
                    <div className="mt-0.5 text-[13px] font-medium leading-snug text-ink-primary">{s.name}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-ink-secondary"><span className="flex items-center gap-1"><Clock size={11} />{s.duration_min} min</span><span className="font-semibold text-ink-primary">{priceLabel(s)}</span></div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Right: when + who + confirm */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:col-span-2 lg:overflow-y-auto">
          <Panel className="shrink-0" title={<Step n="3">Date &amp; time</Step>}>
            {selected.length > 0 && (
              <div className="mb-3 rounded-md border border-border bg-surface-2 p-2.5 text-xs">
                <ul className="space-y-1">
                  {selected.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-2 text-ink-primary">
                      <span className="min-w-0 truncate">{x.name} <span className="text-ink-muted">· {x.duration_min} min</span></span>
                      <span className="flex shrink-0 items-center gap-1.5">{priceLabel(x)}<button type="button" aria-label={`Remove ${x.name}`} onClick={() => toggle(x)} className="text-ink-muted hover:text-danger"><X size={13} /></button></span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-ink-primary"><span>{selected.length} service{selected.length === 1 ? "" : "s"} · {totalMin} min</span><span>{totalLabel}</span></div>
              </div>
            )}
            {!selected.length && <p className="mb-3 text-xs text-ink-muted">Choose at least one service to see the times that fit.</p>}
            <Field label="Date"><input type="date" required value={date} onChange={(e) => { setDate(e.target.value); setCustomTime(""); }} className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink-primary" /></Field>
            <div className="mt-3">
              <span className="mb-1 block text-xs font-medium text-ink-secondary">Time</span>
              {slots.length === 0 ? (
                <p className="text-sm text-ink-muted">{dayHours(date, hours).closed ? "The salon is closed on this day." : "No more slots on this day."} You can still set a time below.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {slots.map((s) => {
                    const off = stylist ? unavailable(stylist, s) : null;
                    const on = !customTime && slot && +slot === +s;
                    return (
                      <button type="button" key={+s} disabled={!!off} title={off ? `${stylist.name}: ${off}` : ""} onClick={() => { setSlot(s); setCustomTime(""); }} aria-pressed={on}
                        className={`rounded border px-2 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${on ? "border-accent bg-accent text-accent-foreground" : "border-border text-ink-secondary hover:bg-surface-3"}`}>{fmtSlot(s)}</button>
                    );
                  })}
                </div>
              )}
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-secondary">Other time
                <input type="time" value={customTime} onChange={(e) => { setCustomTime(e.target.value); setSlot(null); }} className="rounded-md border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary" />
                {customTime && <button type="button" onClick={() => setCustomTime("")} className="text-ink-muted hover:text-danger" aria-label="Clear custom time"><X size={12} /></button>}
              </label>
            </div>
          </Panel>

          <Panel className="flex-1" bodyClassName="flex flex-1 flex-col p-4" title={<Step n="4">Stylist &amp; notes</Step>}>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!staffId} onClick={() => setStaffId("")} className={`rounded-full border px-3 py-1 text-xs font-medium ${!staffId ? "border-accent bg-accent text-accent-foreground" : "border-border text-ink-secondary hover:bg-surface-3"}`}>Any available</button>
              {staff.map((s) => {
                const off = start ? unavailable(s, start) : null;
                return (
                  <button type="button" key={s.id} aria-pressed={staffId === s.id} onClick={() => setStaffId(s.id)} title={off || ""}
                    className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-3 text-xs font-medium ${staffId === s.id ? "border-accent bg-accent text-accent-foreground" : "border-border text-ink-secondary hover:bg-surface-3"} ${off && staffId !== s.id ? "opacity-50" : ""}`}>
                    <Avatar user={s} size={22} />{s.name}{off && <span className="text-[10px] text-danger">· {off}</span>}
                  </button>
                );
              })}
            </div>
            {clash && <p className="mt-2 text-xs text-danger">{stylist.name} is {clash === "Busy" ? "already booked" : "not on shift"} at that time. Pick another time or stylist.</p>}
            <div className="mt-3"><Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the stylist should know?" /></Field></div>
            <div className="mt-auto flex gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={busy || !ready}>{busy ? "Booking…" : selected.length ? `Create booking · ${totalLabel}` : "Create booking"}</Button>
            </div>
            {start && <p className="mt-2 text-center text-[11px] text-ink-muted">{start.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: hours.timezone })}{stylist ? ` · ${stylist.name}` : ""}</p>}
          </Panel>
        </div>
      </div>
    </form>
    {/* outside the form: the modal has its own <form> */}
    {adding && <AddCustomerModal onClose={() => setAdding(false)} onCreated={(c) => { setCustomers((l) => [{ ...c, active: true }, ...l]); setCustomerId(c.id); }} />}
    </>
  );
}
