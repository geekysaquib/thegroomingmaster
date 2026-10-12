import { supabase, unwrap } from "../supabase.js";

export const SALON_TZ = process.env.SALON_TZ || "Asia/Kolkata";
export const DEFAULT_HOURS = { open: "10:00", close: "21:00", slot_min: 30 };

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const toMins = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export async function getSetting(key, fallback = null) {
  const rows = unwrap(await supabase.from("settings").select("value").eq("key", key));
  return rows[0]?.value ?? fallback;
}

export async function setSetting(key, value) {
  unwrap(await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" }));
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Weekly hours: `days[0..6]` (0 = Sunday, like JS getDay) each `{ open, close, closed }`, plus the slot interval.
 * Older installs saved a single open/close pair; that is applied to every day until the admin saves a weekly schedule.
 */
export async function getHours() {
  const saved = (await getSetting("hours", {})) || {};
  const base = { open: saved.open || DEFAULT_HOURS.open, close: saved.close || DEFAULT_HOURS.close };
  const days = Array.from({ length: 7 }, (_, i) => ({ ...base, closed: false, ...(saved.days?.[i] || {}) }));
  return { slot_min: saved.slot_min || DEFAULT_HOURS.slot_min, days, timezone: SALON_TZ };
}

/** Day of week (0 = Sunday) of `date` in the salon's timezone. */
export function salonDay(date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: SALON_TZ, weekday: "long" }).format(date);
  return DAY_NAMES.indexOf(name);
}

/** Minutes since midnight of `date` in the salon's timezone. */
export function salonMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: SALON_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get("hour") * 60 + get("minute");
}

/** True when [start, end) lies inside a daily window given as 'HH:MM' strings. */
export function withinWindow(start, end, from, to) {
  const s = salonMinutes(start);
  const e = s + Math.round((end - start) / 60000);
  return s >= toMins(from) && e <= toMins(to);
}
