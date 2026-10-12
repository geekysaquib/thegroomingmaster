import nodemailer from "nodemailer";
import { supabase } from "../supabase.js";
import { getSetting, SALON_TZ } from "./settings.js";
import { logEvent } from "./activity.js";
import { invoicePdf, salarySlipPdf } from "./pdf.js";

const BRAND = "The Grooming Master";

/** SMTP config saved by the admin; falls back to the SMTP_* env vars so existing deployments keep working. */
export async function getSmtp() {
  const saved = await getSetting("smtp");
  if (saved?.host && saved.user && saved.pass) return saved;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.MAIL_FROM };
  }
  return null;
}

function transportFor(cfg) {
  const port = Number(cfg.port || 587);
  return nodemailer.createTransport({
    host: cfg.host, port, secure: cfg.secure ?? port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

// Gmail & co. only send as the authenticated address, so the From address is always the login; only the display name varies.
const fromOf = (cfg) => (cfg.from_name || !cfg.from ? `"${(cfg.from_name || BRAND).replace(/"/g, "")}" <${cfg.user}>` : cfg.from);

/** Throws on failure (used by the "send test email" button and the explicit e-bill action). */
export async function sendMailStrict({ to, subject, text, html, attachments }, cfg) {
  cfg = cfg || (await getSmtp());
  if (!cfg?.host) { const e = new Error("Email is not configured - an admin must set it up under Settings > Email"); e.status = 400; throw e; }
  await transportFor(cfg).sendMail({ from: fromOf(cfg), to, subject, text, html, attachments });
}

/** Master switch (Settings > Email). On unless an admin has turned it off. */
export async function mailEnabled() {
  const s = await getSetting("mail_enabled");
  return s?.enabled !== false;
}

/** Never throws, so a mail problem can't break a booking or an invoice. */
export async function notify(opts) {
  try {
    if (!(await mailEnabled())) return;
    const cfg = await getSmtp();
    if (!cfg?.host || !opts.to || (Array.isArray(opts.to) && !opts.to.length)) return;
    await sendMailStrict(opts, cfg);
  } catch (e) {
    console.error("[mail] failed:", e.message);
    await logEvent({ method: "MAIL", path: String(opts.subject || "").slice(0, 300), status: 500, detail: `to ${[].concat(opts.to).join(", ")}: ${e.message}`.slice(0, 500) });
  }
}

export async function adminEmails() {
  const { data } = await supabase.from("users").select("email").eq("role", "admin").eq("active", true);
  return (data || []).map((u) => u.email).filter(Boolean);
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const when = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: SALON_TZ });
const inr = (n) => `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function layout(title, lines) {
  const body = lines.map((l) => `<p style="margin:0 0 10px">${l}</p>`).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1b1f32">
<div style="color:#b8934a;font-size:20px;font-weight:bold;letter-spacing:1px">THE GROOMING MASTER</div>
<h2 style="font-size:17px;margin:16px 0">${esc(title)}</h2>${body}
<p style="margin-top:20px;font-size:12px;color:#6c7486">This is an automated message from ${BRAND}.</p></div>`;
}
const mail = (to, subject, lines) => ({ to, subject: `${subject} - ${BRAND}`, html: layout(subject, lines), text: lines.join("\n").replace(/<[^>]+>/g, "") });

const STATUS_TEXT = {
  pending: "is awaiting confirmation from the salon", booked: "is confirmed", completed: "has been completed, thank you for visiting",
  cancelled: "has been cancelled", no_show: "was marked as a no-show",
};

function bookingLines(b) {
  const list = b.services || [];
  const svc = list.length > 1
    ? [`<b>Services:</b>`, ...list.map((x) => `&nbsp;&bull; ${esc(x.name)} (${x.duration_min} min, ${inr(x.price)}${x.price_type === "onwards" ? " onwards" : ""})`), `<b>Total:</b> ${esc(b.service?.duration_min)} min, ${inr(b.service?.price)}`]
    : [`<b>Service:</b> ${esc(b.service?.name)}`];
  return [...svc, `<b>When:</b> ${esc(when(b.start_at))}`, b.staff?.name ? `<b>Stylist:</b> ${esc(b.staff.name)}` : null, b.notes ? `<b>Notes:</b> ${esc(b.notes)}` : null].filter(Boolean);
}

/** `b` = the shaped booking (see bookings.js) with customer / staff joins. */
export async function notifyBookingCreated(b) {
  const lines = bookingLines(b);
  const intro = b.status === "pending" ? "We've received your appointment request. The salon will confirm it shortly." : "Your appointment is confirmed.";
  const internal = [...new Set([...(await adminEmails()), b.staff?.email].filter(Boolean))];
  await Promise.all([
    notify(mail(b.customer?.email, b.status === "pending" ? "Appointment request received" : "Appointment confirmed", [`Hi ${esc(b.customer?.name)},`, intro, ...lines])),
    notify(mail(internal, "New booking", [`A booking has been made for ${esc(b.customer?.name)} (${esc(b.customer?.phone || "no phone")}).`, `<b>Status:</b> ${esc(b.status)}`, ...lines])),
  ]);
}

export async function notifyBookingChanged(before, b, actor) {
  const statusChanged = before.status !== b.status;
  const timeChanged = before.start_at !== b.start_at;
  const staffChanged = (before.staff_id || null) !== (b.staff_id || null);
  if (!statusChanged && !timeChanged && !staffChanged) return;
  const subject = statusChanged ? `Booking ${b.status.replace("_", " ")}` : timeChanged ? "Booking rescheduled" : "Stylist assigned";
  const lines = bookingLines(b);
  const what = statusChanged ? `Your appointment ${STATUS_TEXT[b.status] || `is now ${b.status}`}.` : timeChanged ? "Your appointment has been rescheduled." : "A stylist has been assigned to your appointment.";
  const internal = [...new Set([b.staff?.email, ...(actor?.role === "customer" ? await adminEmails() : [])].filter(Boolean))];
  await Promise.all([
    notify(mail(b.customer?.email, subject, [`Hi ${esc(b.customer?.name)},`, what, ...lines])),
    notify(mail(internal, subject, [`Booking for ${esc(b.customer?.name)} was updated${actor?.name ? ` by ${esc(actor.name)}` : ""}.`, ...lines])),
  ]);
}

export async function notifyInvoice(inv) {
  const pdf = await invoicePdf(inv, inv.customer);
  const lines = [`<b>Invoice:</b> ${esc(inv.invoice_no)}`, `<b>Total:</b> ${inr(inv.total)}`, `<b>Payment:</b> ${esc(inv.payment_method)}`];
  const attachments = [{ filename: `${inv.invoice_no}.pdf`, content: pdf }];
  const internal = [...new Set([...(await adminEmails()), inv.staff?.email].filter(Boolean))];
  await Promise.all([
    notify({ ...mail(inv.customer?.email, `Your e-bill ${inv.invoice_no}`, [`Hi ${esc(inv.customer?.name)},`, "Thank you for visiting. Your e-bill is attached.", ...lines]), attachments }),
    notify({ ...mail(internal, `Invoice ${inv.invoice_no} generated`, [`An invoice was generated for ${esc(inv.customer?.name)}.`, ...lines]), attachments }),
  ]);
}

export async function notifySalaryPaid(slip) {
  const pdf = await salarySlipPdf(slip, slip.staff);
  await notify({ ...mail(slip.staff?.email, `Salary slip ${slip.month}`, [`Hi ${esc(slip.staff?.name)},`, `Your salary for ${esc(slip.month)} (net ${inr(slip.net)}) has been marked as paid. The slip is attached.`]), attachments: [{ filename: `salary-${slip.month}.pdf`, content: pdf }] });
}

export async function notifyStaffWelcome(staff, password) {
  const shift = staff.shift_start && staff.shift_end ? [`<b>Your shift:</b> ${esc(staff.shift_start)} - ${esc(staff.shift_end)}`] : [];
  await notify(mail(staff.email, "Your staff account", [`Hi ${esc(staff.name)},`, `An account has been created for you as <b>${esc(staff.role)}</b>.`, `<b>Login:</b> ${esc(staff.email)}`, `<b>Temporary password:</b> ${esc(password)} (please change it after signing in)`, ...shift]));
}
