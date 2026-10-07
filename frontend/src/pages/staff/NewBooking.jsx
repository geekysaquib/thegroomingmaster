import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { money, toLocalInput } from "../../lib/format";
import AddCustomerModal from "../../components/AddCustomerModal";
import { Button, ErrorNote, Field, Input, PageTitle, Panel, Select, Textarea } from "../../components/ui";

function roundedNow() { const d = new Date(); d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0); return d; }

export default function NewBooking() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ customer_id: "", service_id: "", staff_id: "", start: toLocalInput(roundedNow()), notes: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    Promise.all([api.get("/customers"), api.get("/services"), api.get("/staff")])
      .then(([c, s, st]) => { setCustomers(c.data); setServices(s.data); setStaff(st.data); })
      .catch((e) => setError(errMsg(e)));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await api.post("/bookings", { customer_id: form.customer_id, service_id: form.service_id, staff_id: form.staff_id || null, start_at: new Date(form.start).toISOString(), notes: form.notes });
      navigate("/staff/calendar");
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <>
      <PageTitle title="New booking" subtitle="Book an appointment on behalf of a customer." />
      <Panel className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          <Field label="Customer">
            <div className="flex gap-2">
              <Select required value={form.customer_id} onChange={set("customer_id")}>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </Select>
              <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="shrink-0"><UserPlus size={14} /> New</Button>
            </div>
          </Field>
          <Field label="Service">
            <Select required value={form.service_id} onChange={set("service_id")}>
              <option value="">Select service…</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration_min} min · {money(s.price)}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date & time"><Input type="datetime-local" required value={form.start} onChange={set("start")} /></Field>
            <Field label="Stylist (optional)">
              <Select value={form.staff_id} onChange={set("staff_id")}><option value="">Any available</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
            </Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Booking…" : "Create booking"}</Button>
          </div>
        </form>
      </Panel>
      {adding && <AddCustomerModal onClose={() => setAdding(false)} onCreated={(c) => { setCustomers((l) => [c, ...l]); setForm((f) => ({ ...f, customer_id: c.id })); }} />}
    </>
  );
}
