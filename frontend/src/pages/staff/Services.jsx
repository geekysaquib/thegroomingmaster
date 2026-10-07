import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { SECTIONS, categoryLabel, priceLabel } from "../../lib/format";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageTitle, Panel, Select, Textarea } from "../../components/ui";

const EMPTY = { name: "", section: "Hair Care", category: "unisex", description: "", price: "", price_type: "fixed", duration_min: 30, sort_order: 999, active: true };

export default function Services() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null); // service object or EMPTY (new)
  const [error, setError] = useState("");

  const load = () => api.get("/services", { params: { all: 1 } }).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? If it has bookings or invoices it will be archived instead.`)) return;
    try { const { data } = await api.delete(`/services/${s.id}`); if (data.archived) setError(`"${s.name}" has history, so it was archived (hidden from customers).`); load(); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <>
      <PageTitle title="Services" subtitle="What customers can book" actions={<Button onClick={() => setEditing(EMPTY)}><Plus size={14} /> Add service</Button>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="">
        <DataTable rows={rows} columns={[
          { key: "name", header: "Service", render: (s) => <span className="font-medium">{s.name}</span> },
          { key: "section", header: "Section" },
          { key: "category", header: "For", render: (s) => categoryLabel[s.category] },
          { key: "duration_min", header: "Duration", render: (s) => `${s.duration_min} min` },
          { key: "price", header: "Price", render: (s) => priceLabel(s) },
          { key: "active", header: "Status", render: (s) => <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Archived"}</Badge> },
          { key: "act", header: "", className: "text-right", render: (s) => (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil size={14} /></Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => remove(s)}><Trash2 size={14} /></Button>
            </div>) },
        ]} />
      </Panel>
      {editing && <ServiceModal service={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function ServiceModal({ service, onClose, onSaved }) {
  const [form, setForm] = useState(service);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError("");
    const body = { name: form.name, section: form.section, category: form.category, description: form.description, price: Number(form.price), price_type: form.price_type, duration_min: Number(form.duration_min), sort_order: Number(form.sort_order), active: form.active };
    try {
      if (form.id) await api.put(`/services/${form.id}`, body);
      else await api.post("/services", body);
      onSaved();
    }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <Modal title={form.id ? "Edit service" : "Add service"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Name"><Input required value={form.name} onChange={set("name")} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description || ""} onChange={set("description")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section"><Select value={form.section} onChange={set("section")}>{SECTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</Select></Field>
          <Field label="Price type"><Select value={form.price_type} onChange={set("price_type")}><option value="fixed">Fixed price</option><option value="onwards">Starting from (onwards)</option></Select></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="For"><Select value={form.category} onChange={set("category")}>{Object.entries(categoryLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Price (₹)"><Input type="number" min="0" step="1" required value={form.price} onChange={set("price")} /></Field>
          <Field label="Minutes"><Input type="number" min="5" step="5" required value={form.duration_min} onChange={set("duration_min")} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible to customers</label>
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}
