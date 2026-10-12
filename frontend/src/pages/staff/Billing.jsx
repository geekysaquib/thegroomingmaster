import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Mail, MessageCircle, Plus, Printer, Trash2 } from "lucide-react";
import { api, errMsg, openFile } from "../../lib/api";
import { fmtDateTime, money, moneyExact } from "../../lib/format";
import { Receipt, printSheet } from "../../components/Documents";
import { FillPage, Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageTitle, Panel, SearchSelect, Select, Spinner } from "../../components/ui";

export default function Billing() {
  const [params, setParams] = useSearchParams();
  const [invoices, setInvoices] = useState(null);
  const [creating, setCreating] = useState(!!params.get("booking"));
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => api.get("/invoices").then((r) => setInvoices(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const closeCreate = () => { setCreating(false); if (params.get("booking")) setParams({}); };

  if (!invoices) return <Spinner />;
  const q = search.trim().toLowerCase();
  const shown = q ? invoices.filter((i) => `${i.invoice_no} ${i.customer?.name || ""} ${i.customer?.phone || ""} ${i.customer?.email || ""} ${i.payment_method} ${i.staff?.name || ""} ${(i.items || []).map((x) => x.name).join(" ")}`.toLowerCase().includes(q)) : invoices;
  return (
    <FillPage>
      <PageTitle title="Billing" subtitle="Invoices, e-bills and receipts" actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> New invoice</Button>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel fill>
        <div className="shrink-0 border-b border-border p-3"><Input placeholder="Search invoice no., customer, phone, service or payment…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search invoices" /></div>
        <DataTable rows={shown} onRowClick={setViewing} empty={q ? "No invoices match your search." : "No invoices yet."} columns={[
          { key: "invoice_no", header: "Invoice", render: (i) => <span className="font-medium">{i.invoice_no}</span> },
          { key: "customer", header: "Customer", render: (i) => i.customer?.name },
          { key: "date", header: "Date", render: (i) => fmtDateTime(i.created_at) },
          { key: "pay", header: "Paid via", render: (i) => <Badge>{i.payment_method}</Badge> },
          { key: "total", header: "Total", className: "text-right", render: (i) => <span className="font-semibold">{money(i.total)}</span> },
        ]} />
      </Panel>
      {creating && <InvoiceModal bookingId={params.get("booking")} onClose={closeCreate} onCreated={(inv) => { closeCreate(); load(); setViewing(inv); }} />}
      {viewing && <ReceiptModal invoice={viewing} onClose={() => setViewing(null)} />}
    </FillPage>
  );
}

function ReceiptModal({ invoice, onClose }) {
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [sending, setSending] = useState(false);

  const email = async () => {
    setSending(true); setMsg({ type: "", text: "" });
    try { const { data } = await api.post(`/invoices/${invoice.id}/email`, {}); setMsg({ type: "ok", text: `E-bill sent to ${data.sent_to}` }); }
    catch (e) { setMsg({ type: "err", text: errMsg(e) }); } finally { setSending(false); }
  };

  // WhatsApp can't be given a file by a web link, so the message carries a secure link that opens the invoice PDF.
  const whatsapp = async () => {
    setMsg({ type: "", text: "" });
    const win = window.open("", "_blank"); // opened right away so the browser doesn't block it as a popup
    try {
      const { data } = await api.post(`/invoices/${invoice.id}/share-link`, {});
      const link = `${window.location.origin}/i/${data.code}`;
      let phone = String(invoice.customer?.phone || "").replace(/\D/g, "").replace(/^0+/, "");
      if (phone.length === 10) phone = `91${phone}`; // Indian mobile without country code
      const text = `Hi ${invoice.customer?.name || ""}, thank you for visiting The Grooming Master!
Your invoice ${invoice.invoice_no} (total ${moneyExact(invoice.total)}) is ready. Download the PDF here:
${link}`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      if (win) win.location.href = url; else window.location.href = url;
    } catch (e) { win?.close(); setMsg({ type: "err", text: errMsg(e) }); }
  };

  return (
    <Modal title={`Invoice ${invoice.invoice_no}`} onClose={onClose} wide="a4">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => printSheet()}><Printer size={14} /> Print receipt</Button>
        <Button variant="secondary" size="sm" onClick={() => openFile(`/invoices/${invoice.id}/pdf`, { download: `${invoice.invoice_no}.pdf` }).catch((e) => setMsg({ type: "err", text: errMsg(e) }))}><Download size={14} /> PDF</Button>
        <Button variant="secondary" size="sm" onClick={whatsapp} title={invoice.customer?.phone ? "" : "No phone on file - you'll pick the contact in WhatsApp"}><MessageCircle size={14} className="text-success" /> Share on WhatsApp</Button>
        <Button size="sm" disabled={sending || !invoice.customer?.email} title={invoice.customer?.email ? "" : "Customer has no email on file"} onClick={email}><Mail size={14} /> {sending ? "Sending…" : "Email e-bill"}</Button>
      </div>
      {msg.text && (msg.type === "err" ? <ErrorNote>{msg.text}</ErrorNote> : <div role="status" className="mb-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{msg.text}</div>)}
      <div className="max-h-[72vh] overflow-y-auto rounded-md bg-surface-2 p-3 sm:p-4"><Receipt invoice={invoice} /></div>
    </Modal>
  );
}

function InvoiceModal({ bookingId, onClose, onCreated }) {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ customer_id: "", staff_id: "", discount: 0, tax_pct: 0, payment_method: "cash" });
  const [items, setItems] = useState([]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/customers"), api.get("/services"), api.get("/staff"), bookingId ? api.get("/bookings") : Promise.resolve(null)])
      .then(([c, s, st, b]) => {
        setCustomers(c.data); setServices(s.data); setStaff(st.data);
        const bk = b?.data.find((x) => x.id === bookingId);
        if (bk) { // prefill from the booking being completed
          setForm((f) => ({ ...f, customer_id: bk.customer_id, staff_id: bk.staff_id || "" }));
          setItems(bk.services.map((x) => ({ name: x.name, price: Number(x.price), qty: 1 }))); // one line per service in the booking
        }
      }).catch((e) => setError(errMsg(e)));
  }, [bookingId]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0), [items]);
  const discount = Math.min(Number(form.discount) || 0, subtotal);
  const tax = ((subtotal - discount) * (Number(form.tax_pct) || 0)) / 100;
  const total = subtotal - discount + tax;

  const addItem = () => {
    const s = services.find((x) => x.id === pick);
    if (s) { setItems((l) => [...l, { name: s.name, price: Number(s.price), qty: 1 }]); setPick(""); }
  };
  const patchItem = (i, k, v) => setItems((l) => l.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const { data } = await api.post("/invoices", { ...form, staff_id: form.staff_id || null, booking_id: bookingId || null, items: items.map((i) => ({ ...i, price: Number(i.price), qty: Number(i.qty) })) });
      onCreated(data);
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal title="New invoice" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer"><SearchSelect required value={form.customer_id} onChange={(v) => setForm((f) => ({ ...f, customer_id: v }))} options={customers.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select customer…" searchPlaceholder="Search name or phone…" ariaLabel="Customer" /></Field>
          <Field label="Served by"><Select value={form.staff_id} onChange={set("staff_id")}><option value="">Me</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-ink-secondary">Items</div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_60px_auto] gap-2">
                <Input value={it.name} onChange={(e) => patchItem(i, "name", e.target.value)} aria-label="Item name" />
                <Input type="number" min="0" value={it.price} onChange={(e) => patchItem(i, "price", e.target.value)} aria-label="Price" />
                <Input type="number" min="1" value={it.qty} onChange={(e) => patchItem(i, "qty", e.target.value)} aria-label="Quantity" />
                <Button type="button" variant="ghost" aria-label="Remove item" onClick={() => setItems((l) => l.filter((_, x) => x !== i))}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add a service"><option value="">Add a service…</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {money(s.price)}</option>)}</Select>
            <Button type="button" variant="secondary" onClick={addItem} disabled={!pick}>Add</Button>
            <Button type="button" variant="secondary" onClick={() => setItems((l) => [...l, { name: "", price: 0, qty: 1 }])}>Custom</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Discount (₹)"><Input type="number" min="0" value={form.discount} onChange={set("discount")} /></Field>
          <Field label="Tax (%)"><Input type="number" min="0" step="0.5" value={form.tax_pct} onChange={set("tax_pct")} /></Field>
          <Field label="Payment"><Select value={form.payment_method} onChange={set("payment_method")}><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="other">Other</option></Select></Field>
        </div>

        <div className="flex items-center justify-between rounded-md bg-surface-2 px-4 py-3">
          <span className="text-sm text-ink-secondary">Total</span><span className="text-xl font-semibold">{moneyExact(total)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !items.length || items.some((i) => !i.name)}>{busy ? "Saving…" : "Create invoice"}</Button>
        </div>
      </form>
    </Modal>
  );
}
