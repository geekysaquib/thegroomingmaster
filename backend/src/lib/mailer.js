import nodemailer from "nodemailer";
import { supabase } from "../supabase.js";
import { getSetting } from "./settings.js";
import { logEvent } from "./activity.js";
import { invoicePdf, salarySlipPdf } from "./pdf.js";
import { makeInvoiceCode } from "./shortlink.js";
import { BRAND, BRAND_ATTACHMENT, bookingCard, bookingIcs, card, dateLong, esc, firstName, inr, layout, paragraph, plain, receiptTable, siteUrl, timeShort, whenText } from "./emailTemplates.js";

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
  if (process.env.MAIL_DRY_RUN) { console.log(`[mail dry-run] to=${[].concat(to).join(",")} subject="${subject}"
${text}
`); return; } // local testing: print, don't send
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

/** One message: HTML + plain-text twin + the inline crest (+ any extra attachments). */
function compose({ to, subject, preheader, status, title, body, cta, note, lines, attachments = [] }) {
  return {
    to, subject: `${subject} - ${BRAND}`,
    html: layout({ preheader: preheader || title, status, title, body, cta, note }),
    text: plain(title, lines || [], cta),
    attachments: [BRAND_ATTACHMENT, ...attachments],
  };
}

// ---------- bookings ----------
const serviceNames = (b) => (b.services?.length ? b.services.map((x) => x.name).join(", ") : b.service?.name);
const bookingText = (b, oldStart) => [`Services: ${serviceNames(b)}`, `When: ${whenText(b.start_at, b.end_at)}${oldStart ? ` (was ${whenText(oldStart)})` : ""}`, b.staff?.name ? `Stylist: ${b.staff.name}` : null, b.notes ? `Notes: ${b.notes}` : null];
const invite = (b) => (b.status === "booked" ? [{ filename: "appointment.ics", content: bookingIcs(b), contentType: "text/calendar; method=PUBLISH" }] : []);
const myBookings = () => ["View my bookings", `${siteUrl()}/app/bookings`];
const bookAgain = () => ["Book again", `${siteUrl()}/app/book`];

/** Customer-facing copy for each booking status / change. `oldStart` = the previous time when it moved. */
export function customerBookingEmail(b, kind, { oldStart } = {}) {
  const hi = `Hi ${esc(firstName(b.customer?.name))},`;
  const card1 = bookingCard(b, { oldStart });
  const to = b.customer?.email;
  const lines = bookingText(b, oldStart);
  const common = { to, attachments: invite(b), lines: [`Hi ${firstName(b.customer?.name)},`, ...lines] };
  switch (kind) {
    case "pending":
      return compose({ ...common, attachments: [], subject: "We've received your appointment request", status: "pending", title: "Request received", preheader: "We'll confirm your appointment shortly.",
        body: `${paragraph(`${hi}<br>Thank you for choosing us. We've received your request and the salon will confirm it shortly - you'll get another email as soon as it's done.`)}${card1}`, cta: myBookings() });
    case "booked":
      return compose({ ...common, subject: oldStart ? "Your appointment is confirmed for a new time" : "Your appointment is confirmed", status: "booked", title: oldStart ? "Confirmed - at a new time" : "You're booked in", preheader: whenText(b.start_at),
        body: `${paragraph(`${hi}<br>${oldStart ? "Your appointment is confirmed, but the salon has moved it to a new time." : "Your appointment is confirmed. We look forward to seeing you."} A calendar invite is attached so you can save it to your phone.`)}${card1}`,
        cta: myBookings(), note: "Need to change plans? Please cancel from My Bookings or call us so someone else can take the slot." });
    case "rescheduled":
      return compose({ ...common, subject: "Your appointment has a new time", status: "rescheduled", title: "A new time for your visit", preheader: `Now ${whenText(b.start_at)}`,
        body: `${paragraph(`${hi}<br>The salon has moved your appointment. Your new time is shown below${b.status === "booked" ? " and a calendar invite is attached" : ""}.`)}${card1}`, cta: myBookings(), note: "If this time doesn't suit you, please cancel from My Bookings and book another slot." });
    case "cancelled":
      return compose({ ...common, attachments: [], subject: "Your appointment has been cancelled", status: "cancelled", title: "Appointment cancelled", preheader: "Your appointment has been cancelled.",
        body: `${paragraph(`${hi}<br>Your appointment has been cancelled. Here's what was booked:`)}${card1}${paragraph("We'd love to see you another time - you can book a new slot whenever you like.")}`, cta: bookAgain() });
    case "completed":
      return compose({ ...common, attachments: [], subject: "Thank you for visiting", status: "completed", title: `Thank you, ${firstName(b.customer?.name)}`, preheader: "We hope you loved your visit.",
        body: `${paragraph(`${hi}<br>Thank you for visiting The Grooming Master. We hope you loved your visit! Your e-bill will reach you separately.`)}${card1}`, cta: bookAgain() });
    case "no_show":
      return compose({ ...common, attachments: [], subject: "We missed you", status: "no_show", title: "We missed you", preheader: "Your appointment was marked as a no-show.",
        body: `${paragraph(`${hi}<br>We didn't see you at your appointment, so it was marked as a no-show. If something came up, no problem - just book a new time.`)}${card1}`, cta: bookAgain() });
    case "assigned":
      return compose({ ...common, subject: "Your stylist is confirmed", status: "info", title: `${b.staff?.name || "Your stylist"} will look after you`, preheader: `Your stylist: ${b.staff?.name || ""}`,
        body: `${paragraph(`${hi}<br>A stylist has been assigned to your appointment.`)}${card1}`, cta: myBookings() });
    default: return null;
  }
}

/** Salon-side copy (admins + the assigned stylist): who, what, when, plus a link to the calendar. */
export function internalBookingEmail(to, b, { headline, status, subject }) {
  const c = b.customer || {};
  const who = card([["Customer", `<strong>${esc(c.name)}</strong>`], c.phone && ["Phone", esc(c.phone)], c.email && ["Email", esc(c.email)]]);
  return compose({ to, subject, status, title: headline, preheader: `${c.name || "Customer"} · ${whenText(b.start_at)}`,
    body: `${who}${bookingCard(b)}`, cta: ["Open the calendar", `${siteUrl()}/salon/calendar`],
    lines: [`Customer: ${c.name}${c.phone ? ` (${c.phone})` : ""}`, ...bookingText(b)] });
}

/** `b` = the shaped booking (see bookings.js) with customer / staff / service joins. */
export async function notifyBookingCreated(b) {
  const internal = [...new Set([...(await adminEmails()), b.staff?.email].filter(Boolean))];
  await Promise.all([
    notify(customerBookingEmail(b, b.status === "pending" ? "pending" : "booked")),
    notify(internalBookingEmail(internal, b, { headline: b.status === "pending" ? "New booking request" : "New booking", status: b.status === "pending" ? "pending" : "booked", subject: `New booking - ${b.customer?.name || ""}` })),
  ]);
}

export async function notifyBookingChanged(before, b, actor) {
  const statusChanged = before.status !== b.status;
  const timeChanged = before.start_at !== b.start_at;
  const staffChanged = (before.staff_id || null) !== (b.staff_id || null);
  if (!statusChanged && !timeChanged && !staffChanged) return;
  const kind = statusChanged ? b.status : timeChanged ? "rescheduled" : "assigned";
  const oldStart = timeChanged ? before.start_at : undefined;
  const byCustomer = actor?.role === "customer";
  const internal = [...new Set([b.staff?.email, ...(byCustomer ? await adminEmails() : [])].filter(Boolean))];
  const headline = statusChanged && b.status === "cancelled" && byCustomer ? "Booking cancelled by the customer"
    : statusChanged ? `Booking ${b.status === "booked" ? "confirmed" : b.status.replace("_", " ")}` : timeChanged ? "Booking moved to a new time" : "Stylist assigned";
  await Promise.all([
    notify(customerBookingEmail(b, kind, { oldStart })),
    notify(internalBookingEmail(internal, b, { headline, status: statusChanged ? b.status : timeChanged ? "rescheduled" : "info", subject: `${headline} - ${b.customer?.name || ""}` })),
  ]);
}

// ---------- invoices ----------
/** The customer's e-bill: itemised receipt in the body, A4 PDF attached, link to the PDF. Also used by the manual "Email e-bill" button. */
export async function invoiceEmail(inv, to) {
  const c = inv.customer || {};
  const pdf = await invoicePdf(inv, c);
  const link = `${siteUrl()}/i/${makeInvoiceCode(inv.id)}`;
  const rows = card([["Invoice", `<strong>${esc(inv.invoice_no)}</strong>`], ["Date", esc(`${dateLong(inv.created_at)}, ${timeShort(inv.created_at)}`)], ["Paid via", esc(String(inv.payment_method).toUpperCase())], inv.staff?.name && ["Served by", esc(inv.staff.name)]]);
  return compose({
    to: to || c.email, subject: `Your e-bill ${inv.invoice_no}`, status: "paid", title: `Thank you, ${firstName(c.name)}`, preheader: `Invoice ${inv.invoice_no} · ${inr(inv.total)}`,
    body: `${paragraph(`Hi ${esc(firstName(c.name))},<br>Thank you for visiting The Grooming Master. Here is your e-bill - the A4 invoice is attached as a PDF.`)}${rows}${receiptTable(inv)}`,
    cta: ["Download invoice (PDF)", link], attachments: [{ filename: `${inv.invoice_no}.pdf`, content: pdf }],
    lines: [`Invoice ${inv.invoice_no} - ${inr(inv.total)} (paid via ${inv.payment_method})`, ...inv.items.map((i) => `- ${i.name} x${i.qty}: ${inr(i.price * i.qty)}`)],
  });
}

export async function notifyInvoice(inv) {
  const internal = [...new Set([...(await adminEmails()), inv.staff?.email].filter(Boolean))];
  const c = inv.customer || {};
  const pdf = await invoicePdf(inv, c);
  const summary = compose({
    to: internal, subject: `Invoice ${inv.invoice_no} generated`, status: "paid", title: `Invoice ${inv.invoice_no} generated`, preheader: `${c.name || "Customer"} · ${inr(inv.total)}`,
    body: `${card([["Customer", `<strong>${esc(c.name)}</strong>`], c.phone && ["Phone", esc(c.phone)], ["Paid via", esc(String(inv.payment_method).toUpperCase())], inv.staff?.name && ["Served by", esc(inv.staff.name)]])}${receiptTable(inv)}`,
    cta: ["Open billing", `${siteUrl()}/salon/billing`], attachments: [{ filename: `${inv.invoice_no}.pdf`, content: pdf }],
    lines: [`Customer: ${c.name}`, `Total: ${inr(inv.total)} (paid via ${inv.payment_method})`],
  });
  await Promise.all([c.email ? invoiceEmail(inv).then(notify) : null, notify(summary)]);
}

// ---------- team ----------
const monthName = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }); };

export async function notifySalaryPaid(slip) {
  const s = slip.staff || {};
  const pdf = await salarySlipPdf(slip, s);
  const gross = Number(slip.base) + Number(slip.commission) + Number(slip.bonus);
  const body = `${paragraph(`Hi ${esc(firstName(s.name))},<br>Your salary for <strong>${esc(monthName(slip.month))}</strong> has been paid. Your salary slip is attached as a PDF.`)}${card([["Base salary", inr(slip.base)], ["Sales commission", inr(slip.commission)], ["Bonus", inr(slip.bonus)], ["Gross earnings", `<strong>${inr(gross)}</strong>`], ["Deductions", `<span style="color:#b03a2e">- ${inr(slip.deductions)}</span>`], ["Net pay", `<strong style="font-size:17px">${inr(slip.net)}</strong>`]])}`;
  await notify(compose({ to: s.email, subject: `Salary slip - ${monthName(slip.month)}`, status: "paid", title: "Your salary has been paid", preheader: `${monthName(slip.month)} · net ${inr(slip.net)}`, body, attachments: [{ filename: `salary-${slip.month}.pdf`, content: pdf }],
    lines: [`Salary for ${monthName(slip.month)}: net ${inr(slip.net)} (gross ${inr(gross)}, deductions ${inr(slip.deductions)})`] }));
}

export async function notifyStaffWelcome(staff, password) {
  const shift = staff.shift_start && staff.shift_end ? [["Your shift", `${esc(staff.shift_start)} – ${esc(staff.shift_end)}`]] : [];
  const url = `${siteUrl()}/salon-login`;
  await notify(compose({
    to: staff.email, subject: "Your staff account", status: "account", title: `Welcome to the team, ${firstName(staff.name)}`, preheader: "Your sign-in details for The Grooming Master.",
    body: `${paragraph(`Hi ${esc(firstName(staff.name))},<br>An account has been created for you at The Grooming Master as <strong>${esc(staff.role)}</strong>. Use the details below to sign in.`)}${card([["Sign in with", esc(staff.email)], ["Temporary password", `<span style="font-family:Consolas,Menlo,monospace;background:#f6ecd5;padding:2px 8px;border-radius:3px">${esc(password)}</span>`], ...shift])}`,
    cta: ["Sign in", url], note: "Please change your password after signing in for the first time.",
    lines: [`Sign in: ${staff.email}`, `Temporary password: ${password}`, ...(shift.length ? [`Shift: ${staff.shift_start} - ${staff.shift_end}`] : [])],
  }));
}

/**
 * Security emails (password reset / changed) are sent even while the admin's "pause emails" switch is off - a locked-out user
 * must still be able to get back in. They still need SMTP to be configured. Never throws.
 */
async function sendSecurity(msg) {
  try {
    const cfg = await getSmtp();
    if (!cfg?.host) { console.warn("[mail] password email not sent: SMTP is not configured"); return false; }
    await sendMailStrict(msg, cfg);
    return true;
  } catch (e) {
    console.error("[mail] security email failed:", e.message);
    await logEvent({ method: "MAIL", path: String(msg.subject || "").slice(0, 300), status: 500, detail: e.message.slice(0, 500) });
    return false;
  }
}

export function passwordResetEmail(user, url) {
  return compose({
    to: user.email, subject: "Reset your password", status: "security", title: "Reset your password", preheader: "Use this link within 1 hour to choose a new password.",
    body: `${paragraph(`Hi ${esc(firstName(user.name))},<br>We received a request to reset the password for your account. Press the button below to choose a new one. The link works for <strong>1 hour</strong> and can be used once.`)}`,
    cta: ["Choose a new password", url],
    note: `If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;color:#946c14">${esc(url)}</span><br><br>Didn't ask for this? You can safely ignore this email - your password stays the same.`,
    lines: ["We received a request to reset your password. The link works for 1 hour and can be used once.", "If you didn't ask for this, ignore this email."],
  });
}
export const sendPasswordReset = (user, url) => sendSecurity(passwordResetEmail(user, url));

export function passwordChangedEmail(user) {
  return compose({
    to: user.email, subject: "Your password was changed", status: "security", title: "Password changed", preheader: "Your password has just been changed.",
    body: paragraph(`Hi ${esc(firstName(user.name))},<br>The password for your account was just changed. You can now sign in with the new password.<br><br>If this wasn't you, please contact the salon straight away.`),
    cta: ["Sign in", `${siteUrl()}/${user.role === "customer" ? "login" : "salon-login"}`],
    lines: ["The password for your account was just changed. If this wasn't you, contact the salon straight away."],
  });
}
export const sendPasswordChanged = (user) => sendSecurity(passwordChangedEmail(user));

/** The message sent by Settings > Email > "Send test". */
export function testEmail(to) {
  return compose({
    to, subject: "Email test", status: "success", title: "Your email settings work", preheader: "This is a test message.",
    body: `${paragraph("This is a test message from your salon console. Bookings, status changes, e-bills, invoices, salary slips and new staff accounts will now be delivered to your customers and team in this style.")}${card([["Sent", esc(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: process.env.SALON_TZ || "Asia/Kolkata" }))]])}`,
    lines: ["Your email settings work."],
  });
}

