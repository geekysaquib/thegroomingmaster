import { toSalon } from "./salonTime";

// Bookable time slots, driven by the salon hours the admin sets (Settings > Salon hours). Shared by the customer and staff booking pages.
export const DEFAULT_DAY = { open: "10:00", close: "21:00", closed: false };
export const DEFAULT_HOURS = { slot_min: 30, timezone: "Asia/Kolkata", days: Array.from({ length: 7 }, () => DEFAULT_DAY) };
export const toMins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** The instant that is `mins` after midnight on y-m-d as seen in time zone `tz` (so slots match the salon's clock, not the browser's). */
export function zoned(y, m, d, mins, tz) {
  const guess = Date.UTC(y, m - 1, d, Math.floor(mins / 60), mins % 60);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(new Date(guess)).map((x) => [x.type, Number(x.value)]));
  return new Date(guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess));
}

/** Opening hours that apply to a calendar date (YYYY-MM-DD), by its weekday. */
export const dayHours = (dateStr, hours) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return hours.days[new Date(y, m - 1, d).getDay()];
};

/** Bookable start times for a day: every slot_min between that weekday's opening and closing time. Never depends on existing bookings. */
export function slotsFor(dateStr, durationMin, hours = DEFAULT_HOURS) {
  if (!dateStr) return [];
  const out = [];
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = dayHours(dateStr, hours);
  if (day.closed) return out;
  const step = Number(hours.slot_min) || 30;
  for (let mins = toMins(day.open); mins + durationMin <= toMins(day.close); mins += step) {
    const dt = zoned(y, m, d, mins, hours.timezone);
    if (dt > new Date()) out.push(dt);
  }
  return out;
}

/** Today's date in salon time, as YYYY-MM-DD. */
export const salonTodayStr = () => { const d = toSalon(new Date()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
