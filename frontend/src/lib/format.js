export const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));

export const moneyExact = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(n || 0));

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Local datetime-local input value (YYYY-MM-DDTHH:mm) */
export const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const categoryLabel = { male: "For Him", female: "For Her", unisex: "For Everyone" };

export const SALON = {
  phones: ["8146647128", "8146756377"],
  address: "SCO 19, First Floor, Sector 89, Mohali, Sahibzada Ajit Singh Nagar",
  instagram: "@thegroomingmastersalon",
  instagramUrl: "https://instagram.com/thegroomingmastersalon",
  tagline: "Look good, feel great!",
};

export const rs = (n) => `Rs ${Number(n || 0).toLocaleString("en-IN")}`;
/** "Rs 1,000 onwards" for variable-priced services, plain "Rs 80" otherwise. */
export const priceLabel = (s) => (s.price_type === "onwards" ? `${rs(s.price)} onwards` : rs(s.price));
export const SECTIONS = ["Hair Care", "Hair Services", "Bleach", "Waxing", "Grooming", "Male Grooming"];

// Assumed opening hours (matches the booking slots, 10:00-21:00). Change here if the salon differs.
SALON.hours = "Mon – Sun: 10:00 AM – 9:00 PM";
SALON.mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("The Grooming Master, SCO 19, Sector 89, Mohali");
