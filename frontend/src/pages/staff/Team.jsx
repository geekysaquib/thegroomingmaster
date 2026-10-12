import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { money } from "../../lib/format";
import { FillPage, Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageTitle, Panel, Select } from "../../components/ui";

const EMPTY = { name: "", email: "", phone: "", password: "", role: "staff", shift_start: "10:00", shift_end: "19:00", base_salary: 0, commission_pct: 0, active: true };

export default function Team() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const load = () => api.get("/staff").then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const shown = q ? rows.filter((s) => `${s.name} ${s.email || ""} ${s.phone || ""} ${s.role} ${s.active ? "active" : "inactive"}`.toLowerCase().includes(q)) : rows;

  return (
    <FillPage>
      <PageTitle title="Team" subtitle="Staff accounts, pay and commission" actions={<Button onClick={() => setEditing(EMPTY)}><Plus size={14} /> Add staff</Button>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel fill>
        <div className="shrink-0 border-b border-border p-3"><Input placeholder="Search name, email, phone or role…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search team" /></div>
        <DataTable rows={shown} empty="No team members found." columns={[
          { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
          { key: "email", header: "Email" },
          { key: "role", header: "Role", render: (s) => <span className="capitalize">{s.role}</span> },
          { key: "shift", header: "Shift", render: (s) => s.shift_start && s.shift_end ? `${s.shift_start} – ${s.shift_end}` : "-" },
          { key: "base_salary", header: "Base salary", render: (s) => money(s.base_salary) },
          { key: "commission_pct", header: "Commission", render: (s) => `${s.commission_pct}%` },
          { key: "active", header: "Status", render: (s) => <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge> },
          { key: "act", header: "", className: "text-right", render: (s) => <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ ...s, password: "" })}><Pencil size={14} /></Button> },
        ]} />
      </Panel>
      {editing && <StaffModal staff={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </FillPage>
  );
}

function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState(staff);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isNew = !form.id;

  const submit = async (e) => {
    e.preventDefault(); setError("");
    const body = { name: form.name, phone: form.phone, role: form.role, shift_start: form.shift_start, shift_end: form.shift_end, base_salary: Number(form.base_salary), commission_pct: Number(form.commission_pct), active: form.active };
    if (form.password) body.password = form.password;
    try {
      if (isNew) await api.post("/staff", { ...body, email: form.email });
      else await api.put(`/staff/${form.id}`, body);
      onSaved();
    }
    catch (err) { setError(errMsg(err)); }
  };

  return (
    <Modal title={isNew ? "Add staff" : "Edit staff"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Name"><Input required value={form.name} onChange={set("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" required disabled={!isNew} value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><Input value={form.phone || ""} onChange={set("phone")} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Role"><Select value={form.role} onChange={set("role")}><option value="staff">Staff</option><option value="admin">Admin</option></Select></Field>
          <Field label="Base salary (₹)"><Input type="number" min="0" value={form.base_salary} onChange={set("base_salary")} /></Field>
          <Field label="Commission %"><Input type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={set("commission_pct")} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Shift starts"><Input type="time" required value={form.shift_start || ""} onChange={set("shift_start")} /></Field>
          <Field label="Shift ends"><Input type="time" required value={form.shift_end || ""} onChange={set("shift_end")} /></Field>
        </div>
        <Field label={isNew ? "Password" : "New password"} hint={isNew ? "" : "Leave blank to keep the current one"}><Input type="password" required={isNew} minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>
        {!isNew && <label className="flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (can sign in)</label>}
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}
