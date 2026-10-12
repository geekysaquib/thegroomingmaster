import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MapPin, Phone, Play, Scissors, Sparkles, X } from "lucide-react";
import { api } from "../lib/api";
import { SALON, SECTIONS, rs } from "../lib/format";
import { useAuth } from "../lib/auth";
import SiteLayout, { InstagramIcon } from "../components/site/SiteLayout";
import EnquiryForm from "../components/site/EnquiryForm";
import { Btn, Container, Heading, Img, SectionTag } from "../components/site/parts";

const Section = ({ id, className = "", children }) => <section id={id} className={`scroll-mt-28 py-20 sm:py-28 ${className}`}><Container>{children}</Container></section>;

function useSalonData() {
  const [services, setServices] = useState(null);
  useEffect(() => { api.get("/services").then((r) => setServices(r.data)).catch(() => setServices([])); }, []);
  return useMemo(() => {
    const list = services || [];
    const bySection = {};
    for (const s of list) (bySection[s.section] ||= []).push(s);
    return { loaded: services !== null, list, bySection, count: list.length };
  }, [services]);
}

/* ------------------------------------------------------------------ Hero */
function Hero({ data, book }) {
  const stats = [["4", "Disciplines: hair, skin, makeup, nails"], [data.count ? `${data.count}+` : "50+", "Salon services"], ["7 days", "Open every week"]];
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <img src="/images/brand/hero.jpg" alt="The Grooming Master salon interior with arched gold-lit mirrors" fetchpriority="high" className="kenburns h-full w-full object-cover object-[60%_50%]" style={{ filter: "saturate(1.12) contrast(1.05) brightness(1.04)" }} />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#fcf7ea] via-[#fcf7ea]/85 to-[#fcf7ea]/25 lg:bg-gradient-to-r lg:from-[#fcf7ea]/96 lg:via-[#fcf7ea]/55 lg:to-transparent" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,rgba(243,220,148,0.35),transparent_55%)]" />
      <Container className="flex min-h-[640px] items-end py-14 md:min-h-[720px] md:items-center lg:min-h-[min(calc(100svh-124px),860px)]">
        <div className="rise max-w-2xl">
          <img src="/images/brand/crest.png" alt="" className="mb-5 h-24 w-auto drop-shadow-[0_6px_14px_rgba(122,86,20,0.35)] sm:h-28" />
          <SectionTag>Luxury Salon · Mohali</SectionTag>
          <Heading as="h1" className="!text-[56px] !leading-[0.98] sm:!text-[96px]">Hair, crafted<br />with <em>royal</em> care.</Heading>
          <p className="mt-7 max-w-lg text-[18px] leading-relaxed text-ink-secondary">Master stylists, a golden-lit studio and a consultation before every cut, colour and finish. Experience luxury hair in the heart of Mohali.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Btn as={Link} to={book}>Book appointment</Btn>
            <Btn as="a" href="#services" variant="outline" arrow={false}>Explore hair services</Btn>
          </div>
          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-accent/30 pt-7">
            {stats.map(([n, l]) => (
              <div key={l}><dt className="font-head-lux text-4xl text-accent">{n}</dt><dd className="mt-1 text-[11px] uppercase leading-snug tracking-[0.14em] text-ink-secondary">{l}</dd></div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

const MARQUEE = ["Precision Cuts", "Colour & Balayage", "Keratin & Smoothing", "Bridal Hair", "Hair Spa", "Blow-dry & Styling", "Men's Grooming", "Skin", "Makeup", "Nails"];
function Marquee() {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div className="overflow-hidden border-y border-[#a77a1c]/40 bg-gold py-3.5" aria-hidden="true">
      <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.28em] text-[#3d2905]">
        {row.map((m, i) => <span key={i} className="flex items-center gap-10">{m}<Sparkles size={12} /></span>)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Intro */
const STEPS = [
  ["01", "Consultation", "We study your hair, face shape and lifestyle before a single cut is made."],
  ["02", "Signature design", "Cut, colour or style crafted by a master stylist for the look you want."],
  ["03", "Finish & care", "A polished finish and honest advice to keep your hair glowing at home."],
];
function Intro({ book }) {
  return (
    <Section id="about">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <SectionTag>The experience</SectionTag>
          <Heading>Luxury you can <em>feel</em>, hair you can <em>see</em>.</Heading>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed">Step into a studio of arched mirrors, warm gold light and crystal chandeliers. Every detail is designed so your visit feels as good as the result.</p>
          <ol className="mt-9 space-y-6">
            {STEPS.map(([n, t, d]) => (
              <li key={n} className="flex gap-5">
                <span className="font-head-lux text-3xl text-gold">{n}</span>
                <div><h3 className="font-head-lux text-2xl text-ink-primary">{t}</h3><p className="mt-1 max-w-md text-[15px] leading-relaxed">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-10"><Btn as={Link} to={book}>Reserve your chair</Btn></div>
        </div>
        <div className="relative">
          <div className="gold-frame rounded-[200px_200px_24px_24px] bg-surface-0 p-3">
            <Img name="brand/salon-2.jpg" pos="40% 50%" alt="Styling stations with golden-lit arched mirrors" className="aspect-[4/5] rounded-[190px_190px_14px_14px] [&_img]:[filter:saturate(1.1)_contrast(1.04)]" />
          </div>
          <div className="absolute -bottom-6 left-2 rounded-2xl border border-[#d4a73c]/60 bg-surface-0 px-6 py-4 shadow-[0_20px_40px_-20px_rgba(122,86,20,0.5)] sm:left-8">
            <div className="font-head-lux text-4xl text-gold">1-to-1</div>
            <div className="text-[11px] uppercase tracking-[0.16em]">Consultation every visit</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Hair services */
const HAIR_SERVICES = [
  { title: "Precision Cuts & Styling", img: "home/g-blowdry.jpg", text: "Layered cuts, blow-dries and finishes shaped to your face." },
  { title: "Colour & Balayage", img: "home/g-balayage.jpg", text: "Honey balayage, global colour and glossy, lasting tones." },
  { title: "Keratin & Smoothing", img: "home/ritual.jpg", pos: "50% 30%", text: "Keratin, botox and smoothing for frizz-free, mirror shine." },
  { title: "Bridal & Occasion", img: "home/g-bridal.jpg", pos: "50% 25%", text: "Updos and styling that photograph beautifully all day." },
  { title: "Curls & Texture", img: "home/g-curls.jpg", pos: "50% 20%", text: "Definition, bounce and care for natural curls and waves." },
  { title: "Men's Grooming", img: "home/g-fade.jpg", text: "Sharp fades, haircuts and beard sculpting." },
];
function HairServices({ book }) {
  return (
    <Section id="services" className="bg-surface-1">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <div className="ornament mb-5 text-[11px] font-medium uppercase tracking-[0.28em]">Signature hair services</div>
        <Heading>An atelier for <em>every strand</em></Heading>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {HAIR_SERVICES.map((c) => (
          <Link key={c.title} to={book} className="group relative isolate flex min-h-[320px] flex-col justify-end overflow-hidden rounded-t-[140px] rounded-b-2xl border border-[#d4a73c]/50 p-5 sm:min-h-[440px] sm:p-7">
            <Img name={c.img} pos={c.pos} alt="" className="absolute inset-0 -z-10 [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#14110c]/90 via-[#14110c]/25 to-transparent" />
            <h3 className="font-head-lux text-[22px] leading-tight text-[#fff4d6] sm:text-[34px]">{c.title}</h3>
            <p className="mt-2 hidden text-[14px] leading-relaxed text-white/85 sm:block">{c.text}</p>
            <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f3dc94]">Book this →</span>
          </Link>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[12px] font-medium uppercase tracking-[0.24em] text-accent">
        <span>Also at The Grooming Master</span>
        {["Skin", "Makeup", "Nail"].map((x) => <span key={x} className="rounded-full border border-accent/40 px-5 py-2">{x}</span>)}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Price menu */
function PriceMenu({ data, book }) {
  const names = useMemo(() => [...SECTIONS.filter((n) => data.bySection[n]), ...Object.keys(data.bySection).filter((n) => !SECTIONS.includes(n))], [data.bySection]);
  const [tab, setTab] = useState(null);
  const active = tab && names.includes(tab) ? tab : names[0];
  const items = useMemo(() => {
    const list = data.bySection[active] || [];
    const row = (s, name) => ({ key: s.id, name, price: s.price, onwards: s.price_type === "onwards" });
    if (active !== "Waxing") return list.map((s) => row(s, s.name));
    // Waxing comes in Basic and Rica ranges; the homepage lists the Basic price.
    return list.flatMap((s) => { const m = s.name.match(/^(.*) \((Basic|Rica)\)$/); return !m ? [row(s, s.name)] : m[2] === "Basic" ? [row(s, m[1])] : []; });
  }, [data.bySection, active]);

  return (
    <Section id="menu">
      <div className="lux-dark relative overflow-hidden rounded-3xl border border-[#d4a73c]/70 bg-gradient-to-br from-[#1d1810] to-[#0f0d09] p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] sm:p-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div><SectionTag>Price menu</SectionTag><Heading>The <em>service</em> menu</Heading></div>
          <Btn as={Link} to={book}>Book appointment</Btn>
        </div>
        {!data.loaded ? <p>Loading our menu…</p> : data.count === 0 ? <p>Our menu is being updated - please call us for prices.</p> : (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-14">
            <div role="tablist" aria-label="Service categories" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:divide-y lg:divide-border lg:overflow-visible">
              {names.map((n) => (
                <button key={n} role="tab" aria-selected={n === active} onClick={() => setTab(n)}
                  className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-left text-[13px] font-medium uppercase tracking-[0.14em] transition-colors lg:rounded-none lg:border-0 lg:px-0 lg:py-4 ${n === active ? "border-accent bg-accent text-[#14110c] lg:bg-transparent lg:text-accent" : "border-border text-ink-secondary hover:text-accent"}`}>
                  {n}
                </button>
              ))}
            </div>
            <ul className="grid content-start gap-x-12 md:grid-cols-2">
              {items.map((s) => (
                <li key={s.key} className="flex items-baseline gap-3 border-b border-border py-3.5">
                  <span className="text-[16px] text-ink-primary">{s.name}</span>
                  <span className="min-w-3 flex-1 border-b border-dotted border-accent/40" />
                  <span className="whitespace-nowrap font-head-lux text-[22px] text-accent">{rs(s.price)}{s.onwards && <span className="ml-1 font-sans text-[11px] text-ink-muted">onwards</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-8 text-sm">Prices marked “onwards” start at the amount shown. Waxing is shown in our Basic range; ask about Rica, our premium wax.</p>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Space */
function Space() {
  return (
    <section className="bg-surface-1 py-20 sm:py-28">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div><SectionTag>The space</SectionTag><Heading>Gold light, <em>quiet</em> luxury</Heading></div>
          <p className="max-w-sm">Crystal chandeliers, arched mirrors and plush seating, made for a calm, unhurried visit.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:gap-6">
          <Img name="brand/hero.jpg" pos="50% 50%" alt="Salon interior" className="aspect-[4/3] rounded-2xl border border-[#d4a73c]/50 md:aspect-auto md:min-h-[460px] [&_img]:[filter:saturate(1.1)_contrast(1.04)]" />
          <div className="grid gap-4 md:gap-6">
            <Img name="brand/salon-2.jpg" pos="30% 50%" alt="Reception and styling stations" className="aspect-[16/10] rounded-2xl border border-[#d4a73c]/50 [&_img]:[filter:saturate(1.1)_contrast(1.04)]" />
            <div className="flex items-center justify-center rounded-2xl border border-[#d4a73c]/50 bg-surface-0 p-8 text-center">
              <img src="/images/brand/logo-full.png" alt="The Grooming Master - Luxury Salon" className="max-h-60 w-auto" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ Stylist */
const SPECIALITIES = ["Precision cuts & styling", "Colour, balayage & highlights", "Keratin, botox & smoothing", "Bridal & occasion hair", "Men's haircuts & beard grooming"];
function Stylist({ book }) {
  return (
    <Section id="stylist">
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 -z-10 rounded-[220px_220px_28px_28px] bg-gradient-to-b from-[#f3dc94]/60 to-transparent" />
          <div className="gold-frame rounded-[220px_220px_24px_24px] bg-surface-0 p-3">
            <Img name="brand/stylist.jpg" pos="50% 25%" alt="Master stylist holding a golden comb and scissors" className="aspect-[3/4] rounded-[210px_210px_14px_14px] [&_img]:[filter:saturate(1.08)_contrast(1.06)_brightness(1.03)]" />
          </div>
          <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-gold px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3d2905] shadow-lg"><Scissors size={14} /> Master Stylist</div>
        </div>
        <div>
          <SectionTag>Meet your stylist</SectionTag>
          <Heading>Skilled hands, <em>refined</em> artistry</Heading>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed">Our stylist works with a golden comb, steady scissors and a keen eye for detail. Every look begins with listening, and ends with a finish you will want to show off.</p>
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {SPECIALITIES.map((x) => <li key={x} className="flex items-center gap-3 py-3.5 text-[16px] text-ink-primary"><Scissors size={16} className="shrink-0 text-accent" />{x}</li>)}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <Btn as={Link} to={book}>Book with our stylist</Btn>
            <Btn as="a" href="#menu" variant="outline" arrow={false}>See price menu</Btn>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Video gallery */
// Drop the salon's video files in frontend/public/videos/ with these names (mp4, h264). A tile whose file
// is missing shows a "Coming soon" badge and is not clickable; nothing else needs to change once it's added.
const VIDEOS = [
  { src: "/videos/salon-tour.mp4", poster: "brand/hero.jpg", title: "Inside The Grooming Master", sub: "A walk through our studio", cls: "aspect-[4/3] sm:col-span-2 sm:aspect-video lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[480px]" },
  { src: "/videos/hair-styling.mp4", poster: "home/g-blowdry.jpg", title: "Hair styling", sub: "Blow-dry & finish", cls: "aspect-[4/5] sm:aspect-[3/4] lg:aspect-auto lg:row-span-2" },
  { src: "/videos/stylist-at-work.mp4", poster: "brand/stylist.jpg", title: "Stylist at work", sub: "Precision & detail", cls: "aspect-[4/5] sm:aspect-[3/4] lg:aspect-auto lg:row-span-2" },
];

function useVideoExists(src) {
  const [ok, setOk] = useState(null);
  useEffect(() => {
    let live = true;
    // The dev server answers unknown paths with index.html, so check the content type, not just the status.
    fetch(src, { method: "HEAD" }).then((r) => live && setOk(r.ok && (r.headers.get("content-type") || "").startsWith("video"))).catch(() => live && setOk(false));
    return () => { live = false; };
  }, [src]);
  return ok;
}

function VideoTile({ v, onOpen }) {
  const ok = useVideoExists(v.src);
  return (
    <button onClick={() => ok && onOpen(v)} disabled={!ok} aria-label={ok ? `Play video: ${v.title}` : `${v.title} (coming soon)`}
      className={`group relative isolate overflow-hidden rounded-2xl border border-[#d4a73c]/60 text-left disabled:cursor-default ${v.cls}`}>
      <Img name={v.poster} alt="" className="absolute inset-0 -z-10 [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105 [&_img]:[filter:saturate(1.1)_contrast(1.04)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#14110c]/85 via-transparent to-transparent" />
      <span className="absolute left-1/2 top-[38%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 sm:top-1/2 items-center justify-center rounded-full bg-gold text-[#3d2905] shadow-xl transition-transform group-hover:scale-110 sm:h-20 sm:w-20"><Play size={26} fill="currentColor" /></span>
      {ok === false && <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Coming soon</span>}
      <span className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <span className="block font-head-lux text-[26px] leading-tight text-[#fff4d6] sm:text-[32px]">{v.title}</span>
        <span className="mt-1 block text-[12px] uppercase tracking-[0.18em] text-[#f3dc94]">{v.sub}</span>
      </span>
    </button>
  );
}

function VideoGallery() {
  const [playing, setPlaying] = useState(null);
  useEffect(() => {
    if (!playing) return;
    const onKey = (e) => e.key === "Escape" && setPlaying(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);
  return (
    <Section id="gallery" className="bg-surface-1">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div><SectionTag>Video gallery</SectionTag><Heading>See the salon <em>in motion</em></Heading></div>
        <Btn as="a" href={SALON.instagramUrl} target="_blank" rel="noreferrer" variant="outline">Follow {SALON.instagram}</Btn>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:grid-rows-2">
        {VIDEOS.map((v) => <VideoTile key={v.src} v={v} onOpen={setPlaying} />)}
      </div>
      {playing && (
        <div role="dialog" aria-modal="true" aria-label={playing.title} onClick={() => setPlaying(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0d09]/85 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#d4a73c] bg-[#0f0d09]">
            <button onClick={() => setPlaying(null)} aria-label="Close video" className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gold text-[#3d2905]"><X size={18} /></button>
            <video src={playing.src} controls autoPlay playsInline className="max-h-[80vh] w-full" />
          </div>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ FAQ */
const FAQ = [
  { q: "Do I need an appointment?", a: "Walk-ins are welcome when a stylist is free, but booking online guarantees your slot and your preferred stylist." },
  { q: "Do you offer a consultation?", a: "Every service begins with a short consultation so we agree on the result before we start." },
  { q: "Which hair services do you offer?", a: "Precision cuts, colour and balayage, keratin and smoothing, bridal and occasion styling, blow-dries, and men's haircuts and beard grooming. Skin, makeup and nail services are available too." },
  { q: "Can I change or cancel my appointment?", a: "Yes. Sign in to your account and cancel from My Bookings, or call us and we'll rebook you." },
  { q: "Where are you and when are you open?", a: `${SALON.address}. ${SALON.hours}.` },
];
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
        <div>
          <SectionTag>FAQ</SectionTag>
          <Heading>Good to <em>know</em></Heading>
          <p className="mt-5">Can't find your answer?</p>
          <div className="mt-6"><Btn as={Link} to="/contact" variant="outline">Contact us</Btn></div>
        </div>
        <div className="divide-y divide-border border-y border-border">
          {FAQ.map((f, i) => (
            <div key={f.q}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-6 text-left font-head-lux text-2xl text-ink-primary">
                {f.q}<ChevronDown size={20} className={`shrink-0 text-accent transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="pb-6 pr-10 text-[16px] leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Enquire() {
  return (
    <Section id="appointment" className="bg-surface-1">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-24">
        <div>
          <SectionTag>Get in touch</SectionTag>
          <Heading>Ready for your <em>royal</em> makeover?</Heading>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed">Tell us what you have in mind and we'll help you choose the right service and book your visit. We usually reply the same day.</p>
          <ul className="mt-9 space-y-3 text-[15px]">
            <li className="flex items-center gap-3"><Phone size={16} className="text-accent" /> {SALON.phones.map((p, i) => <a key={p} href={`tel:${p}`} className="hover:text-accent">{i ? " · " : ""}+91 {p}</a>)}</li>
            <li className="flex items-center gap-3"><MapPin size={16} className="text-accent" /><a href={SALON.mapUrl} target="_blank" rel="noreferrer" className="hover:text-accent">{SALON.address}</a></li>
            <li className="flex items-center gap-3"><InstagramIcon size={16} /><a href={SALON.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-accent">{SALON.instagram}</a></li>
          </ul>
        </div>
        <EnquiryForm source="appointment" cta="Send enquiry" />
      </div>
    </Section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const data = useSalonData();
  const book = user ? (user.role === "customer" ? "/app/book" : "/salon/new-booking") : "/register";
  return (
    <SiteLayout>
      <Hero data={data} book={book} />
      <Marquee />
      <Intro book={book} />
      <HairServices book={book} />
      <PriceMenu data={data} book={book} />
      <Space />
      <Stylist book={book} />
      <VideoGallery />
      <Faq />
      <Enquire />
    </SiteLayout>
  );
}
