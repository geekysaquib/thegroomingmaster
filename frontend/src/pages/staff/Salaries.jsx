import { useEffect, useState } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { api, errMsg, openFile } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { monthKey, money } from "../../lib/format";
import { SalarySlip } from "../../components/Documents";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageTitle, Panel, statusTone } from "../../components/ui";

export default function Salaries() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [month, setMonth] = useState(monthKey());
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/salaries").then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setError(""); setBusy(true);
    try { await api.post("/salaries/generate", { month }); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const shown = isAdmin ? rows.filter((r) => r.month === month) : rows;
  const totalNet = shown.reduce((s, r) => s + Number(r.net), 0);

  return (
    <>
      <PageTitle title={isAdmin ? "Salaries" : "My salary slips"}
        subtitle={isAdmin ? `Payroll for ${month}: ${money(totalNet)} across ${shown.length} slip${shown.length === 1 ? "" : "s"}` : "Generate and download your monthly slips"}
        actions={<>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Pay month" className="!w-auto" />
          <Button onClick={generate} disabled={busy || !month}><RefreshCw size={14} /> {busy ? "Generating…" : isAdmin ? "Generate payroll" : "Generate my slip"}</Button>
        </>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="">
        <DataTable rows={shown} onRowClick={setOpen} empty={isAdmin ? "No slips for this month - generate payroll." : "No slips yet. Pick a month and generate one."} columns={[
          ...(isAdmin ? [{ key: "staff", header: "Staff", render: (s) => <span className="font-medium">{s.staff?.name}</span> }] : []),
          { key: "month", header: "Month" },
          { key: "base", header: "Base", render: (s) => money(s.base) },
          { key: "commission", header: "Commission", render: (s) => money(s.commission) },
          { key: "bonus", header: "Bonus", render: (s) => money(s.bonus) },
          { key: "deductions", header: "Deductions", render: (s) => money(s.deductions) },
          { key: "net", header: "Net pay", render: (s) => <span className="font-semibold">{money(s.net)}</span> },
          { key: "status", header: "Status", render: (s) => <Badge tone={statusTone[s.status]}>{s.status}</Badge> },
        ]} />
      </Panel>
      {open && <SlipModal slip={open} isAdmin={isAdmin} onClose={() => setOpen(null)} onChanged={(s) => { setOpen(s); load(); }} />}
    </>
  );
}

function SlipModal({ slip, isAdmin, onClose, onChanged }) {
  const [bonus, setBonus] = useState(slip.bonus);
  const [deductions, setDeductions] = useState(slip.deductions);
  const [error, setError] = useState("");
  const paid = slip.status === "paid";

  const save = async (extra = {}) => {
    setError("");
    try { const { data } = await api.patch(`/salaries/${slip.id}`, { bonus: Number(bonus), deductions: Number(deductions), ...extra }); onChanged(data); }
    catch (e) { setError(errMsg(e)); }
  };

  return (
    <Modal title="Salary slip" onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {isAdmin && !paid ? (
          <div className="flex items-end gap-2">
            <Field label="Bonus (₹)"><Input type="number" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} className="!w-28" /></Field>
            <Field label="Deductions (₹)"><Input type="number" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} className="!w-28" /></Field>
            <Button variant="secondary" onClick={() => save()}>Update</Button>
            <Button onClick={() => window.confirm("Mark this slip as paid? It can't be edited afterwards.") && save({ status: "paid" })}>Mark paid</Button>
          </div>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print</Button>
          <Button variant="secondary" size="sm" onClick={() => openFile(`/salaries/${slip.id}/pdf`, { download: `salary-${slip.month}.pdf` }).catch((e) => setError(errMsg(e)))}><Download size={14} /> PDF</Button>
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {/* Document canvas: the slip rendered as the printed page */}
      <div className="max-h-[65vh] overflow-y-auto rounded-md bg-surface-2 p-4"><SalarySlip slip={slip} /></div>
    </Modal>
  );
}
