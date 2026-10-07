import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { money } from "../../lib/format";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageTitle, Panel, Select } from "../../components/ui";

const EMPTY = { name: "", email: "", phone: "", password: "", role: "staff", base_salary: 0, commission_pct: 0, active: true };

export default function Team() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/staff").then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  return (
    <>
      <PageTitle title="Team" subtitle="Staff accounts, pay and commission" actions={<Button onClick={() => setEditing(EMPTY)}><Plus size={14} /> Add staff</Button>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="">
        <DataTable rows={rows} columns={[
          { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
          { key: "email", header: "Email" },
          { key: "role", header: "Role", render: (s) => <span className="capitalize">{s.role}</span> },
          { key: "base_salary", header: "Base salary", render: (s) => money(s.base_salary) },
          { key: "commission_pct", header: "Commission", render: (s) => `${s.commission_pct}%` },
          { key: "active", header: "Status", render: (s) => <Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge> },
          { key: "act", header: "", className: "text-right", render: (s) => <Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ ...s, password: "" })}><Pencil size={14} /></Button> },
        ]} />
      </Panel>
      {editing && <StaffModal staff={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function StaffModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState(staff);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isNew = !form.id;

  const submit = async (e) => {
    e.preventDefault(); setError("");
    const body = { name: form.name, phone: form.phone, role: form.role, base_salary: Number(form.base_salary), commission_pct: Number(form.commission_pct), active: form.active };
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
        <Field label={isNew ? "Password" : "New password"} hint={isNew ? "" : "Leave blank to keep the current one"}><Input type="password" required={isNew} minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>
        {!isNew && <label className="flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active (can sign in)</label>}
        <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Modal>
  );
}
