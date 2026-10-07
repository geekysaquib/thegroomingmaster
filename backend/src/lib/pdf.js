import PDFDocument from "pdfkit";

const GOLD = "#b8934a";
const INK = "#1b1f32";
const MUTED = "#6c7486";
const money = (n) => `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function render(build, size = "A4") {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size, margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

function header(doc, title, subtitle) {
  doc.fillColor(GOLD).fontSize(22).font("Helvetica-Bold").text("THE GROOMING MASTER");
  doc.fillColor(MUTED).fontSize(9).font("Helvetica").text("Luxury grooming for him & her");
  doc.moveDown(1.2);
  doc.fillColor(INK).fontSize(16).font("Helvetica-Bold").text(title);
  if (subtitle) doc.fillColor(MUTED).fontSize(10).font("Helvetica").text(subtitle);
  doc.moveDown();
  doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).strokeColor(GOLD).stroke();
  doc.moveDown();
}

function row(doc, label, value, { bold = false } = {}) {
  const y = doc.y;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(bold ? INK : MUTED).fontSize(bold ? 12 : 10);
  doc.text(label, 48, y, { width: 300 });
  doc.fillColor(INK).text(value, 348, y, { width: doc.page.width - 48 - 348, align: "right" });
  doc.moveDown(0.5);
}

export function invoicePdf(inv, customer) {
  return render((doc) => {
    header(doc, `Invoice ${inv.invoice_no}`, new Date(inv.created_at).toLocaleString("en-IN"));
    doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text("Billed to");
    doc.font("Helvetica").fillColor(MUTED).text([customer?.name, customer?.phone, customer?.email].filter(Boolean).join("  |  "));
    doc.moveDown();

    doc.font("Helvetica-Bold").fillColor(INK).fontSize(10);
    const y = doc.y;
    doc.text("Item", 48, y).text("Qty", 330, y, { width: 40, align: "right" }).text("Amount", 400, y, { width: doc.page.width - 48 - 400, align: "right" });
    doc.moveDown(0.4);
    for (const it of inv.items) {
      const ly = doc.y;
      doc.font("Helvetica").fillColor(INK).text(it.name, 48, ly, { width: 270 })
        .text(String(it.qty), 330, ly, { width: 40, align: "right" })
        .text(money(it.price * it.qty), 400, ly, { width: doc.page.width - 48 - 400, align: "right" });
      doc.moveDown(0.4);
    }
    doc.moveDown();
    row(doc, "Subtotal", money(inv.subtotal));
    if (Number(inv.discount) > 0) row(doc, "Discount", `- ${money(inv.discount)}`);
    if (Number(inv.tax) > 0) row(doc, `Tax (${inv.tax_pct}%)`, money(inv.tax));
    row(doc, "Total", money(inv.total), { bold: true });
    row(doc, "Paid via", inv.payment_method.toUpperCase());
    doc.moveDown(2).fillColor(MUTED).fontSize(9).text("Thank you for choosing The Grooming Master. We look forward to seeing you again.", { align: "center" });
  });
}

export function salarySlipPdf(s, staff) {
  return render((doc) => {
    header(doc, "Salary Slip", `Pay period: ${s.month}`);
    doc.fillColor(INK).fontSize(10).font("Helvetica-Bold").text("Employee");
    doc.font("Helvetica").fillColor(MUTED).text(`${staff.name}  |  ${staff.email || ""}  |  ${staff.role}`);
    doc.moveDown();
    doc.font("Helvetica-Bold").fillColor(INK).text("Earnings"); doc.moveDown(0.4);
    row(doc, "Base salary", money(s.base));
    row(doc, "Sales commission", money(s.commission));
    row(doc, "Bonus", money(s.bonus));
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fillColor(INK).text("Deductions"); doc.moveDown(0.4);
    row(doc, "Total deductions", `- ${money(s.deductions)}`);
    doc.moveDown(0.5);
    row(doc, "Net pay", money(s.net), { bold: true });
    row(doc, "Status", s.status === "paid" ? `Paid on ${new Date(s.paid_at).toLocaleDateString("en-IN")}` : "Pending");
    doc.moveDown(3).fillColor(MUTED).fontSize(9).text("This is a computer-generated slip and does not require a signature.", { align: "center" });
  });
}
