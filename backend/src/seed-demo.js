import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "./supabase.js";

/**
 * Resets the salon's DEMO data and loads a fresh, rule-abiding data set for September + October 2026.
 *
 *   node src/seed-demo.js --yes [--backup-dir <folder>]
 *
 * WIPES: bookings, invoices, salaries, enquiries, activity_log, every customer and every staff member.
 * KEEPS: admin + developer accounts, services (price list), settings (hours / email).
 * A JSON backup of everything it deletes is written first. Safe to re-run. Sends no emails.
 * Every row follows the same rules the API enforces: salon hours, staff shifts, no stylist double-booking,
 * booking <-> invoice links, salary maths (see routes/bookings.js, billing.js, salaries.js).
 */
if (!process.argv.includes("--yes")) { console.error("This deletes data. Re-run with --yes to confirm."); process.exit(1); }
const backupDir = process.argv.includes("--backup-dir") ? process.argv[process.argv.indexOf("--backup-dir") + 1] : path.resolve("backups");

// ---------- helpers ----------
let seed = 20261012;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const round2 = (n) => Math.round(n * 100) / 100;
const IST = 330 * 60000; // salon runs on IST (UTC+5:30)
const at = (y, m, d, mins) => new Date(Date.UTC(y, m - 1, d, 0, mins) - IST); // IST wall-clock -> instant
const toMins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const minsOfDay = (date) => { const l = new Date(date.getTime() + IST); return l.getUTCHours() * 60 + l.getUTCMinutes(); };
const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const now = new Date();

// ---------- 1. back up, then wipe ----------
fs.mkdirSync(backupDir, { recursive: true });
const dump = {};
for (const t of ["users", "bookings", "invoices", "salaries", "enquiries", "activity_log"]) dump[t] = unwrap(await supabase.from(t).select("*").limit(100000));
const file = path.join(backupDir, `salon-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(dump, null, 1));
console.log(`Backup written: ${file}`);

const del = async (t, f) => unwrap(await f(supabase.from(t).delete()));
await del("invoices", (q) => q.not("id", "is", null));
await del("salaries", (q) => q.not("id", "is", null));
await del("bookings", (q) => q.not("id", "is", null));
await del("enquiries", (q) => q.not("id", "is", null));
await del("activity_log", (q) => q.not("id", "is", null));
await del("users", (q) => q.in("role", ["customer", "staff"]));
console.log("Cleared bookings, invoices, salaries, enquiries, activity log, customers and staff (admin + developer kept).");

// ---------- 2. reference data ----------
const services = unwrap(await supabase.from("services").select("id, name, price, price_type, duration_min, category").eq("active", true));
if (!services.length) throw new Error("No active services found - load the price list first.");
const admin = unwrap(await supabase.from("users").select("id, name, base_salary, commission_pct").eq("role", "admin").eq("active", true).limit(1))[0];
const settings = Object.fromEntries(unwrap(await supabase.from("settings").select("key, value")).map((r) => [r.key, r.value]));
const hoursDays = Array.from({ length: 7 }, (_, i) => ({ open: "10:00", close: "21:00", closed: false, ...(settings.hours?.days?.[i] || {}) }));
const STEP = Number(settings.hours?.slot_min) || 30;
// Does the bookings table have the multi-service `items` column yet? (supabase/update_booking_items.sql)
const hasItems = !(await supabase.from("bookings").select("items").limit(1)).error;
console.log(hasItems ? "Multi-service bookings: ON" : "Multi-service bookings: OFF (run supabase/update_booking_items.sql, then re-run this seed to get them)");

// ---------- 3. people ----------
const STAFF_PW = "Staff@12345", CUSTOMER_PW = "Customer@123";
const staffHash = await bcrypt.hash(STAFF_PW, 10), customerHash = await bcrypt.hash(CUSTOMER_PW, 10);
const staffSeed = [
  ["Meera Joshi", "meera.joshi", "9814021101", 24000, 10, "10:00", "19:00"],
  ["Karan Patel", "karan.patel", "9814021102", 22000, 8, "11:00", "20:00"],
  ["Anjali Verma", "anjali.verma", "9814021103", 20000, 8, "10:00", "18:00"],
  ["Rahul Sharma", "rahul.sharma", "9814021104", 21000, 7.5, "12:00", "21:00"],
  ["Simran Kaur", "simran.kaur", "9814021105", 18000, 6, "10:00", "19:00"],
];
const staff = unwrap(await supabase.from("users").insert(staffSeed.map(([name, e, phone, base_salary, commission_pct, shift_start, shift_end]) => ({
  name, email: `${e}@groomingmaster.in`, phone, role: "staff", base_salary, commission_pct, shift_start, shift_end, password_hash: staffHash, created_at: at(2026, 8, 20, 600).toISOString(),
}))).select("id, name, base_salary, commission_pct, shift_start, shift_end"));

const FIRST = { male: ["Aarav", "Vivaan", "Aditya", "Rohan", "Arjun", "Karthik", "Siddharth", "Harpreet", "Gurpreet", "Vikram", "Nikhil", "Manish", "Ravi", "Sahil", "Tarun"], female: ["Priya", "Sneha", "Ananya", "Isha", "Kavya", "Riya", "Neha", "Pooja", "Simran", "Divya", "Meghna", "Tanvi", "Aditi", "Harleen", "Jasleen"] };
const LAST = ["Sharma", "Verma", "Singh", "Kaur", "Gill", "Mehta", "Nair", "Kapoor", "Bansal", "Chopra", "Malhotra", "Arora", "Sethi", "Bhatia", "Grewal", "Joshi", "Das", "Khanna"];
const usedNames = new Set();
const customers = [];
for (let i = 0; i < 32; i++) {
  const gender = i % 5 === 4 ? "female" : i % 2 ? "female" : "male";
  let name; do { name = `${pick(FIRST[gender])} ${pick(LAST)}`; } while (usedNames.has(name));
  usedNames.add(name);
  const hasAccount = i % 4 !== 3; // every 4th is a walk-in profile created by staff
  const joined = at(2026, 8, int(1, 31), int(600, 1200)); // joined in August..., so Sept/Oct data is history for them
  if (i >= 22) joined.setTime(at(2026, 9 + (i >= 28 ? 1 : 0), int(1, i >= 28 ? 11 : 28), int(600, 1200)).getTime()); // some are new in Sept / Oct
  const slug = name.toLowerCase().replace(/[^a-z]+/g, ".");
  customers.push({
    name, gender, phone: `${pick(["98", "97", "99", "88", "70", "62"])}${String(int(10000000, 99999999))}`,
    email: hasAccount || chance(0.5) ? `${slug}${i}@example.com` : null,
    password_hash: hasAccount ? customerHash : null, role: "customer", active: i !== 6, created_at: joined.toISOString(),
  });
}
const customerRows = unwrap(await supabase.from("users").insert(customers).select("id, name, email, gender, active, password_hash, created_at"));
const blocked = customerRows.find((c) => !c.active);

// ---------- 4. bookings (Sep 1 -> Oct 31, 2026) ----------
const stylistBusy = Object.fromEntries(staff.map((s) => [s.id, []])); // [start, end) ms of non-cancelled bookings
const free = (s, a, b) => !stylistBusy[s.id].some(([x, y]) => a < y && b > x);
const inShift = (s, startMins, endMins) => startMins >= toMins(s.shift_start) && endMins <= toMins(s.shift_end);
const eligible = (c) => services.filter((s) => s.category === "unisex" || s.category === c.gender);

const bookings = [];
const customerBusy = {}; // customer id -> [[start, end)] so nobody is in two places at once
const custFree = (c, a, b) => !(customerBusy[c.id] || []).some(([x, y]) => a < y && b > x);
const NOTES = ["Please keep it a trim, not too short", "Allergic to ammonia", "Running 5 mins late", "Wedding next week - styling advice please", "First visit", "Prefers a quiet chair", null, null, null, null, null];

function makeBooking(day, customer) {
  const [y, m, d] = day;
  const win = hoursDays[dow(y, m, d)];
  if (win.closed) return null;
  const count = chance(0.55) ? 1 : chance(0.65) ? 2 : 3;
  const chosen = []; const pool = eligible(customer);
  while (chosen.length < count) { const s = pick(pool); if (!chosen.includes(s)) chosen.push(s); }
  if (!hasItems) chosen.length = 1;
  const total = chosen.reduce((t, s) => t + s.duration_min, 0);
  const open = toMins(win.open), close = toMins(win.close);
  for (let attempt = 0; attempt < 40; attempt++) {
    const slots = Math.floor((close - open - total) / STEP);
    if (slots < 0) return null;
    const startMins = open + int(0, slots) * STEP;
    const start = at(y, m, d, startMins), end = new Date(start.getTime() + total * 60000);
    const fits = staff.filter((s) => inShift(s, startMins, startMins + total) && free(s, +start, +end));
    if (!fits.length || !custFree(customer, +start, +end)) continue;
    return { start, end, startMins, total, chosen, fits };
  }
  return null;
}

const days = [];
for (let dd = 0; dd < 61; dd++) { const dt = new Date(Date.UTC(2026, 8, 1 + dd)); days.push([dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()]); }
for (const day of days) {
  const [y, m, d] = day;
  const isFuture = at(y, m, d, 23 * 60 + 59) > now;
  const wk = dow(y, m, d);
  const base = wk === 0 || wk === 6 ? 6 : 4;
  const target = isFuture && at(y, m, d, 0) > now ? int(1, 3) + (m === 10 && d <= 20 ? 1 : 0) : base + int(-1, 2);
  for (let k = 0; k < target; k++) {
    const walkIn = chance(0.35);
    const dayInPast = at(y, m, d, 23 * 60 + 59) < now;
    // a blocked customer only has history, never upcoming bookings
    const pool = customerRows.filter((c) => (c.active || dayInPast) && new Date(c.created_at) <= at(y, m, d, 600));
    const cust = pick(pool);
    const b = makeBooking(day, cust);
    if (!b) continue;
    const past = b.end < now; // only a visit that has finished can be completed / no-show
    const online = !walkIn && !!cust.password_hash; // only customers with an account can book online
    let status;
    if (past) status = chance(0.84) ? "completed" : chance(0.6) ? "cancelled" : "no_show";
    else status = online && chance(0.45) ? "pending" : "booked";
    const staffMember = status === "pending" || (status === "cancelled" && chance(0.4)) ? null : pick(b.fits);
    if (staffMember && status !== "cancelled") stylistBusy[staffMember.id].push([+b.start, +b.end]);
    let createdAt = online ? new Date(Math.min(+now, +b.start - int(2, 72) * 3600000)) : new Date(Math.min(+now, +b.start - int(1, 6) * 3600000));
    if (createdAt < new Date(cust.created_at)) createdAt = new Date(Math.min(+b.start, +new Date(cust.created_at) + 60000)); // never booked before the profile existed
    (customerBusy[cust.id] ||= []).push([+b.start, +b.end]);
    const row = {
      customer_id: cust.id, staff_id: staffMember?.id || null, service_id: b.chosen[0].id, start_at: b.start.toISOString(), end_at: b.end.toISOString(),
      status, notes: pick(NOTES), created_by: online ? cust.id : pick([admin.id, ...staff.map((s) => s.id)]), created_at: createdAt.toISOString(),
    };
    if (hasItems) row.items = b.chosen.map((s) => ({ service_id: s.id, name: s.name, price: Number(s.price), price_type: s.price_type, duration_min: s.duration_min }));
    bookings.push({ row, chosen: b.chosen, cust, staffMember });
  }
}
// A blocked customer has only history (no upcoming bookings).
const insertedB = [];
for (let i = 0; i < bookings.length; i += 100) insertedB.push(...unwrap(await supabase.from("bookings").insert(bookings.slice(i, i + 100).map((b) => b.row)).select("id, start_at, customer_id, status, staff_id")));
const idOf = new Map(insertedB.map((r) => [`${r.customer_id}|${+new Date(r.start_at)}`, r.id]));
console.log(`Bookings: ${insertedB.length}`);

// ---------- 5. invoices (one per completed booking + a few counter sales) ----------
const invoices = [];
const PAY = ["cash", "cash", "upi", "upi", "upi", "card", "card", "other"];
for (const b of bookings) {
  if (b.row.status !== "completed") continue;
  const items = b.chosen.map((s) => ({ name: s.name, price: Number(s.price), qty: 1 }));
  const subtotal = round2(items.reduce((t, i) => t + i.price * i.qty, 0));
  const discount = chance(0.2) ? Math.min(round2(subtotal * pick([0.05, 0.1])), subtotal) : 0;
  const tax_pct = chance(0.3) ? 18 : 0;
  const tax = round2(((subtotal - discount) * tax_pct) / 100);
  const createdAt = new Date(Math.min(+now, +new Date(b.row.end_at) + int(3, 25) * 60000));
  invoices.push({
    customer_id: b.cust.id, booking_id: idOf.get(`${b.row.customer_id}|${+new Date(b.row.start_at)}`) || null,
    staff_id: b.staffMember.id, items, subtotal, discount: round2(discount), tax_pct, tax, total: round2(subtotal - discount + tax),
    payment_method: pick(PAY), created_by: pick([admin.id, b.staffMember.id]), created_at: createdAt.toISOString(),
  });
}
for (let i = 0; i < 6; i++) { // retail / counter sales with no booking
  const c = pick(customerRows.filter((x) => x.active)), s = pick(staff);
  const items = [{ name: pick(["Argan Hair Oil", "Hair Serum", "Beard Oil", "Shampoo 250ml", "Hair Mask"]), price: pick([450, 550, 650, 850]), qty: pick([1, 1, 2]) }];
  const subtotal = round2(items.reduce((t, x) => t + x.price * x.qty, 0)), tax = round2(subtotal * 0.18);
  const dt = at(2026, i < 3 ? 9 : 10, int(2, i < 3 ? 28 : 11), int(660, 1140));
  invoices.push({ customer_id: c.id, booking_id: null, staff_id: s.id, items, subtotal, discount: 0, tax_pct: 18, tax, total: round2(subtotal + tax), payment_method: pick(PAY), created_by: admin.id, created_at: dt.toISOString() });
}
invoices.sort((a, b) => a.created_at.localeCompare(b.created_at)); // invoice numbers (GM-xxxx) are issued in insert order
const missingLinks = invoices.filter((i) => i.booking_id === null).length - 6;
for (let i = 0; i < invoices.length; i += 100) unwrap(await supabase.from("invoices").insert(invoices.slice(i, i + 100)));
console.log(`Invoices: ${invoices.length} (${missingLinks === 0 ? "all linked to bookings" : `${missingLinks} unlinked`})`);

// ---------- 6. salaries: September paid, October pending (same maths as routes/salaries.js, UTC month ranges) ----------
const monthRange = (month) => { const [y, m] = month.split("-").map(Number); return [new Date(Date.UTC(y, m - 1, 1)).toISOString(), new Date(Date.UTC(y, m, 1)).toISOString()]; };
const salaries = [];
for (const month of ["2026-09", "2026-10"]) {
  const [from, to] = monthRange(month);
  for (const s of [admin, ...staff]) {
    const sales = invoices.filter((i) => i.staff_id === s.id && i.created_at >= from && i.created_at < to).reduce((t, i) => t + i.total, 0);
    const base = Number(s.base_salary || 0), commission = round2((sales * Number(s.commission_pct || 0)) / 100);
    const paid = month === "2026-09";
    const bonus = paid && s.id !== admin.id && chance(0.5) ? pick([500, 1000, 1500]) : 0;
    const deductions = paid && s.id !== admin.id && chance(0.25) ? pick([300, 500]) : 0;
    salaries.push({ staff_id: s.id, month, base, commission, bonus, deductions, net: round2(base + commission + bonus - deductions), status: paid ? "paid" : "pending", paid_at: paid ? at(2026, 10, int(1, 5), 660).toISOString() : null });
  }
}
unwrap(await supabase.from("salaries").insert(salaries));
console.log(`Salary slips: ${salaries.length}`);

// ---------- 7. website enquiries ----------
const enquiries = [
  ["Harleen Gill", "harleen.gill@example.com", "9876501234", "Do you do bridal packages? Wedding is in December.", "contact", true, "2026-09-03"],
  ["Mohit Arora", null, "9876512345", "Need an appointment for a haircut and beard styling this Saturday.", "appointment", true, "2026-09-12"],
  ["Pallavi Rao", "pallavi.rao@example.com", null, "What are the prices for global hair colour?", "contact", true, "2026-09-18"],
  ["Gagan Bedi", "gagan.bedi@example.com", "9876523456", "Please call me back about hair spa options.", "contact", false, "2026-10-02"],
  ["Ishita Jain", null, "9876534567", "Looking to book a facial for two people on Friday evening.", "appointment", false, "2026-10-08"],
  ["Navjot Singh", "navjot.singh@example.com", "9876545678", "Do you sell the argan hair oil in store?", "contact", false, "2026-10-11"],
].map(([name, email, phone, message, source, handled, date]) => ({ name, email, phone, message, source, handled, created_at: at(...date.split("-").map(Number), int(600, 1200)).toISOString() }));
unwrap(await supabase.from("enquiries").insert(enquiries));
console.log(`Enquiries: ${enquiries.length}`);

// ---------- 8. self-check against the API's rules ----------
const all = unwrap(await supabase.from("bookings").select("id, staff_id, start_at, end_at, status, customer_id").limit(100000));
const problems = [];
for (const b of all) {
  const s = +new Date(b.start_at), e = +new Date(b.end_at);
  const win = hoursDays[new Date(s + IST).getUTCDay()];
  const sm = minsOfDay(new Date(s));
  if (win.closed || sm < toMins(win.open) || sm + (e - s) / 60000 > toMins(win.close)) problems.push(`outside salon hours: ${b.id}`);
  if (b.staff_id) { const st = staff.find((x) => x.id === b.staff_id); if (st && !inShift(st, sm, sm + (e - s) / 60000)) problems.push(`outside shift: ${b.id}`); }
  if (blocked && b.customer_id === blocked.id && b.status === "booked" && new Date(b.start_at) > now) problems.push(`future booking for blocked customer: ${b.id}`);
}
for (const st of staff) {
  const mine = all.filter((b) => b.staff_id === st.id && (b.status === "booked" || b.status === "completed" || b.status === "no_show" || b.status === "pending")).sort((a, b) => a.start_at.localeCompare(b.start_at));
  for (let i = 1; i < mine.length; i++) if (mine[i].start_at < mine[i - 1].end_at) problems.push(`stylist overlap: ${st.name} ${mine[i].start_at}`);
}
console.log(problems.length ? `PROBLEMS:\n${problems.slice(0, 20).join("\n")}` : "Self-check passed: all bookings inside salon hours and stylist shifts, no stylist double-booking.");
console.log(`\nLogins -> staff: <name>@groomingmaster.in / ${STAFF_PW}   customers (with account): their email / ${CUSTOMER_PW}`);
