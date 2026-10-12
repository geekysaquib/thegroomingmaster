import PDFDocument from "pdfkit";
import { rupeesInWords } from "./words.js";
import { CREST } from "./crest.js";
import { FONTS } from "./fonts.js";

/**
 * Invoice + salary-slip PDFs. They are drawn to match the on-screen A4 sheet in frontend/src/components/Documents.jsx
 * one-to-one: the same fonts (Cormorant Garamond + Inter Tight, embedded), colours, sizes and positions.
 * Coordinates below are CSS pixels of that 794 x 1123 sheet (the page is scaled by 0.75 to A4 points), and the numbers were
 * measured from the rendered HTML, so changing the layout in Documents.jsx means updating them here too.
 */
const PX = 0.75;
const PW = 595.28 / PX, PH = 841.89 / PX; // A4 in CSS px
const TZ = process.env.SALON_TZ || "Asia/Kolkata";
const C = {
  paper: "#fffdf8", ink: "#1d1710", royal: "#1a1610", muted: "#5f5342", faint: "#8a7d68", gold: "#946c14", gold2: "#d4a73c", gold3: "#a77a1c",
  head: "#4a3f30", champagne: "#f6ecd5", cream: "#fcf7ea", green: "#2f7d57", amber: "#b7791f", red: "#b03a2e",
};
const SALON = { address: "SCO 19, First Floor, Sector 89, Mohali, Sahibzada Ajit Singh Nagar", phones: ["8146647128", "8146756377"], instagram: "@thegroomingmastersalon" };

// Text styles: f = family (cg = Cormorant Garamond, it = Inter Tight), w = weight, i = italic, ls = letter-spacing (px), up = uppercase
const S = {
  brand: { f: "cg", w: 600, size: 32, color: C.royal, ls: 0.8 },
  tag: { f: "it", w: 600, size: 10, color: C.gold, ls: 3, up: true },
  docLabel: { f: "it", w: 600, size: 10, color: C.gold, ls: 3, up: true },
  docTitle: { f: "cg", w: 600, size: 28, color: C.royal },
  docSub: { f: "it", w: 400, size: 11, color: C.muted },
  label: { f: "it", w: 600, size: 10, color: C.gold, ls: 2.2, up: true },
  name: { f: "cg", w: 600, size: 20, color: C.ink },
  small: { f: "it", w: 400, size: 12, color: C.muted },
  smallVal: { f: "it", w: 500, size: 12, color: C.ink },
  th: { f: "it", w: 700, size: 10, color: C.head, ls: 1.4, up: true },
  th6: { f: "it", w: 600, size: 10, color: C.head, ls: 1.4, up: true },
  cellMuted: { f: "it", w: 400, size: 13, color: C.muted },
  cell: { f: "it", w: 400, size: 13, color: C.ink },
  cellMed: { f: "it", w: 500, size: 13, color: C.ink },
  cellBold: { f: "it", w: 600, size: 13, color: C.ink },
  words: { f: "cg", w: 500, i: true, size: 16, color: C.muted },
  total: { f: "cg", w: 600, size: 28, color: C.royal },
  thanks: { f: "cg", w: 500, i: true, size: 24, color: C.gold },
  foot: { f: "it", w: 400, size: 11, color: C.muted },
  note: { f: "it", w: 400, size: 10, color: C.faint },
};

const fontName = (st, rupee) => `${st.f}${st.w}${st.i ? "i" : ""}${rupee ? "x" : ""}`;
const fmtMoney = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(n || 0));
const dateTime = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const day = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
const monthLabel = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }); };
const cap = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

function render(title, build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: title, Author: "The Grooming Master" } });
    for (const [name, buf] of Object.entries(FONTS)) doc.registerFont(name, buf);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const page = () => { doc.scale(PX); doc.rect(0, 0, PW + 2, PH + 2).fill(C.paper); };
    doc.on("pageAdded", page);
    page(); // the first page exists before the listener is attached
    build(doc);
    doc.end();
  });
}

const snap = Math.floor; // the browser draws each baseline on a whole pixel (measured: it lands on the floor)
// ----- text: positioned by the CSS content-box top, like the browser's own layout -----
const split = (s) => s.split(/(₹)/).filter(Boolean);
function width(doc, str, st) {
  let w = 0;
  for (const part of split(st.up ? str.toUpperCase() : str)) { doc.font(fontName(st, part === "₹")).fontSize(st.size); w += doc.widthOfString(part, { features: st.ls ? { liga: false } : undefined }) + (st.ls || 0) * [...part].length; }
  return w;
}
/** Draws `str` with its CSS content top at `top`. align: left (x = left edge) | right (x = right edge) | center (x = centre). */
function put(doc, str, x, top, st, align = "left") {
  const text = st.up ? String(str).toUpperCase() : String(str);
  const total = width(doc, text, st);
  let cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  doc.fillColor(st.color);
  for (const part of split(text)) {
    doc.font(fontName(st, part === "₹")).fontSize(st.size);
    const asc = (doc._font.ascender / 1000) * st.size;
    const base = snap(top + Math.round(asc)); // Chrome rounds the ascent to whole pixels and snaps the baseline
    doc.text(part, cx, base - asc, { lineBreak: false, characterSpacing: st.ls || 0, features: st.ls ? { liga: false } : undefined });
    cx += doc.widthOfString(part, { features: st.ls ? { liga: false } : undefined }) + (st.ls || 0) * [...part].length;
  }
}
function wrap(doc, str, maxW, st) {
  const lines = []; let cur = "";
  for (const word of String(str).split(/\s+/)) { const next = cur ? `${cur} ${word}` : word; if (cur && width(doc, next, st) > maxW) { lines.push(cur); cur = word; } else cur = next; }
  if (cur) lines.push(cur);
  return lines;
}
const rect = (doc, x, y, w, h, color, opacity = 1) => { doc.save().fillOpacity(opacity).rect(x, y, w, h).fill(color).restore(); };
function goldLine(doc, x, y, w) {
  const g = doc.linearGradient(x, 0, x + w, 0).stop(0, C.gold2).stop(0.5, C.gold3).stop(1, C.gold2);
  doc.save().rect(x, y, w, 1).fill(g).restore();
}

function header(doc, label, title, sub) {
  doc.image(CREST, 40, 36, { fit: [53, 74] });
  put(doc, "The Grooming Master", 109, 40.88, S.brand);
  put(doc, "Luxury Salon · Mohali", 109, 86.88, S.tag);
  put(doc, label, 754, 39.88, S.docLabel, "right");
  put(doc, title, 754, 55.13, S.docTitle, "right");
  put(doc, sub, 754, 93.13, S.docSub, "right");
  rect(doc, 40, 134, 714, 2, C.gold2);
  rect(doc, 40, 139, 714, 1, C.gold2, 0.6);
}

function footer(doc, noteText) {
  const fade = doc.linearGradient(40, 0, 754, 0).stop(0, C.gold2, 0).stop(0.5, C.gold2, 1).stop(1, C.gold2, 0);
  doc.save().rect(40, 972, 714, 1).fill(fade).restore();
  put(doc, "Thank you for choosing The Grooming Master", 397, 990, S.thanks, "center");
  put(doc, SALON.address, 397, 1028, S.foot, "center");
  put(doc, `${SALON.phones.join(" · ")} · ${SALON.instagram}`, 397, 1045.88, S.foot, "center");
  put(doc, noteText, 397, 1076.75, S.note, "center");
}

/** "Payment: CARD" - label then value, flush right. */
function detailLine(doc, k, v, top, valStyle = S.smallVal) {
  put(doc, v, 754, top, valStyle, "right");
  put(doc, `${k}: `, 754 - width(doc, v, valStyle), top, S.small, "right");
}

function totalBox(doc, name, amount, top) {
  doc.save().roundedRect(466.5, top + 0.5, 287, 53, 2).fillAndStroke(C.champagne, C.gold2).restore();
  put(doc, name, 483, top + 20.88, S.label);
  put(doc, amount, 737, top + 10, S.total, "right");
}

export function invoicePdf(inv, customer) {
  return render(`Invoice ${inv.invoice_no}`, (doc) => {
    header(doc, "Tax Invoice", inv.invoice_no, dateTime(inv.created_at));

    // Billed to / details
    put(doc, "Billed to", 40, 170, S.label);
    put(doc, customer?.name || "Walk-in customer", 40, 190.25, S.name);
    const leftLines = [customer?.phone, customer?.email].filter(Boolean);
    leftLines.forEach((l, i) => put(doc, l, 40, 216.25 + 16 * i, S.small));
    put(doc, "Details", 754, 170, S.label, "right");
    const details = [["Payment", inv.payment_method.toUpperCase(), S.smallVal], ...(inv.staff?.name ? [["Served by", inv.staff.name, S.smallVal]] : []), ["Status", "PAID", { ...S.smallVal, w: 600, color: C.green }]];
    details.forEach(([k, v, st], i) => detailLine(doc, k, v, 188 + 18 * i, st));
    const tableTop = Math.max(216.25 + 16 * leftLines.length, 188 + 18 * details.length - 2) + 32;

    // Items
    const thead = (y) => {
      rect(doc, 40, y, 714, 36.25, C.champagne);
      put(doc, "#", 52, y + 12, S.th); put(doc, "Description", 85, y + 12, S.th);
      put(doc, "Qty", 510, y + 12, S.th, "right"); put(doc, "Rate", 626, y + 12, S.th, "right"); put(doc, "Amount", 742, y + 12, S.th, "right");
    };
    thead(tableTop);
    let y = tableTop + 36.25;
    inv.items.forEach((it, idx) => {
      let i = idx;
      const lines = wrap(doc, it.name, 350, S.cellMed);
      const h = 24 + lines.length * 21.125;
      if (y + h > 760) { doc.addPage(); y = 40; thead(y); y += 36.25; } // long invoice: continue on the next sheet
      if (i % 2) rect(doc, 40, y, 714, h, C.cream);
      put(doc, String(i + 1), 52, y + 14, S.cellMuted);
      lines.forEach((l, k) => put(doc, l, 85, y + 14 + k * 21.125, S.cellMed));
      put(doc, String(it.qty), 510, y + 14, S.cell, "right");
      put(doc, fmtMoney(it.price), 626, y + 14, S.cell, "right");
      put(doc, fmtMoney(it.price * it.qty), 742, y + 14, S.cellMed, "right");
      y += h;
    });
    goldLine(doc, 40, y, 714);

    // Totals
    let T = y + 21;
    if (T + 160 > 960) { doc.addPage(); T = 60; }
    put(doc, "Amount in words", 40, T + 2, S.label);
    wrap(doc, rupeesInWords(inv.total), 280, S.words).forEach((l, k) => put(doc, l, 40, T + 20 + k * 20, S.words));
    const rows = [["Subtotal", fmtMoney(inv.subtotal), S.cell], ...(Number(inv.discount) > 0 ? [["Discount", `- ${fmtMoney(inv.discount)}`, { ...S.cell, color: C.red }]] : []), ...(Number(inv.tax) > 0 ? [[`Tax (${inv.tax_pct}%)`, fmtMoney(inv.tax), S.cell]] : [])];
    rows.forEach(([k, v, st], i) => { put(doc, k, 466, T + 6 + i * 29.125, S.cellMuted); put(doc, v, 754, T + 6 + i * 29.125, st, "right"); });
    totalBox(doc, "Total", fmtMoney(inv.total), T + rows.length * 29.125 + 8);

    footer(doc, "This is a computer-generated invoice and does not require a signature.");
  });
}

export function salarySlipPdf(s, staff) {
  return render(`Salary slip ${s.month}`, (doc) => {
    header(doc, "Salary Slip", monthLabel(s.month), "Pay period");

    put(doc, "Employee", 40, 174, S.label);
    put(doc, staff.name, 40, 194.25, S.name);
    const leftLines = [cap(staff.role), staff.email].filter(Boolean);
    leftLines.forEach((l, i) => put(doc, l, 40, 220.25 + 16 * i, S.small));
    put(doc, "Details", 754, 174, S.label, "right");
    const paid = s.status === "paid";
    detailLine(doc, "Pay period", monthLabel(s.month), 192);
    detailLine(doc, "Status", paid ? `PAID${s.paid_at ? ` on ${day(s.paid_at)}` : ""}` : "PENDING", 210, { ...S.smallVal, w: 600, color: paid ? C.green : C.amber });
    const top = Math.max(220.25 + 16 * leftLines.length, 192 + 18 * 2 - 2) + 32;

    const gross = Number(s.base) + Number(s.commission) + Number(s.bonus);
    const table = (x0, title, rows, totalLabel, totalValue) => {
      rect(doc, x0, top, 345, 36.25, C.champagne);
      put(doc, title, x0 + 12, top + 12, S.th6);
      let ry = top + 36.25;
      rows.forEach(([k, v], i) => {
        if (i % 2) rect(doc, x0, ry, 345, 41.125, C.cream);
        put(doc, k, x0 + 12, ry + 12, S.cellMuted); put(doc, v, x0 + 345 - 12, ry + 12, S.cellMed, "right");
        ry += 41.125;
      });
      goldLine(doc, x0, ry, 345);
      put(doc, totalLabel, x0 + 12, ry + 13, S.cellBold); put(doc, totalValue, x0 + 345 - 12, ry + 13, S.cellBold, "right");
      return ry + 1 + 41.125;
    };
    const b1 = table(40, "Earnings", [["Base salary", fmtMoney(s.base)], ["Sales commission", fmtMoney(s.commission)], ["Bonus", fmtMoney(s.bonus)]], "Gross earnings", fmtMoney(gross));
    const b2 = table(409, "Deductions", [["Total deductions", fmtMoney(s.deductions)]], "Total deductions", fmtMoney(s.deductions));

    const N = Math.max(b1, b2) + 24;
    put(doc, "Net pay in words", 40, N + 2, S.label);
    wrap(doc, rupeesInWords(s.net), 280, S.words).forEach((l, k) => put(doc, l, 40, N + 20 + k * 20, S.words));
    totalBox(doc, "Net pay", fmtMoney(s.net), N + 8);

    footer(doc, "This is a computer-generated slip and does not require a signature.");
  });
}
