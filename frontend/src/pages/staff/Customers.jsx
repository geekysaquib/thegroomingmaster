import { useEffect, useState } from "react";
import { Download, UserPlus } from "lucide-react";
import { api, errMsg, openFile } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/format";
import AddCustomerModal from "../../components/AddCustomerModal";
import { Badge, Button, DataTable, ErrorNote, Input, PageTitle, Panel } from "../../components/ui";

export default function Customers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Debounced server-side search.
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/customers", { params: { search } }).then((r) => setRows(r.data)).catch((e) => setError(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <PageTitle title="Customers" subtitle={`${rows.length} customer${rows.length === 1 ? "" : "s"}`} actions={<>
        {user.role === "admin" && <Button variant="secondary" onClick={() => openFile("/customers/export", { download: "customers.csv" }).catch((e) => setError(errMsg(e)))}><Download size={14} /> Export CSV</Button>}
        <Button onClick={() => setAdding(true)}><UserPlus size={14} /> Add customer</Button>
      </>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="">
        <div className="border-b border-border p-3"><Input placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" /></div>
        <DataTable rows={rows} empty="No customers found." columns={[
          { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "phone", header: "Phone", render: (c) => c.phone || "-" },
          { key: "email", header: "Email", render: (c) => c.email || "-" },
          { key: "gender", header: "Gender", render: (c) => <span className="capitalize">{c.gender || "-"}</span> },
          { key: "account", header: "Account", render: (c) => <Badge tone={c.has_account ? "success" : "neutral"}>{c.has_account ? "Online" : "Walk-in"}</Badge> },
          { key: "created_at", header: "Joined", render: (c) => fmtDate(c.created_at) },
        ]} />
      </Panel>
      {adding && <AddCustomerModal onClose={() => setAdding(false)} onCreated={(c) => setRows((r) => [{ ...c, has_account: false }, ...r])} />}
    </>
  );
}
