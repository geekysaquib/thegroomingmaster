import { moneyExact, fmtDateTime } from "../lib/format";

// Paper-style documents. Always light-on-white (they represent a printed page) regardless of app theme.
const paper = "print-area mx-auto bg-white p-8 text-[13px] leading-relaxed text-[#1b1f32] shadow-lg";

function Line({ label, value, strong }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "border-t border-[#1b1f32] pt-2 text-base font-bold" : ""}`}>
      <span className={strong ? "" : "text-[#6c7486]"}>{label}</span><span>{value}</span>
    </div>
  );
}

function Letterhead({ title, sub }) {
  return (
    <div className="mb-5 border-b-2 border-[#b8934a] pb-3">
      <div className="text-xl font-bold tracking-wide text-[#b8934a]">THE GROOMING MASTER</div>
      <div className="text-[11px] text-[#6c7486]">Luxury grooming for him &amp; her</div>
      <div className="mt-3 text-lg font-semibold">{title}</div>
      {sub && <div className="text-xs text-[#6c7486]">{sub}</div>}
    </div>
  );
}

export function Receipt({ invoice }) {
  return (
    <div className={`${paper} max-w-md`}>
      <Letterhead title={`Invoice ${invoice.invoice_no}`} sub={fmtDateTime(invoice.created_at)} />
      <div className="mb-3 text-xs"><span className="text-[#6c7486]">Billed to: </span>{[invoice.customer?.name, invoice.customer?.phone].filter(Boolean).join(" · ")}</div>
      <table className="mb-3 w-full text-left">
        <thead><tr className="border-b border-[#dee2e6] text-[11px] uppercase text-[#6c7486]"><th className="py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={i}><td className="py-1">{it.name}</td><td className="text-right">{it.qty}</td><td className="text-right">{moneyExact(it.price * it.qty)}</td></tr>
          ))}
        </tbody>
      </table>
      <Line label="Subtotal" value={moneyExact(invoice.subtotal)} />
      {Number(invoice.discount) > 0 && <Line label="Discount" value={`- ${moneyExact(invoice.discount)}`} />}
      {Number(invoice.tax) > 0 && <Line label={`Tax (${invoice.tax_pct}%)`} value={moneyExact(invoice.tax)} />}
      <Line label="Total" value={moneyExact(invoice.total)} strong />
      <div className="mt-2 text-xs text-[#6c7486]">Paid via {invoice.payment_method.toUpperCase()}{invoice.staff?.name ? ` · Served by ${invoice.staff.name}` : ""}</div>
      <p className="mt-6 text-center text-[11px] text-[#6c7486]">Thank you for choosing The Grooming Master.</p>
    </div>
  );
}

export function SalarySlip({ slip }) {
  const earnings = Number(slip.base) + Number(slip.commission) + Number(slip.bonus);
  return (
    <div className={`${paper} max-w-xl`}>
      <Letterhead title="Salary Slip" sub={`Pay period: ${slip.month}`} />
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-[#6c7486]">Employee: </span>{slip.staff?.name}</div>
        <div><span className="text-[#6c7486]">Role: </span><span className="capitalize">{slip.staff?.role}</span></div>
        <div><span className="text-[#6c7486]">Email: </span>{slip.staff?.email}</div>
        <div><span className="text-[#6c7486]">Status: </span>{slip.status === "paid" ? `Paid ${new Date(slip.paid_at).toLocaleDateString("en-IN")}` : "Pending"}</div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-1 border-b border-[#dee2e6] text-[11px] font-semibold uppercase text-[#6c7486]">Earnings</div>
          <Line label="Base salary" value={moneyExact(slip.base)} />
          <Line label="Sales commission" value={moneyExact(slip.commission)} />
          <Line label="Bonus" value={moneyExact(slip.bonus)} />
          <Line label="Gross" value={moneyExact(earnings)} strong />
        </div>
        <div>
          <div className="mb-1 border-b border-[#dee2e6] text-[11px] font-semibold uppercase text-[#6c7486]">Deductions</div>
          <Line label="Total deductions" value={moneyExact(slip.deductions)} />
        </div>
      </div>
      <div className="mt-5 rounded bg-[#f6f8fa] px-3 py-2"><Line label="Net pay" value={moneyExact(slip.net)} strong /></div>
      <p className="mt-8 text-center text-[11px] text-[#6c7486]">This is a computer-generated slip and does not require a signature.</p>
    </div>
  );
}
