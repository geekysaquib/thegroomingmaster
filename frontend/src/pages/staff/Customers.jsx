import { useConfirm } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Download, UserPlus } from "lucide-react";
import { api, errMsg, openFile } from "../../lib/api";
import { isAdminRole, useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/format";
import AddCustomerModal from "../../components/AddCustomerModal";
import { FillPage, Badge, Button, DataTable, ErrorNote, Input, PageTitle, Panel } from "../../components/ui";

export default function Customers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [confirm, confirmDialog] = useConfirm();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Debounced server-side search.
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/customers", { params: { search } }).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const toggleBlock = async (c) => {
    const blocking = c.active;
    const ok = await confirm(blocking
      ? { title: "Block this customer?", danger: true, confirmLabel: "Block customer", message: `${c.name} will be signed out and won't be able to log in or book online until you unblock them.` }
      : { title: "Unblock this customer?", confirmLabel: "Unblock", message: `${c.name} will be able to log in and book online again.` });
    if (!ok) return;
    try {
      await api.patch(`/customers/${c.id}/block`, { blocked: blocking });
      setRows((r) => r.map((x) => (x.id === c.id ? { ...x, active: !blocking } : x)));
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <FillPage>
      <PageTitle title="Customers" subtitle={`${rows.length} customer${rows.length === 1 ? "" : "s"}`} actions={<>
        {isAdminRole(user.role) && <Button variant="secondary" onClick={() => openFile("/customers/export", { download: "customers.csv" }).catch((e) => setError(errMsg(e)))}><Download size={14} /> Export CSV</Button>}
        <Button onClick={() => setAdding(true)}><UserPlus size={14} /> Add customer</Button>
      </>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel fill>
        <div className="shrink-0 border-b border-border p-3"><Input placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" /></div>
        <DataTable rows={rows} empty="No customers found." columns={[
          { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "phone", header: "Phone", render: (c) => c.phone || "-" },
          { key: "email", header: "Email", render: (c) => c.email || "-" },
          { key: "gender", header: "Gender", render: (c) => <span className="capitalize">{c.gender || "-"}</span> },
          { key: "account", header: "Account", render: (c) => <Badge tone={c.has_account ? "success" : "neutral"}>{c.has_account ? "Online" : "Walk-in"}</Badge> },
          { key: "created_at", header: "Joined", render: (c) => fmtDate(c.created_at) },
          ...(isAdminRole(user.role) ? [
            { key: "status", header: "Status", render: (c) => <Badge tone={c.active ? "success" : "danger"}>{c.active ? "Active" : "Blocked"}</Badge> },
            { key: "act", header: "", className: "text-right", render: (c) => (
              <Button size="sm" variant="ghost" aria-label={`${c.active ? "Block" : "Unblock"} ${c.name}`} onClick={() => toggleBlock(c)}>
                {c.active ? <><Ban size={14} /> Block</> : <><CheckCircle2 size={14} /> Unblock</>}
              </Button>) },
          ] : []),
        ]} />
      </Panel>
      {confirmDialog}
      {adding && <AddCustomerModal onClose={() => setAdding(false)} onCreated={(c) => setRows((r) => [{ ...c, active: true, has_account: false }, ...r])} />}
    </FillPage>
  );
}
