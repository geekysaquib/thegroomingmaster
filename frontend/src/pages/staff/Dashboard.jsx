import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, IndianRupee, Receipt, UserPlus } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { money } from "../../lib/format";
import { Button, ErrorNote, MetricCard, PageTitle, Panel, Select, Spinner } from "../../components/ui";

const AXIS = { fontSize: 11, fill: "var(--text-muted)" };

function ChartTip({ active, payload, label, money: isMoney = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-3 px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-ink-secondary">{label ?? payload[0].payload.name}</div>
      <div className="font-semibold text-ink-primary">{isMoney ? money(payload[0].value) : payload[0].value}</div>
    </div>
  );
}

/** Chart panel with a "table" toggle so the data is never color/graphic-only. */
function ChartCard({ title, rows, xKey = "name", valueLabel = "Amount", asMoney = true, children }) {
  const [table, setTable] = useState(false);
  return (
    <Panel title={title} actions={<Button variant="ghost" size="sm" onClick={() => setTable((t) => !t)}>{table ? "Chart" : "Table"}</Button>}>
      {rows.length === 0 ? <p className="py-10 text-center text-sm text-ink-muted">No data for this period.</p> : table ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-ink-muted"><th className="py-1">{xKey === "date" ? "Date" : "Name"}</th><th className="py-1 text-right">{valueLabel}</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r[xKey]} className="border-t border-border"><td className="py-1">{r[xKey]}</td><td className="py-1 text-right">{asMoney ? money(r.revenue ?? r.value) : (r.revenue ?? r.value)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <div className="h-64">{children}</div>}
    </Panel>
  );
}

function HBar({ data, color = "var(--series-1)", asMoney = true }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke="var(--grid)" />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={asMoney ? (v) => (v >= 1000 ? `${v / 1000}k` : v) : undefined} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={120} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "var(--hover-overlay)" }} content={<ChartTip money={asMoney} />} />
        <Bar isAnimationActive={false} dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    api.get("/analytics/summary", { params: { days } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [days]);

  return (
    <>
      <PageTitle title="Sales dashboard" subtitle={`Last ${days} days`}
        actions={<Select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range" className="!w-auto"><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>12 months</option></Select>} />
      <ErrorNote>{error}</ErrorNote>
      {!data ? !error && <Spinner /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Revenue" value={money(data.totals.revenue)} icon={<IndianRupee />} hint={`${data.totals.invoices} invoices`} />
            <MetricCard label="Avg. ticket" value={money(data.totals.avgTicket)} icon={<Receipt />} />
            <MetricCard label="Bookings" value={data.totals.bookings} icon={<CalendarCheck />} />
            <MetricCard label="New customers" value={data.totals.newCustomers} icon={<UserPlus />} />
          </div>

          <ChartCard title="Revenue over time" rows={data.revenueByDay} xKey="date" valueLabel="Revenue">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueByDay} margin={{ left: 0, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} minTickGap={32} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border-strong)" }} />
                <Line isAnimationActive={false} type="monotone" dataKey="revenue" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--surface-1)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Top services by revenue" rows={data.byService}><HBar data={data.byService} /></ChartCard>
            <ChartCard title="Revenue by stylist" rows={data.byStaff}><HBar data={data.byStaff} /></ChartCard>
            <ChartCard title="Payment methods" rows={data.byPayment}><HBar data={data.byPayment} /></ChartCard>
            <ChartCard title="Bookings by status" rows={data.bookingStatus} valueLabel="Bookings" asMoney={false}><HBar data={data.bookingStatus} asMoney={false} /></ChartCard>
          </div>
        </div>
      )}
    </>
  );
}
