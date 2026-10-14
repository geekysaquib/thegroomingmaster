import "dotenv/config";
import express from "express";
import cors from "cors";
import auth from "./routes/auth.js";
import services from "./routes/services.js";
import customers from "./routes/customers.js";
import bookings from "./routes/bookings.js";
import billing from "./routes/billing.js";
import salaries from "./routes/salaries.js";
import staff from "./routes/staff.js";
import analytics from "./routes/analytics.js";
import contact from "./routes/contact.js";
import settings from "./routes/settings.js";
import dev from "./routes/dev.js";
import publicRoutes from "./routes/public.js";
import { activityLogger } from "./lib/activity.js";
import { errorHandler, wrap } from "./middleware.js";
import { supabase, unwrap } from "./supabase.js";
import { readInvoiceCode } from "./lib/shortlink.js";
import { invoicePdf } from "./lib/pdf.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
// 3 MB: a 2 MB profile picture grows by ~33% once base64-encoded.
app.use(express.json({ limit: "3mb" }));

app.use(activityLogger);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api/services", services);
app.use("/api/customers", customers);
app.use("/api/bookings", bookings);
app.use("/api/invoices", billing);
app.use("/api/salaries", salaries);
app.use("/api/staff", staff);
app.use("/api/analytics", analytics);
app.use("/api/contact", contact);
app.use("/api/settings", settings);
app.use("/api/dev", dev);
app.use("/api/public", publicRoutes);

// Public short link to an invoice PDF, shared on WhatsApp: /i/<code>. Signed + expiring, no login needed.
app.get("/i/:code", wrap(async (req, res) => {
  const link = readInvoiceCode(req.params.code);
  if (!link) return res.status(404).send("Invoice link not found.");
  if (link.expired) return res.status(410).send("This invoice link has expired. Please ask the salon to send it again.");
  const inv = unwrap(await supabase.from("invoices").select("*, customer:users!invoices_customer_id_fkey(id, name, email, phone)").eq("id", link.id).single());
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${inv.invoice_no}.pdf"`);
  res.send(await invoicePdf(inv, inv.customer));
}));

app.use(errorHandler);

export default app;
