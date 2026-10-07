import { useState } from "react";
import { api, errMsg } from "../lib/api";
import { Button, ErrorNote, Field, Input, Modal, Select } from "./ui";

export default function AddCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", gender: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const { data } = await api.post("/customers", { ...form, gender: form.gender || null });
      onCreated(data); onClose();
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <Modal title="Add customer" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name"><Input required autoFocus value={form.name} onChange={set("name")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input type="tel" value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={set("gender")}><option value="">-</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select>
          </Field>
        </div>
        <Field label="Email" hint="Needed to email e-bills"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add customer"}</Button>
        </div>
      </form>
    </Modal>
  );
}
