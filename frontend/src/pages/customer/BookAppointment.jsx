import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, X } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { DEFAULT_HOURS, dayHours, salonTodayStr as todayStr, slotsFor } from "../../lib/slots";
import WelcomeBanner from "../../components/WelcomeBanner";
import { SECTIONS, categoryLabel, money, priceLabel } from "../../lib/format";
import { Button, ErrorNote, Field, Input, PageTitle, Panel, Spinner, Textarea } from "../../components/ui";

export default function BookAppointment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // services chosen, in the order they will be done
  const toggle = (sv) => setSelected((cur) => (cur.some((x) => x.id === sv.id) ? cur.filter((x) => x.id !== sv.id) : [...cur, sv]));
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { api.get("/settings/hours").then((r) => setHours(r.data)).catch(() => {}); }, []);
  useEffect(() => { api.get("/services").then((r) => setServices(r.data)).catch((e) => setError(errMsg(e))); }, []);

  const totalMin = selected.reduce((t, x) => t + x.duration_min, 0);
  const totalPrice = selected.reduce((t, x) => t + Number(x.price), 0);
  const fromPrice = selected.some((x) => x.price_type === "onwards");
  const totalLabel = `${money(totalPrice)}${fromPrice ? " onwards" : ""}`;
  const slots = useMemo(() => slotsFor(date, totalMin || 30, hours), [date, totalMin, hours]);
  useEffect(() => setSlot(null), [date, totalMin]);

  const confirm = async () => {
    setError(""); setBusy(true);
    try {
      const { data } = await api.post("/bookings", { service_ids: selected.map((x) => x.id), start_at: slot.toISOString(), notes });
      setDone(data);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Panel className="mx-auto max-w-md" bodyClassName="p-8 text-center">
        <CheckCircle2 className="mx-auto text-success" size={40} />
        <h2 className="mt-3 text-lg font-semibold text-ink-primary">{done.status === "pending" ? "Request sent!" : "You're booked in!"}</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {done.service.name} on {new Date(done.start_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: hours.timezone })}
        </p>
        {done.status === "pending" && <p className="mt-2 text-xs text-ink-muted">The salon will confirm your appointment shortly. You can track it in My Bookings.</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => { setDone(null); setSelected([]); setNotes(""); }}>Book another</Button>
          <Button onClick={() => navigate("/app/bookings")}>View my bookings</Button>
        </div>
      </Panel>
    );
  }

  if (!services) return <Spinner />;
  const q = search.trim().toLowerCase();
  const list = services.filter((s) => (filter === "all" || s.section === filter) && (!q || `${s.name} ${s.section} ${s.description || ""}`.toLowerCase().includes(q)));

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-[560px]">
      <WelcomeBanner user={user} message="Choose your services, pick a time and we'll take care of the rest." />
      <div className="h-4" />
      <PageTitle title="Book an appointment" subtitle="1. Choose one or more services  ·  2. Pick a day and time  ·  3. Confirm" />
      <div className="grid grid-cols-1 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col lg:col-span-3">
          <Panel fill bodyClassName="flex min-h-0 flex-1 flex-col p-4" title="Choose services" actions={
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter services" className="rounded border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary">
              <option value="all">All services</option>{SECTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>}>
            <Input className="mb-3" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search services" />
            {list.length === 0 && <p className="text-sm text-ink-muted">No services match your search.</p>}
            <div className="grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto sm:grid-cols-2">
              {list.map((s) => (
                <button key={s.id} onClick={() => toggle(s)} aria-pressed={selected.some((x) => x.id === s.id)}
                  className={`relative rounded-md border p-3 text-left transition-colors ${selected.some((x) => x.id === s.id) ? "border-accent bg-primary-100" : "border-border hover:bg-surface-3"}`}>
                  {selected.some((x) => x.id === s.id) && <CheckCircle2 size={16} className="absolute right-2 top-2 text-success" />}
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-link">{s.section} · {categoryLabel[s.category]}</div>
                  <div className="font-medium text-ink-primary">{s.name}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-ink-secondary">
                    <span className="flex items-center gap-1"><Clock size={12} />{s.duration_min} min</span>
                    <span className="text-sm font-semibold text-ink-primary">{priceLabel(s)}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col lg:col-span-2">
          <Panel fill bodyClassName="min-h-0 flex-1 overflow-y-auto p-4" title="Date & time">
            {!selected.length ? <p className="text-sm text-ink-muted">Select one or more services to see available times.</p> : (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-surface-2 p-2.5 text-xs">
                  <ul className="space-y-1">
                    {selected.map((x) => (
                      <li key={x.id} className="flex items-center justify-between gap-2 text-ink-primary">
                        <span className="min-w-0 truncate">{x.name} <span className="text-ink-muted">· {x.duration_min} min</span></span>
                        <span className="flex shrink-0 items-center gap-1.5">{priceLabel(x)}<button aria-label={`Remove ${x.name}`} onClick={() => toggle(x)} className="text-ink-muted hover:text-danger"><X size={13} /></button></span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-ink-primary"><span>{selected.length} service{selected.length === 1 ? "" : "s"} · {totalMin} min</span><span>{totalLabel}</span></div>
                </div>
                <Field label="Date"><input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink-primary" /></Field>
                <div>
                  <span className="mb-1 block text-xs font-medium text-ink-secondary">Available times</span>
                  {slots.length === 0 ? <p className="text-sm text-ink-muted">{dayHours(date, hours).closed ? "We're closed on this day - try another date." : "No more slots this day - try another date."}</p> : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {slots.map((s) => (
                        <button key={s.toISOString()} onClick={() => setSlot(s)} aria-pressed={slot?.getTime() === s.getTime()}
                          className={`rounded border px-2 py-1.5 text-xs font-medium ${slot?.getTime() === s.getTime() ? "border-accent bg-accent text-accent-foreground" : "border-border text-ink-secondary hover:bg-surface-3"}`}>
                          {s.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: hours.timezone })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" /></Field>
                <ErrorNote>{error}</ErrorNote>
                <Button className="w-full" disabled={!slot || busy} onClick={confirm}>{busy ? "Booking…" : `Confirm · ${totalLabel}`}</Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
