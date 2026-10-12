import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { Badge, Button, DataTable, ErrorNote, Input, MetricCard, PageTitle, Panel } from "../../components/ui";

const when = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const tone = (s) => (s >= 500 ? "danger" : s >= 400 ? "warning" : "success");

export default function Developer() {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => Promise.all([
    api.get("/dev/overview"), api.get("/dev/logs", { params: { errors: errorsOnly ? 1 : 0, search } }),
  ]).then(([o, l]) => { setOverview(o.data); setLogs(l.data); setError(""); }).catch((e) => setError(errMsg(e))), [errorsOnly, search]);

  // Debounced reload on filter change; optional 15 s auto-refresh while "Live" is on.
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { if (!live) return; const t = setInterval(load, 15000); return () => clearInterval(t); }, [live, load]);

  const o = overview;
  return (
    <div className="flex h-full min-h-[360px] flex-col">
      <PageTitle subtitle="God-mode view: every write and every failed request across the salon, with who did it." actions={<>
        <Button variant={live ? "primary" : "secondary"} onClick={() => setLive((v) => !v)}>{live ? "Live: on" : "Live: off"}</Button>
        <Button variant="secondary" onClick={load}><RefreshCw size={14} /> Refresh</Button>
      </>} />
      <ErrorNote>{error}</ErrorNote>
      {o && (
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Errors 24h" value={o.errors24h} />
          <MetricCard label="Writes 24h" value={o.writes24h} />
          <MetricCard label="Customers" value={o.customers} hint={`${o.blocked} blocked/inactive`} />
          <MetricCard label="Staff" value={o.staff} hint={`${o.admins} admin`} />
          <MetricCard label="Bookings" value={o.bookings} />
          <MetricCard label="Invoices" value={o.invoices} />
          <MetricCard label="Email" value={o.smtp_configured ? "On" : "Off"} />
          <MetricCard label="Server" value={o.node} />
        </div>
      )}
      <Panel fill>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="min-w-[200px] flex-1"><Input placeholder="Search user, path or error…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search activity" /></div>
          <label className="flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} /> Errors only</label>
        </div>
        <DataTable rows={logs} pageSize={50} empty="No activity yet." columns={[
          { key: "at", header: "Time", render: (l) => <span className="whitespace-nowrap">{when(l.at)}</span> },
          { key: "status", header: "Status", render: (l) => <Badge tone={tone(l.status)}>{l.status}</Badge> },
          { key: "who", header: "User", render: (l) => l.user_name ? <span>{l.user_name} <span className="text-ink-muted">({l.role})</span></span> : <span className="text-ink-muted">anonymous</span> },
          { key: "req", header: "Request", render: (l) => <span className="font-mono"><b>{l.method}</b> {l.path}</span> },
          { key: "detail", header: "Detail", render: (l) => l.detail || "-" },
        ]} />
      </Panel>
    </div>
  );
}
