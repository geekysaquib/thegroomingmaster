// The salon runs on one clock (India time) no matter where the browser is. The calendar, dashboard and booking forms use
// these helpers so a booking at 8 PM salon time sits in the 8 PM row even when the PC is set to another time zone.
export const SALON_TZ = "Asia/Kolkata";

const parts = new Intl.DateTimeFormat("en-US", { timeZone: SALON_TZ, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
const read = (d) => Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, Number(x.value)]));

/** A Date whose *local* getters (getHours(), getDate()...) return the salon's wall-clock time for that instant. */
export function toSalon(input) {
  const p = read(new Date(input));
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Inverse of toSalon: reads the local getters as salon wall-clock time and returns the real instant. */
export function fromSalon(local) {
  const guess = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds());
  const p = read(new Date(guess));
  return new Date(guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess));
}
