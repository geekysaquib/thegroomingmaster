import { SALON_TZ } from "./settings.js";
import { BRAND_IMAGE, BRAND_IMAGE_SIZE } from "./mail-brand.js";

// HTML email building blocks in the site's look: ivory paper, antique-gold rules, near-black ink, serif headings.
// Email clients ignore <style>/web fonts/flex, so everything is table layout + inline styles + safe font stacks.

export const BRAND = "The Grooming Master";
export const SALON = {
  address: "SCO 19, First Floor, Sector 89, Mohali, Sahibzada Ajit Singh Nagar",
  phones: ["8146647128", "8146756377"],
  instagram: "@thegroomingmastersalon", instagramUrl: "https://instagram.com/thegroomingmastersalon",
};
const C = { page: "#f3ede0", paper: "#fffdf8", ink: "#1d1710", royal: "#1a1610", muted: "#5f5342", faint: "#8a7d68", gold: "#946c14", gold2: "#d4a73c", rule: "#eadfc4", cream: "#fcf7ea", champagne: "#f6ecd5", pale: "#f8ecc8" };
// Web fonts load in Apple Mail / iOS / some Outlooks (see the <link> in layout()); Gmail and others fall back along the stack. Headings use
// weight 500 so a fallback serif (Palatino / Georgia) renders as light "regular" rather than a heavy faux-bold.
const BODY = "'Inter Tight',Inter,'Helvetica Neue',Helvetica,Arial,sans-serif", HEAD = "'Cormorant Garamond','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";

export const siteUrl = () => String(process.env.SITE_URL || process.env.URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(n || 0));
export const dateLong = (iso) => new Date(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: SALON_TZ });
export const timeShort = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: SALON_TZ });
export const whenText = (start, end) => `${dateLong(start)}, ${timeShort(start)}${end ? ` – ${timeShort(end)}` : ""}`;
export const firstName = (n) => String(n || "there").trim().split(/\s+/)[0];

/** The header lockup (crest + name + tagline) is a pre-rendered image so it looks identical in every mail client. Add to every message. */
export const BRAND_ATTACHMENT = { filename: "brand.png", content: BRAND_IMAGE, cid: "brand", contentType: "image/png" };

const BADGES = {
  pending: ["Awaiting confirmation", "#fdf1d8", "#946c14"], booked: ["Confirmed", "#e3f1ea", "#2f7d57"], completed: ["Completed", "#dff0ee", "#1f7a6e"],
  cancelled: ["Cancelled", "#f8e3e0", "#b03a2e"], no_show: ["No-show", "#fde8d2", "#b8661b"], rescheduled: ["New time", "#e8eefa", "#2c5aa0"],
  paid: ["Paid", "#e3f1ea", "#2f7d57"], security: ["Security", "#e8eefa", "#2c5aa0"], success: ["All set", "#e3f1ea", "#2f7d57"], info: ["Update", "#f6ecd5", "#946c14"], account: ["Welcome", "#f6ecd5", "#946c14"],
};
export const badge = (kind) => { const [label, bg, fg] = BADGES[kind] || BADGES.info; return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${bg};color:${fg};font:700 11px/1 ${BODY};letter-spacing:1.4px;text-transform:uppercase">${esc(label)}</span>`; };

export const button = (label, url) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px"><tr><td style="background:${C.royal};border-radius:2px"><a href="${esc(url)}" style="display:inline-block;padding:13px 30px;color:${C.pale};font:600 14px/1 ${BODY};letter-spacing:.6px;text-decoration:none">${esc(label)}</a></td></tr></table>`;

const label = (s) => `<div style="font:700 10px/1.2 ${BODY};letter-spacing:2px;text-transform:uppercase;color:${C.gold};margin-bottom:6px">${esc(s)}</div>`;
export const paragraph = (html) => `<p style="margin:0 0 14px;font:400 15px/1.65 ${BODY};color:${C.muted}">${html}</p>`;

/** Label / value rows inside a cream card with a gold edge. `rows`: [[label, htmlValue], ...] (falsy rows are skipped). */
export function card(rows) {
  const body = rows.filter(Boolean).map(([k, v]) => `<tr><td style="padding:7px 0;width:34%;vertical-align:top;font:700 10px/1.5 ${BODY};letter-spacing:1.6px;text-transform:uppercase;color:${C.faint}">${esc(k)}</td><td style="padding:7px 0;vertical-align:top;font:500 14px/1.5 ${BODY};color:${C.ink}">${v}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:${C.cream};border:1px solid ${C.rule};border-left:4px solid ${C.gold2}"><tr><td style="padding:14px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`;
}

/** Booking summary: services (with minutes + price when several), when, stylist, notes. `oldStart` shows the previous time struck through. */
export function bookingCard(b, { oldStart } = {}) {
  const services = b.services?.length ? b.services : [{ name: b.service?.name, price: b.service?.price, duration_min: b.service?.duration_min }];
  const svc = services.length > 1
    ? `${services.map((x) => `${esc(x.name)} <span style="color:${C.faint}">· ${esc(x.duration_min)} min · ${inr(x.price)}</span>`).join("<br>")}<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${C.rule};font-weight:700">Total ${esc(b.service?.duration_min)} min · ${inr(b.service?.price)}</div>`
    : `${esc(services[0].name)} <span style="color:${C.faint}">· ${esc(services[0].duration_min)} min · ${inr(services[0].price)}</span>`;
  const when = `<strong>${esc(whenText(b.start_at, b.end_at))}</strong>${oldStart ? `<div style="margin-top:3px;font-weight:400;color:${C.faint};text-decoration:line-through">${esc(whenText(oldStart))}</div>` : ""}`;
  return card([[services.length > 1 ? "Services" : "Service", svc], ["When", when], b.staff?.name && ["Stylist", esc(b.staff.name)], b.notes && ["Notes", esc(b.notes)]]);
}

/** Itemised receipt (the same figures as the A4 invoice). */
export function receiptTable(inv) {
  const th = (s, a = "left") => `<th align="${a}" style="padding:9px 10px;font:700 10px/1.2 ${BODY};letter-spacing:1.4px;text-transform:uppercase;color:#4a3f30;background:${C.champagne}">${s}</th>`;
  const rows = inv.items.map((it, i) => `<tr style="background:${i % 2 ? C.cream : C.paper}"><td style="padding:11px 10px;font:500 14px/1.4 ${BODY};color:${C.ink}">${esc(it.name)}</td><td align="right" style="padding:11px 10px;font:400 14px/1.4 ${BODY};color:${C.ink}">${esc(it.qty)}</td><td align="right" style="padding:11px 10px;font:500 14px/1.4 ${BODY};color:${C.ink}">${inr(it.price * it.qty)}</td></tr>`).join("");
  const line = (k, v, color = C.muted) => `<tr><td style="padding:5px 0;font:400 14px/1.4 ${BODY};color:${C.muted}">${esc(k)}</td><td align="right" style="padding:5px 0;font:400 14px/1.4 ${BODY};color:${color}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-bottom:2px solid ${C.gold2}"><tr>${th("Item")}${th("Qty", "right")}${th("Amount", "right")}</tr>${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr><td width="40%"></td><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${line("Subtotal", inr(inv.subtotal), C.ink)}${Number(inv.discount) > 0 ? line("Discount", `- ${inr(inv.discount)}`, "#b03a2e") : ""}${Number(inv.tax) > 0 ? line(`Tax (${inv.tax_pct}%)`, inr(inv.tax), C.ink) : ""}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:${C.champagne};border:1px solid ${C.gold2}"><tr><td style="padding:13px 16px;font:700 10px/1 ${BODY};letter-spacing:2px;text-transform:uppercase;color:${C.gold}">Total</td><td align="right" style="padding:11px 16px;font:500 28px/1 ${HEAD};color:${C.royal}">${inr(inv.total)}</td></tr></table>
</td></tr></table>`;
}

/**
 * The full message. `title` is the serif headline; `body` is HTML built from the helpers above; `cta` = [label, url] (optional).
 * `preheader` is the grey preview text shown next to the subject in inboxes.
 */
export function layout({ preheader = "", status, title, body, cta, note }) {
  const rule = `<div style="height:2px;background:${C.gold2};line-height:2px;font-size:0">&nbsp;</div><div style="height:1px;background:#e7d49a;margin-top:3px;line-height:1px;font-size:0">&nbsp;</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page}">${esc(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};border:1px solid #e6d9b8">
 <tr><td style="padding:30px 36px 0">
  <img src="cid:brand" width="${BRAND_IMAGE_SIZE.width}" height="${BRAND_IMAGE_SIZE.height}" alt="${BRAND} - Luxury Salon, Mohali" style="display:block;width:${BRAND_IMAGE_SIZE.width}px;max-width:100%;height:auto;border:0">
  <div style="margin-top:22px">${rule}</div>
 </td></tr>
 <tr><td style="padding:30px 36px 8px">
  ${status ? `<div style="margin-bottom:14px">${badge(status)}</div>` : ""}
  <h1 style="margin:0 0 18px;font:500 32px/1.2 ${HEAD};letter-spacing:.2px;color:${C.royal}">${esc(title)}</h1>
  ${body}
  ${cta ? button(cta[0], cta[1]) : ""}
  ${note ? `<p style="margin:22px 0 0;font:400 12px/1.6 ${BODY};color:${C.faint}">${note}</p>` : ""}
 </td></tr>
 <tr><td style="padding:26px 36px 30px">
  <div style="height:1px;background:${C.rule};line-height:1px;font-size:0">&nbsp;</div>
  <div style="padding-top:18px;text-align:center;font:italic 500 22px/1.3 ${HEAD};color:${C.gold}">Look good, feel great!</div>
  <div style="margin-top:10px;text-align:center;font:400 12px/1.7 ${BODY};color:${C.muted}">${esc(SALON.address)}<br>${SALON.phones.map((p) => `<a href="tel:${esc(p)}" style="color:${C.muted};text-decoration:none">${esc(p)}</a>`).join(" &nbsp;·&nbsp; ")} &nbsp;·&nbsp; <a href="${esc(SALON.instagramUrl)}" style="color:${C.gold};text-decoration:none">${esc(SALON.instagram)}</a></div>
  <div style="margin-top:12px;text-align:center;font:400 11px/1.6 ${BODY};color:${C.faint}">This is an automated message from ${BRAND}. Please don't reply to this email.</div>
 </td></tr>
</table></td></tr></table></body></html>`;
}

/** Plain-text twin of a message (for clients that don't render HTML). */
export function plain(title, lines, cta) {
  return [BRAND.toUpperCase(), "", title, "", ...lines.filter((l) => l !== null && l !== undefined && l !== false), ...(cta ? ["", `${cta[0]}: ${cta[1]}`] : []), "", "--", SALON.address, SALON.phones.join(" | ")].join("\n");
}

/** Calendar invite (.ics) for a confirmed booking so it can be saved to the customer's phone calendar. */
export function bookingIcs(b) {
  const z = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const t = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${BRAND}//Booking//EN`, "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${b.id}@groomingmaster`, `DTSTAMP:${z(new Date().toISOString())}`, `DTSTART:${z(b.start_at)}`, `DTEND:${z(b.end_at)}`,
    `SUMMARY:${t(`${BRAND}: ${b.service?.name || "Appointment"}`)}`, `LOCATION:${t(`${BRAND}, ${SALON.address}`)}`, `DESCRIPTION:${t(`${b.services?.map((x) => x.name).join(", ") || ""}${b.staff?.name ? ` with ${b.staff.name}` : ""}`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
