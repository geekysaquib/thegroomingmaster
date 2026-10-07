import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, errMsg } from "../../lib/api";
import { fmtDateTime, money } from "../../lib/format";
import { Badge, Button, DataTable, ErrorNote, PageTitle, Panel, Spinner, statusTone } from "../../components/ui";

export default function MyBookings() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get("/bookings").then((r) => setRows(r.data.sort((a, b) => b.start_at.localeCompare(a.start_at)))).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const cancel = async (b) => {
    if (!window.confirm(`Cancel ${b.service.name} on ${fmtDateTime(b.start_at)}?`)) return;
    try { await api.patch(`/bookings/${b.id}`, { status: "cancelled" }); load(); } catch (e) { setError(errMsg(e)); }
  };

  if (!rows) return <Spinner />;
  return (
    <>
      <PageTitle title="My bookings" actions={<Link to="/app/book"><Button>New booking</Button></Link>} />
      <ErrorNote>{error}</ErrorNote>
      <Panel bodyClassName="">
        <DataTable rows={rows} empty="No bookings yet - book your first appointment!" columns={[
          { key: "service", header: "Service", render: (b) => b.service.name },
          { key: "when", header: "When", render: (b) => fmtDateTime(b.start_at) },
          { key: "price", header: "Price", render: (b) => money(b.service.price) },
          { key: "status", header: "Status", render: (b) => <Badge tone={statusTone[b.status]}>{b.status.replace("_", " ")}</Badge> },
          { key: "act", header: "", className: "text-right", render: (b) =>
            b.status === "booked" && new Date(b.start_at) > new Date() ? <Button size="sm" variant="secondary" onClick={() => cancel(b)}>Cancel</Button> : null },
        ]} />
      </Panel>
    </>
  );
}
