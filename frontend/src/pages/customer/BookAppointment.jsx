import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { SECTIONS, categoryLabel, priceLabel } from "../../lib/format";
import { Button, ErrorNote, Field, PageTitle, Panel, Spinner, Textarea } from "../../components/ui";

const OPEN_HOUR = 10, CLOSE_HOUR = 21; // salon hours: 10:00 - 21:00

export function slotsFor(dateStr, durationMin) {
  if (!dateStr) return [];
  const out = [];
  const [y, m, d] = dateStr.split("-").map(Number);
  for (let mins = OPEN_HOUR * 60; mins + durationMin <= CLOSE_HOUR * 60; mins += 30) {
    const dt = new Date(y, m - 1, d, Math.floor(mins / 60), mins % 60);
    if (dt > new Date()) out.push(dt);
  }
  return out;
}

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function BookAppointment() {
  const navigate = useNavigate();
  const [services, setServices] = useState(null);
  const [filter, setFilter] = useState("all");
  const [service, setService] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { api.get("/services").then((r) => setServices(r.data)).catch((e) => setError(errMsg(e))); }, []);

  const slots = useMemo(() => slotsFor(date, service?.duration_min || 30), [date, service]);
  useEffect(() => setSlot(null), [date, service]);

  const confirm = async () => {
    setError(""); setBusy(true);
    try {
      const { data } = await api.post("/bookings", { service_id: service.id, start_at: slot.toISOString(), notes });
      setDone(data);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Panel className="mx-auto max-w-md" bodyClassName="p-8 text-center">
        <CheckCircle2 className="mx-auto text-success" size={40} />
        <h2 className="mt-3 text-lg font-semibold text-ink-primary">You're booked in!</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          {done.service.name} on {new Date(done.start_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => { setDone(null); setService(null); setNotes(""); }}>Book another</Button>
          <Button onClick={() => navigate("/app/bookings")}>View my bookings</Button>
        </div>
      </Panel>
    );
  }

  if (!services) return <Spinner />;
  const list = services.filter((s) => filter === "all" || s.section === filter);

  return (
    <>
      <PageTitle title="Book an appointment" subtitle="1. Choose a service  ·  2. Pick a day and time  ·  3. Confirm" />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="Choose a service" actions={
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter services" className="rounded border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary">
              <option value="all">All services</option>{SECTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {list.map((s) => (
                <button key={s.id} onClick={() => setService(s)} aria-pressed={service?.id === s.id}
                  className={`rounded-md border p-3 text-left transition-colors ${service?.id === s.id ? "border-accent bg-primary-100" : "border-border hover:bg-surface-3"}`}>
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

        <div className="lg:col-span-2">
          <Panel title="Date & time">
            {!service ? <p className="text-sm text-ink-muted">Select a service to see available times.</p> : (
              <div className="space-y-4">
                <Field label="Date"><input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-ink-primary" /></Field>
                <div>
                  <span className="mb-1 block text-xs font-medium text-ink-secondary">Available times</span>
                  {slots.length === 0 ? <p className="text-sm text-ink-muted">No more slots this day - try another date.</p> : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {slots.map((s) => (
                        <button key={s.toISOString()} onClick={() => setSlot(s)} aria-pressed={slot?.getTime() === s.getTime()}
                          className={`rounded border px-2 py-1.5 text-xs font-medium ${slot?.getTime() === s.getTime() ? "border-accent bg-accent text-accent-foreground" : "border-border text-ink-secondary hover:bg-surface-3"}`}>
                          {s.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" /></Field>
                <ErrorNote>{error}</ErrorNote>
                <Button className="w-full" disabled={!slot || busy} onClick={confirm}>{busy ? "Booking…" : `Confirm · ${priceLabel(service)}`}</Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
