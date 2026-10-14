import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Check, CheckCircle2, ChevronLeft, Clock, Scissors, Search, Sparkles } from "lucide-react";
import { publicApi as api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import { SALON, SECTIONS, categoryLabel, money, priceLabel } from "../lib/format";
import { DEFAULT_HOURS, dayHours, salonTodayStr, slotsFor } from "../lib/slots";

// "Scan to book" booking form - what the QR code opens (/scan/booking). Two short steps, no login:
//   1. choose services + a time   2. your details -> confirm.
// Existing customers are recognised by phone / email on the server; new ones are registered on the spot.
// Completely public: no login, no session - it only talks to the public endpoints (services, hours, book).

const STEPS = ["Choose", "Confirm"];
const field = "w-full rounded-md border border-[#d9c79a] bg-white px-3.5 py-3 text-[15px] text-[#1d1710] placeholder:text-[#a09378] outline-none transition focus:border-[#946c14] focus:ring-1 focus:ring-[#946c14]";
const gold = "bg-gold text-[#1a1610] font-semibold shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";

const phoneDigits = (raw) => { let d = String(raw || "").replace(/\D/g, ""); if (d.length === 12 && d.startsWith("91")) d = d.slice(2); else if (d.length === 11 && d.startsWith("0")) d = d.slice(1); return /^[6-9]\d{9}$/.test(d) ? d : null; };
const addDays = (dateStr, n) => { const [y, m, d] = dateStr.split("-").map(Number); const dt = new Date(y, m - 1, d + n); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; };
const dayParts = (dateStr) => { const [y, m, d] = dateStr.split("-").map(Number); const dt = new Date(y, m - 1, d); return { wd: dt.toLocaleDateString("en-IN", { weekday: "short" }), d, mon: dt.toLocaleDateString("en-IN", { month: "short" }) }; };

function Ornament() {
  return (
    <div aria-hidden="true" className="mx-auto flex w-40 items-center gap-3 text-[#a77a1c]">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4a73c]" /><span className="h-1.5 w-1.5 rotate-45 bg-[#d4a73c]" /><span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4a73c]" />
    </div>
  );
}

function Stepper({ step }) {
  return (
    <ol className="mx-auto flex max-w-md items-center justify-between" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${i < step ? "border-[#946c14] bg-[#946c14] text-white" : i === step ? "border-[#946c14] bg-[#fffdf8] text-[#946c14] ring-4 ring-[#d4a73c]/25" : "border-[#d9c79a] bg-[#fffdf8] text-[#a09378]"}`}>
              {i < step ? <Check size={15} /> : i + 1}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${i === step ? "text-[#946c14]" : "text-[#8a7d68]"}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <span className={`mx-2 mb-5 h-px flex-1 ${i < step ? "bg-[#946c14]" : "bg-[#d9c79a]"}`} />}
        </li>
      ))}
    </ol>
  );
}

const Label = ({ children, hint }) => <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5f5342]">{children}{hint && <span className="ml-1.5 font-normal normal-case tracking-normal text-[#8a7d68]">{hint}</span>}</span>;

function icsFor(booking) {
  const z = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Grooming Master//Booking//EN", "BEGIN:VEVENT", `UID:${booking.id}@groomingmaster`, `DTSTAMP:${z(new Date().toISOString())}`, `DTSTART:${z(booking.start_at)}`, `DTEND:${z(booking.end_at)}`,
    `SUMMARY:The Grooming Master: ${booking.services.map((s) => s.name).join(", ")}`.replace(/,/g, "\\,"), `LOCATION:${SALON.address}`.replace(/,/g, "\\,"), "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

export default function ScanBook() {
  const { login } = useAuth(); // used only AFTER a successful booking, to sign the new / returning customer in
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", website: "" });
  const [services, setServices] = useState(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(salonTodayStr());
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    api.get("/services").then((r) => setServices(r.data)).catch((e) => setError(errMsg(e)));
    api.get("/public/hours").then((r) => setHours(r.data)).catch(() => {});
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step, done]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const toggle = (s) => { setSelected((cur) => (cur.some((x) => x.id === s.id) ? cur.filter((x) => x.id !== s.id) : [...cur, s])); setSlot(null); };
  const totalMin = selected.reduce((t, x) => t + x.duration_min, 0);
  const totalPrice = selected.reduce((t, x) => t + Number(x.price), 0);
  const totalLabel = `${money(totalPrice)}${selected.some((x) => x.price_type === "onwards") ? " onwards" : ""}`;

  const today = salonTodayStr();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const slots = useMemo(() => slotsFor(date, totalMin || 30, hours), [date, totalMin, hours]);
  const fmtTime = (d) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: hours.timezone });
  const fmtDay = (d) => d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: hours.timezone });

  const q = search.trim().toLowerCase();
  const list = (services || []).filter((s) => (filter === "all" || s.section === filter) && (!q || `${s.name} ${s.section} ${s.description || ""}`.toLowerCase().includes(q)));
  const sections = SECTIONS.filter((x) => (services || []).some((s) => s.section === x));

  const detailsError = () => {
    if (form.name.trim().length < 2) return "Please enter your name.";
    if (!phoneDigits(form.phone)) return "Please enter a valid 10-digit mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Please enter a valid email address - your account is created with it.";
    if (form.password.length < 8) return "Please choose a password with at least 8 characters.";
    return "";
  };
  const next = () => { setError(""); setStep(1); };
  const back = () => { setError(""); setStep(0); };

  const submit = async () => {
    const problem = detailsError();
    if (problem) { setError(problem); return; }
    setError(""); setBusy(true);
    try {
      const { data } = await api.post("/public/book", {
        name: form.name, phone: form.phone, email: form.email, gender: null, password: form.password,
        service_ids: selected.map((x) => x.id), start_at: slot.toISOString(), notes, website: form.website,
      });
      setDone(data);
      login(form.email.trim(), form.password, "customer").then(() => setSignedIn(true)).catch(() => {}); // lands them in their account; a failure here is harmless
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([icsFor(done.booking)], { type: "text/calendar" }));
    const a = document.createElement("a"); a.href = url; a.download = "appointment.ics"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const compact = step > 0 || !!done; // after the first step the big crest header makes way for the form
  const reset = () => { setDone(null); setStep(0); setSelected([]); setSlot(null); setNotes(""); };

  return (
    <div className="theme-lux min-h-full bg-[#fcf7ea] pb-28 text-[#1d1710]">
      <div aria-hidden="true" className="h-1.5 bg-gold" />
      <header className={`px-5 text-center ${compact ? "pb-3 pt-4" : "pb-5 pt-8"}`}>
        <Link to="/" aria-label="The Grooming Master - home" className="inline-block">
          <img src="/images/brand/crest.png" alt="" className={`mx-auto w-auto drop-shadow-[0_6px_14px_rgba(122,86,20,0.3)] transition-all ${compact ? "h-12" : "h-24"}`} />
        </Link>
        <h1 className={`font-head-lux leading-none text-[#1a1610] ${compact ? "mt-1.5 text-[24px]" : "mt-3 text-[34px]"}`}>The Grooming Master</h1>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#946c14]">Luxury Salon · Mohali</p>
        {!compact && <div className="mt-5"><Ornament /></div>}
      </header>

      <main className="mx-auto w-full max-w-xl px-4">
        {done ? (
          <section className="gold-frame bg-[#fffdf8] px-6 py-9 text-center sm:px-10" role="status">
            <CheckCircle2 className="mx-auto text-[#2f7d57]" size={52} />
            <h2 className="font-head-lux mt-3 text-[30px] leading-tight text-[#1a1610]">You&apos;re all set, {done.customer.name.split(" ")[0]}!</h2>
            <p className="mt-2 text-sm text-[#5f5342]">Your appointment request is in. The salon will confirm it shortly{form.email ? " - we've also emailed you the details" : ""}.</p>
            <div className="mt-6 rounded-md border border-[#e4d2a8] bg-[#fcf7ea] p-4 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#946c14]">When</p>
              <p className="mt-0.5 font-medium">{fmtDay(new Date(done.booking.start_at))}</p>
              <p className="text-sm text-[#5f5342]">{fmtTime(new Date(done.booking.start_at))} – {fmtTime(new Date(done.booking.end_at))}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#946c14]">Services</p>
              <ul className="mt-0.5 space-y-0.5 text-sm">{done.booking.services.map((s, i) => <li key={i} className="flex justify-between gap-3"><span>{s.name}</span><span className="text-[#5f5342]">{money(s.price)}{s.price_type === "onwards" ? "+" : ""}</span></li>)}</ul>
              <p className="mt-2 flex justify-between border-t border-[#e4d2a8] pt-2 text-sm font-semibold"><span>{done.booking.minutes} min</span><span>{money(done.booking.total)}</span></p>
            </div>
            <p className="mt-4 rounded-md bg-[#2f7d57]/10 px-3 py-2 text-sm text-[#2f7d57]">{done.account_created ? "Your account is ready." : "Welcome back - this booking is on your account."} {signedIn ? <>You&apos;re signed in - <Link to="/app/bookings" className="font-semibold underline">view my bookings</Link>.</> : <>Sign in any time to manage your bookings.</>}</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button onClick={download} className="inline-flex items-center justify-center gap-2 rounded-md border border-[#946c14] px-4 py-2.5 text-sm font-semibold text-[#946c14] hover:bg-[#946c14]/10"><CalendarPlus size={16} /> Add to calendar</button>
              <button onClick={reset} className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm ${gold}`}>Book another visit</button>
            </div>
          </section>
        ) : (
          <>
            <Stepper step={step} />
            <section className="gold-frame mt-6 bg-[#fffdf8] px-5 py-7 sm:px-8">
              {error && <div role="alert" className="mb-5 rounded-md border border-[#b03a2e]/40 bg-[#b03a2e]/10 px-3.5 py-2.5 text-sm text-[#b03a2e]">{error}</div>}

              {step === 0 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="font-head-lux text-[28px] leading-tight text-[#1a1610]">Book your visit</h2>
                    <p className="mt-1 text-sm text-[#5f5342]">Choose your services and a time - it takes under a minute.</p>
                  </div>

                  <div>
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f5342]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#946c14] text-[11px] text-white">1</span> Services</p>
                    <div className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a09378]" /><input className={`${field} pl-10`} placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search services" /></div>
                    <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                      {["all", ...sections].map((x) => <button key={x} onClick={() => setFilter(x)} aria-pressed={filter === x} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${filter === x ? "border-[#946c14] bg-[#946c14] text-white" : "border-[#d9c79a] text-[#5f5342] hover:bg-[#f6ecd5]"}`}>{x === "all" ? "All" : x}</button>)}
                    </div>
                    {!services ? <p className="py-10 text-center text-sm text-[#8a7d68]">Loading services…</p> : (
                      <div className="mt-3 max-h-[352px] space-y-2.5 overflow-y-auto pr-1">
                        {list.length === 0 && <p className="py-8 text-center text-sm text-[#8a7d68]">No services match your search.</p>}
                        {list.map((s) => {
                          const on = selected.some((x) => x.id === s.id);
                          return (
                            <button key={s.id} onClick={() => toggle(s)} aria-pressed={on} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition ${on ? "border-[#946c14] bg-[#f6ecd5] ring-1 ring-[#946c14]" : "border-[#e4d2a8] bg-white hover:bg-[#fcf7ea]"}`}>
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${on ? "border-[#946c14] bg-[#946c14] text-white" : "border-[#d9c79a] text-transparent"}`}><Check size={14} /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium leading-snug">{s.name}</span>
                                <span className="mt-0.5 flex items-center gap-1 text-xs text-[#5f5342]"><Clock size={12} /> {s.duration_min} min · {s.section}</span>
                              </span>
                              <span className="shrink-0 text-right text-sm font-semibold">{priceLabel(s)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f5342]"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] text-white ${selected.length ? "bg-[#946c14]" : "bg-[#c9b98f]"}`}>2</span> Day &amp; time</p>
                    {!selected.length ? <p className="rounded-md bg-[#f6ecd5] px-3.5 py-4 text-center text-sm text-[#5f5342]">Choose a service above to see the available times.</p> : (
                      <>
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Choose a date">
                          {days.map((d) => { const p = dayParts(d), closed = dayHours(d, hours).closed, on = d === date; return (
                            <button key={d} disabled={closed} onClick={() => { setDate(d); setSlot(null); }} aria-selected={on} className={`flex w-[58px] shrink-0 flex-col items-center rounded-md border py-2.5 ${on ? "border-[#946c14] bg-[#946c14] text-white" : "border-[#e4d2a8] bg-white hover:bg-[#fcf7ea]"} ${closed ? "cursor-not-allowed opacity-40" : ""}`}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{p.wd}</span><span className="text-xl font-semibold leading-tight">{p.d}</span><span className="text-[10px] opacity-80">{closed ? "Closed" : p.mon}</span>
                            </button>); })}
                        </div>
                        {slots.length === 0 ? <p className="mt-2 rounded-md bg-[#f6ecd5] px-3.5 py-4 text-center text-sm text-[#5f5342]">{dayHours(date, hours).closed ? "We're closed on this day." : "No more slots left on this day."} Please pick another date.</p> : (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {slots.map((s) => <button key={+s} onClick={() => setSlot(s)} aria-pressed={slot && +slot === +s} className={`rounded-md border py-2.5 text-sm font-medium ${slot && +slot === +s ? "border-[#946c14] bg-[#946c14] text-white" : "border-[#e4d2a8] bg-white hover:bg-[#fcf7ea]"}`}>{fmtTime(s)}</button>)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && slot && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-head-lux text-[28px] leading-tight text-[#1a1610]">Almost done</h2>
                    <p className="mt-1 text-sm text-[#5f5342]">Just your details - this creates your account (or signs you in if you already have one).</p>
                  </div>

                  <div className="rounded-md border border-[#e4d2a8] bg-[#fcf7ea] p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3"><Sparkles size={18} className="mt-0.5 shrink-0 text-[#946c14]" /><div><p className="font-semibold">{fmtDay(slot)}</p><p className="text-[#5f5342]">{fmtTime(slot)} · {totalMin} min</p></div></div>
                      <button onClick={back} className="shrink-0 text-xs font-semibold text-[#946c14] underline">Change</button>
                    </div>
                    <div className="mt-3 flex items-start gap-3 border-t border-[#e4d2a8] pt-3"><Scissors size={18} className="mt-0.5 shrink-0 text-[#946c14]" />
                      <div className="w-full"><ul className="space-y-0.5">{selected.map((s) => <li key={s.id} className="flex justify-between gap-3"><span>{s.name}</span><span className="text-[#5f5342]">{priceLabel(s)}</span></li>)}</ul>
                        <p className="mt-2 flex justify-between border-t border-[#e4d2a8] pt-2 font-semibold"><span>Total</span><span>{totalLabel}</span></p></div></div>
                  </div>

                  <label className="block"><Label>Full name</Label><input className={field} autoComplete="name" value={form.name} onChange={set("name")} placeholder="e.g. Aarav Sharma" /></label>
                  <label className="block"><Label>Mobile number</Label><input className={field} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="98765 43210" /></label>
                  <label className="block"><Label hint="(your account login)">Email</Label><input className={field} type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" /></label>
                  {/* honeypot for bots; hidden from people and screen readers */}
                  <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set("website")} className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" />

                  <label className="block"><Label hint="(at least 8 characters)">Password</Label><input className={field} type="password" autoComplete="current-password" value={form.password} onChange={set("password")} />
                    <span className="mt-1.5 block text-xs text-[#5f5342]">New here? Choose a password - it creates your account so you can manage bookings later. Already registered? Enter your password. <a href="/forgot-password" target="_blank" rel="noreferrer" className="font-semibold text-[#946c14] underline">Forgot it?</a></span>
                  </label>

                  <label className="block"><Label hint="(optional)">Anything we should know?</Label><textarea className={field} rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. allergies, preferred stylist…" /></label>
                  <p className="text-xs text-[#8a7d68]">Your request is confirmed once the salon accepts it. Final price is confirmed at the salon.</p>
                </div>
              )}
            </section>
          </>
        )}
        <p className="mt-6 text-center text-xs text-[#8a7d68]">{SALON.address}<br />{SALON.phones.join("  ·  ")}</p>
      </main>

      {/* Sticky action bar */}
      {!done && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#e4d2a8] bg-[#fffdf8]/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {step > 0 && <button onClick={back} aria-label="Back" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#d9c79a] text-[#5f5342] hover:bg-[#f6ecd5]"><ChevronLeft size={20} /></button>}
            {step === 0 && selected.length > 0 && <div className="min-w-0 text-xs leading-tight text-[#5f5342]"><b className="block text-sm text-[#1d1710]">{totalLabel}</b>{selected.length} service{selected.length === 1 ? "" : "s"} · {totalMin} min</div>}
            <button onClick={step === 1 ? submit : next} disabled={busy || (step === 0 && (!selected.length || !slot))} className={`ml-auto h-12 flex-1 rounded-md px-5 text-[15px] ${gold} ${step === 0 && selected.length ? "max-w-[220px]" : ""}`}>
              {step === 1 ? (busy ? "Booking…" : "Confirm booking") : slot ? "Continue" : selected.length ? "Pick a time" : "Choose a service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
