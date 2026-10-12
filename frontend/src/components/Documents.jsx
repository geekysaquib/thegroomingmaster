import { useLayoutEffect, useRef, useState } from "react";
import { moneyExact, fmtDateTime, SALON } from "../lib/format";
import { SALON_TZ } from "../lib/salonTime";
import { rupeesInWords } from "../lib/words";

// Printed documents (invoice, salary slip) are laid out on a real A4 sheet (210 x 297 mm) and follow the landing page's look:
// ivory paper, antique-gold rules, the crest and Cormorant serif headings. On small screens the sheet is scaled
// down to fit; when printed or saved as PDF it is exactly A4.
const A4_W = 794, A4_H = 1123; // 210mm x 297mm at 96 dpi
const SERIF = { fontFamily: '"Cormorant Garamond", Georgia, serif' };
/** Print the sheet on a full A4 page: no browser margins, whatever the print dialog's "Margins" says. */
export function printSheet() {
  const style = document.createElement("style");
  style.textContent = "@page { size: A4 portrait; margin: 0; }";
  document.head.appendChild(style);
  const done = () => { style.remove(); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
}
const KEEP = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }; // dark band + tints survive printing

function A4Sheet({ children }) {
  const wrap = useRef(null), sheet = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: A4_H });
  useLayoutEffect(() => {
    const measure = () => { const scale = Math.min(1, wrap.current.clientWidth / A4_W); setFit({ scale, height: sheet.current.offsetHeight * scale }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current); ro.observe(sheet.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrap} className="mx-auto w-full" style={{ maxWidth: A4_W, height: fit.height }}>
      <div ref={sheet} className="a4-sheet print-area flex flex-col overflow-hidden bg-[#fffdf8] text-[13px] leading-relaxed text-[#1d1710] shadow-lg"
        style={{ width: A4_W, minHeight: A4_H, transform: `scale(${fit.scale})`, transformOrigin: "top left", fontFamily: '"Inter Tight", Inter, sans-serif', ...KEEP }}>
        {children}
      </div>
    </div>
  );
}

function Band({ label, title, sub }) {
  return (
    <div className="px-10 pt-9">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <img src="/images/brand/crest.png" alt="" className="h-[74px] w-[53px] shrink-0 object-contain" />
          <div>
            <div className="text-[32px] font-semibold leading-none tracking-wide text-[#1a1610]" style={SERIF}>The Grooming Master</div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#946c14]">Luxury Salon · Mohali</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#946c14]">{label}</div>
          <div className="mt-1 text-[28px] font-semibold leading-none text-[#1a1610]" style={SERIF}>{title}</div>
          {sub && <div className="mt-1.5 text-[11px] text-[#5f5342]">{sub}</div>}
        </div>
      </div>
      {/* double gold rule */}
      <div className="mt-6 h-[2px] bg-[#d4a73c]" style={KEEP} />
      <div className="mt-[3px] h-px bg-[#d4a73c]/60" style={KEEP} />
    </div>
  );
}

function Footer({ note }) {
  return (
    <div className="mt-auto px-10 pb-8 pt-6 text-center">
      <div className="mb-4 h-px bg-gradient-to-r from-transparent via-[#d4a73c] to-transparent" />
      <div className="text-2xl italic text-[#946c14]" style={SERIF}>Thank you for choosing The Grooming Master</div>
      <div className="mt-1.5 text-[11px] text-[#5f5342]">{SALON.address}</div>
      <div className="text-[11px] text-[#5f5342]">{SALON.phones.join("  ·  ")}  ·  {SALON.instagram}</div>
      <p className="mt-3 text-[10px] text-[#8a7d68]">{note}</p>
    </div>
  );
}

const Label = ({ children }) => <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#946c14]">{children}</div>;
function Row({ label, value, tone }) {
  return <div className="flex justify-between gap-6 py-1"><span className="text-[#5f5342]">{label}</span><span className={tone === "minus" ? "text-[#b03a2e]" : "text-[#1d1710]"}>{value}</span></div>;
}
function TotalBox({ label, value }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-sm border border-[#d4a73c] bg-[#f6ecd5] px-4 py-3" style={KEEP}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#946c14]">{label}</span>
      <span className="text-[28px] font-semibold leading-none text-[#1a1610]" style={SERIF}>{value}</span>
    </div>
  );
}
const monthLabel = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }); };

export function Receipt({ invoice }) {
  const c = invoice.customer || {};
  return (
    <A4Sheet>
      <Band label="Tax Invoice" title={invoice.invoice_no} sub={fmtDateTime(invoice.created_at)} />
      <div className="px-10 pt-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>Billed to</Label>
            <div className="text-xl font-semibold" style={SERIF}>{c.name || "Walk-in customer"}</div>
            {c.phone && <div className="text-xs text-[#5f5342]">{c.phone}</div>}
            {c.email && <div className="text-xs text-[#5f5342]">{c.email}</div>}
          </div>
          <div className="text-xs sm:text-right">
            <Label>Details</Label>
            <div className="space-y-0.5 text-[#5f5342]">
              <div>Payment: <span className="font-medium uppercase text-[#1d1710]">{invoice.payment_method}</span></div>
              {invoice.staff?.name && <div>Served by: <span className="font-medium text-[#1d1710]">{invoice.staff.name}</span></div>}
              <div>Status: <span className="font-semibold text-[#2f7d57]">PAID</span></div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <table className="w-full table-fixed text-left">
            <colgroup><col style={{ width: 44 }} /><col /><col style={{ width: 70 }} /><col style={{ width: 116 }} /><col style={{ width: 120 }} /></colgroup>
            <thead>
              <tr className="bg-[#f6ecd5] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a3f30]" style={KEEP}>
                <th className="w-10 px-3 py-2.5">#</th><th className="py-2.5">Description</th><th className="px-2 py-2.5 text-right">Qty</th><th className="px-2 py-2.5 text-right">Rate</th><th className="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className={i % 2 ? "bg-[#fcf7ea]" : ""} style={KEEP}>
                  <td className="px-3 py-3 text-[#5f5342]">{i + 1}</td><td className="py-3 pr-3 font-medium">{it.name}</td>
                  <td className="px-2 py-3 text-right">{it.qty}</td><td className="px-2 py-3 text-right">{moneyExact(it.price)}</td><td className="px-3 py-3 text-right font-medium">{moneyExact(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="h-px bg-gradient-to-r from-[#d4a73c] via-[#a77a1c] to-[#d4a73c]" />
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[280px] text-xs text-[#5f5342]">
            <Label>Amount in words</Label>
            <div className="italic" style={{ ...SERIF, fontSize: 16, lineHeight: 1.25 }}>{rupeesInWords(invoice.total)}</div>
          </div>
          <div className="w-72 text-[13px]">
            <Row label="Subtotal" value={moneyExact(invoice.subtotal)} />
            {Number(invoice.discount) > 0 && <Row label="Discount" value={`- ${moneyExact(invoice.discount)}`} tone="minus" />}
            {Number(invoice.tax) > 0 && <Row label={`Tax (${invoice.tax_pct}%)`} value={moneyExact(invoice.tax)} />}
            <TotalBox label="Total" value={moneyExact(invoice.total)} />
          </div>
        </div>
      </div>
      <Footer note="This is a computer-generated invoice and does not require a signature." />
    </A4Sheet>
  );
}

function Table({ title, rows, total }) {
  return (
    <div>
      <div className="bg-[#f6ecd5] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a3f30]" style={KEEP}>{title}</div>
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex justify-between px-3 py-2.5 ${i % 2 ? "bg-[#fcf7ea]" : ""}`} style={KEEP}><span className="text-[#5f5342]">{k}</span><span className="font-medium">{v}</span></div>
      ))}
      <div className="h-px bg-gradient-to-r from-[#d4a73c] via-[#a77a1c] to-[#d4a73c]" />
      {total && <div className="flex justify-between px-3 py-2.5 font-semibold"><span>{total[0]}</span><span>{total[1]}</span></div>}
    </div>
  );
}

export function SalarySlip({ slip }) {
  const earnings = Number(slip.base) + Number(slip.commission) + Number(slip.bonus);
  const paid = slip.status === "paid";
  return (
    <A4Sheet>
      <Band label="Salary Slip" title={monthLabel(slip.month)} sub="Pay period" />
      <div className="px-10 pt-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>Employee</Label>
            <div className="text-xl font-semibold" style={SERIF}>{slip.staff?.name}</div>
            <div className="text-xs capitalize text-[#5f5342]">{slip.staff?.role}</div>
            {slip.staff?.email && <div className="text-xs text-[#5f5342]">{slip.staff.email}</div>}
          </div>
          <div className="text-xs sm:text-right">
            <Label>Details</Label>
            <div className="space-y-0.5 text-[#5f5342]">
              <div>Pay period: <span className="font-medium text-[#1d1710]">{monthLabel(slip.month)}</span></div>
              <div>Status: <span className={`font-semibold ${paid ? "text-[#2f7d57]" : "text-[#b7791f]"}`}>{paid ? `PAID${slip.paid_at ? ` on ${new Date(slip.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: SALON_TZ })}` : ""}` : "PENDING"}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Table title="Earnings" rows={[["Base salary", moneyExact(slip.base)], ["Sales commission", moneyExact(slip.commission)], ["Bonus", moneyExact(slip.bonus)]]} total={["Gross earnings", moneyExact(earnings)]} />
          <Table title="Deductions" rows={[["Total deductions", moneyExact(slip.deductions)]]} total={["Total deductions", moneyExact(slip.deductions)]} />
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[280px] text-xs text-[#5f5342]">
            <Label>Net pay in words</Label>
            <div className="italic" style={{ ...SERIF, fontSize: 16, lineHeight: 1.25 }}>{rupeesInWords(slip.net)}</div>
          </div>
          <div className="w-72"><TotalBox label="Net pay" value={moneyExact(slip.net)} /></div>
        </div>
      </div>
      <Footer note="This is a computer-generated slip and does not require a signature." />
    </A4Sheet>
  );
}
