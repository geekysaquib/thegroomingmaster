import { Router } from "express";
import nodemailer from "nodemailer";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap, STAFF_ROLES } from "../middleware.js";
import { invoicePdf } from "../lib/pdf.js";

const router = Router();
router.use(requireAuth);

const SELECT = "*, customer:users!invoices_customer_id_fkey(id, name, email, phone), staff:users!invoices_staff_id_fkey(id, name)";
const round = (n) => Math.round(n * 100) / 100;

// Customers can read their own invoices; everything else is staff-only.
router.get("/", wrap(async (req, res) => {
  let q = supabase.from("invoices").select(SELECT).order("created_at", { ascending: false }).limit(500);
  if (req.user.role === "customer") q = q.eq("customer_id", req.user.id);
  else {
    if (req.query.customer_id) q = q.eq("customer_id", req.query.customer_id);
    if (req.query.from) q = q.gte("created_at", req.query.from);
    if (req.query.to) q = q.lt("created_at", req.query.to);
  }
  res.json(unwrap(await q));
}));

router.post("/", requireRole(...STAFF_ROLES), wrap(async (req, res) => {
  const { customer_id, booking_id, staff_id, items, discount = 0, tax_pct = 0, payment_method = "cash" } = req.body;
  if (!customer_id || !Array.isArray(items) || !items.length) return res.status(400).json({ error: "Customer and at least one item are required" });

  const subtotal = round(items.reduce((s, i) => s + Number(i.price) * Number(i.qty || 1), 0));
  const disc = Math.min(Number(discount) || 0, subtotal);
  const tax = round(((subtotal - disc) * Number(tax_pct)) / 100);
  const row = {
    customer_id, booking_id: booking_id || null, staff_id: staff_id || req.user.id,
    items: items.map((i) => ({ name: i.name, price: Number(i.price), qty: Number(i.qty || 1) })),
    subtotal, discount: disc, tax_pct: Number(tax_pct), tax, total: round(subtotal - disc + tax),
    payment_method, created_by: req.user.id,
  };
  const invoice = unwrap(await supabase.from("invoices").insert(row).select(SELECT).single());
  if (booking_id) unwrap(await supabase.from("bookings").update({ status: "completed" }).eq("id", booking_id));
  res.status(201).json(invoice);
}));

async function loadInvoice(req) {
  const inv = unwrap(await supabase.from("invoices").select(SELECT).eq("id", req.params.id).single());
  if (req.user.role === "customer" && inv.customer_id !== req.user.id) {
    const err = new Error("Not allowed"); err.status = 403; throw err;
  }
  return inv;
}

// PDF download / print-friendly receipt.
router.get("/:id/pdf", wrap(async (req, res) => {
  const inv = await loadInvoice(req);
  const pdf = await invoicePdf(inv, inv.customer);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${inv.invoice_no}.pdf"`);
  res.send(pdf);
}));

// E-bill by email, PDF attached.
router.post("/:id/email", requireRole(...STAFF_ROLES), wrap(async (req, res) => {
  const inv = await loadInvoice(req);
  const to = req.body.to || inv.customer?.email;
  if (!to) return res.status(400).json({ error: "This customer has no email address" });
  if (!process.env.SMTP_HOST) return res.status(500).json({ error: "Email is not configured (set SMTP_* in backend/.env)" });

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER, to,
    subject: `Your invoice ${inv.invoice_no} - The Grooming Master`,
    text: `Hi ${inv.customer?.name || ""},\n\nThank you for visiting The Grooming Master. Your invoice ${inv.invoice_no} (total Rs. ${inv.total}) is attached.\n`,
    attachments: [{ filename: `${inv.invoice_no}.pdf`, content: await invoicePdf(inv, inv.customer) }],
  });
  res.json({ ok: true, sent_to: to });
}));

export default router;
