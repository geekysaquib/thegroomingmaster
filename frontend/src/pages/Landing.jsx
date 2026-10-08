import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Droplets, Leaf, MapPin, Phone, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { SALON, SECTIONS, rs } from "../lib/format";
import { useAuth } from "../lib/auth";
import { CATEGORIES, FAQ, PRODUCTS, PRODUCT_GROUPS } from "../lib/siteContent";
import SiteLayout, { InstagramIcon } from "../components/site/SiteLayout";
import EnquiryForm from "../components/site/EnquiryForm";
import { Btn, Card, Container, Heading, Img, SectionTag } from "../components/site/parts";

const Section = ({ id, className = "", children }) => <section id={id} className={`scroll-mt-24 py-20 sm:py-28 ${className}`}><Container>{children}</Container></section>;

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

const HERO_STATS = (count) => [["6", "Signature formulas"], [count ? `${count}+` : "50+", "Salon services"], ["7 days", "Open every week"]];

function Hero({ data, book }) {
  return (
    <section className="relative isolate flex min-h-[640px] items-end overflow-hidden md:min-h-[720px] md:items-center lg:min-h-[calc(100svh-124px)]">
      <Img name="home/hero-wide.jpg" pos="74% 30%" alt="Indian woman with long, glossy dark hair" className="absolute inset-0 -z-20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#f4ebdc] via-[#f4ebdc]/70 to-transparent md:bg-gradient-to-r md:from-[#f4ebdc]/95 md:via-[#f4ebdc]/55 md:to-transparent" />
      <Container className="py-14 md:py-24">
        <div className="max-w-xl">
          <SectionTag>Premium haircare &amp; luxury salon</SectionTag>
          <Heading as="h1" className="!text-[60px] sm:!text-[104px] !leading-[0.92]">Beautiful hair,<br />expertly cared for.</Heading>
          <p className="mt-7 max-w-md text-[17px] leading-relaxed text-ink-secondary">Salon-grade products and master stylists under one roof in Mohali. Shop the range, or book your visit.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Btn as="a" href="#bestsellers">Shop products</Btn>
            <Btn as={Link} to={book} variant="outline">Book appointment</Btn>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-ink-primary/15 pt-7">
            {HERO_STATS(data.count).map(([n, l]) => (
              <div key={l}><dt className="font-head-lux text-4xl text-ink-primary">{n}</dt><dd className="mt-1 text-[12px] uppercase tracking-[0.14em] text-ink-secondary">{l}</dd></div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

const TRUST = [
  [ShieldCheck, "Genuine & salon-tested", "Every product is used and approved by our stylists."],
  [Leaf, "Made for Indian hair", "Argan, amla and bhringraj-led formulas."],
  [Droplets, "Visible results", "Shine, softness and strength from the first use."],
  [Sparkles, "Expert guidance", "Personal advice in the studio, no guesswork."],
];

function Trust() {
  return (
    <section className="border-b border-border">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
        {TRUST.map(([Icon, t, d]) => (
          <div key={t} className="flex items-start gap-4">
            <Icon size={22} strokeWidth={1.4} className="mt-0.5 shrink-0 text-accent" />
            <div><div className="text-[15px] font-medium text-ink-primary">{t}</div><p className="mt-1 hidden text-[14px] leading-snug sm:block">{d}</p></div>
          </div>
        ))}
      </Container>
    </section>
  );
}

function Categories({ onPick }) {
  return (
    <Section id="shop">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div><SectionTag>Shop by category</SectionTag><Heading>Your routine, <em>step by step</em></Heading></div>
        <p className="max-w-sm">Cleanse, treat and style with products that work together.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-5">
        {CATEGORIES.map((c) => (
          <a key={c.name} href="#bestsellers" onClick={() => onPick(c.group)} className="group block text-center">
            <Img name={c.img} alt={c.name} className="aspect-[4/5] rounded-2xl [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
            <span className="mt-4 inline-flex items-center gap-1 font-head-lux text-2xl text-ink-primary">{c.name}<ArrowUpRight size={16} className="text-accent opacity-0 transition-opacity group-hover:opacity-100" /></span>
          </a>
        ))}
      </div>
    </Section>
  );
}

function Bestsellers({ group, setGroup }) {
  const items = group === "All" ? PRODUCTS : PRODUCTS.filter((p) => p.group === group);
  return (
    <Section id="bestsellers" className="bg-surface-1">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div><SectionTag>Bestsellers</SectionTag><Heading>The signature <em>collection</em></Heading></div>
        <div role="tablist" aria-label="Filter products" className="flex flex-wrap gap-2">
          {PRODUCT_GROUPS.map((g) => (
            <button key={g} role="tab" aria-selected={group === g} onClick={() => setGroup(g)}
              className={`rounded-full border px-5 py-2 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors ${group === g ? "border-ink-primary bg-ink-primary text-white" : "border-border text-ink-primary hover:border-ink-primary"}`}>{g}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 lg:grid-cols-3">
        {items.map((p) => (
          <article key={p.id} className="group">
            <div className="relative">
              <Img name={p.img} alt={p.name} className="aspect-[4/5] rounded-2xl [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
              {p.tag && <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-primary">{p.tag}</span>}
              <Link to="/contact" className="absolute inset-x-4 bottom-4 rounded-full bg-ink-primary py-3 text-center text-[12px] font-medium uppercase tracking-[0.16em] text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">Enquire to buy</Link>
            </div>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-head-lux text-[23px] leading-tight text-ink-primary">{p.name}</h3>
                <p className="mt-1 text-[13px] uppercase tracking-[0.1em]">{p.type}</p>
              </div>
              <div className="shrink-0 text-right text-[17px] text-ink-primary">{rs(p.price)}{p.mrp && <div className="text-[13px] text-ink-muted line-through">{rs(p.mrp)}</div>}</div>
            </div>
            <p className="mt-2 hidden text-[14px] leading-relaxed sm:block">{p.benefit}</p>
          </article>
        ))}
      </div>
      <p className="mt-12 text-center text-sm">All products are available at our Mohali studio. Prices inclusive of taxes.</p>
    </Section>
  );
}

const GALLERY = [
  { img: "home/g-blowdry.jpg", label: "Layered blow-dry", cls: "md:row-span-2" },
  { img: "home/g-salon.jpg", label: "The studio", cls: "md:col-span-2" },
  { img: "home/g-bridal.jpg", label: "Bridal updo", cls: "md:row-span-2", pos: "50% 25%" },
  { img: "home/g-balayage.jpg", label: "Honey balayage" },
  { img: "home/g-beard.jpg", label: "Beard sculpting" },
  { img: "home/g-fade.jpg", label: "Precision fade", cls: "md:row-span-2" },
  { img: "home/g-hands.jpg", label: "Artistry in detail", cls: "md:col-span-2" },
  { img: "home/g-curls.jpg", label: "Natural curls", cls: "md:row-span-2" },
  { img: "home/skin.jpg", label: "Glow & brows", pos: "50% 30%" },
  { img: "home/ritual.jpg", label: "The hair ritual" },
];

function Gallery() {
  return (
    <Section id="gallery">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div><SectionTag>Gallery</SectionTag><Heading>Looks crafted <em>in our studio</em></Heading></div>
        <Btn as="a" href={SALON.instagramUrl} target="_blank" rel="noreferrer" variant="outline">Follow {SALON.instagram}</Btn>
      </div>
      <div className="grid auto-rows-[190px] grid-cols-2 gap-3 [grid-auto-flow:dense] md:auto-rows-[210px] md:grid-cols-4 md:gap-4">
        {GALLERY.map((g) => (
          <figure key={g.label} className={`group relative overflow-hidden rounded-xl ${g.cls || ""}`}>
            <Img name={g.img} pos={g.pos} alt={g.label} className="absolute inset-0 [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#17130f]/75 to-transparent p-4 pt-12 text-[12px] font-medium uppercase tracking-[0.18em] text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">{g.label}</figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

const SPECIALITIES = ["Precision cuts & styling", "Colour, balayage & highlights", "Keratin, botox & smoothing", "Bridal & occasion hair", "Men's haircuts & beard grooming"];

function Stylists({ book }) {
  return (
    <Section id="stylists" className="bg-surface-1">
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div className="relative">
          <Img name="home/stylist-work.jpg" pos="45% 40%" alt="A hairdresser cutting a client's hair in the salon" className="aspect-[4/3] rounded-2xl" />
          <div className="absolute -bottom-6 right-4 rounded-2xl bg-white px-6 py-4 shadow-[0_18px_40px_-18px_rgba(26,23,20,0.35)] sm:right-8">
            <div className="font-head-lux text-4xl text-ink-primary">1-to-1</div>
            <div className="text-[12px] uppercase tracking-[0.14em]">Consultation every visit</div>
          </div>
        </div>
        <div>
          <SectionTag>Our hairdressers</SectionTag>
          <Heading>Skilled hands, <em>personal care</em></Heading>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed">Every visit starts with a conversation. Our stylists study your hair, your face shape and your routine, then craft a look that suits you and recommend the right products to keep it that way at home.</p>
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {SPECIALITIES.map((x) => <li key={x} className="flex items-center gap-3 py-3.5 text-[16px] text-ink-primary"><Scissors size={16} className="shrink-0 text-accent" />{x}</li>)}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <Btn as={Link} to={book}>Book with a stylist</Btn>
            <Btn as="a" href="#services" variant="outline" arrow={false}>See services</Btn>
          </div>
        </div>
      </div>
    </Section>
  );
}

function PriceRow({ name, children }) {
  return (
    <li className="flex items-baseline gap-3 py-1.5">
      <span className="text-[16px] text-ink-primary">{name}</span>
      <span className="min-w-3 flex-1 border-b border-dotted border-ink-primary/25" />
      {children}
    </li>
  );
}

function PriceCard({ title, items }) {
  const waxing = title === "Waxing";
  const pairs = useMemo(() => {
    if (!waxing) return [];
    const map = new Map();
    for (const s of items) {
      const m = s.name.match(/^(.*) \((Basic|Rica)\)$/);
      if (m) map.set(m[1], { ...(map.get(m[1]) || {}), [m[2]]: s.price });
    }
    return [...map.entries()];
  }, [items, waxing]);

  return (
    <Card className="p-7">
      <h3 className="mb-3 font-head-lux text-3xl text-accent">{title}</h3>
      {waxing && <div className="flex justify-end gap-6 pb-1 text-xs uppercase tracking-wider"><span className="w-16 text-right">Basic</span><span className="w-16 text-right">Rica*</span></div>}
      <ul>
        {waxing
          ? pairs.map(([name, p]) => <PriceRow key={name} name={name}><span className="w-16 text-right text-ink-primary">{rs(p.Basic)}</span><span className="w-16 text-right text-ink-primary">{rs(p.Rica)}</span></PriceRow>)
          : items.map((s) => <PriceRow key={s.id} name={s.name}><span className="whitespace-nowrap text-ink-primary">{rs(s.price)}{s.price_type === "onwards" && <span className="ml-1 text-xs text-ink-muted">onwards</span>}</span></PriceRow>)}
      </ul>
    </Card>
  );
}

const SERVICE_CARDS = [
  { title: "Hair Care & Styling", img: "home/g-blowdry.jpg", sections: ["Hair Care", "Hair Services"], text: "Blow dry, colour, keratin, botox, balayage and more." },
  { title: "Waxing & Bleach", img: "home/skin.jpg", pos: "50% 30%", sections: ["Waxing", "Bleach"], text: "Comfortable waxing in Basic or Rica ranges, plus brightening bleach." },
  { title: "Face & Grooming", img: "home/g-balayage.jpg", sections: ["Grooming"], text: "Eyebrows, upper lip, forehead and finishing touches." },
  { title: "Male Grooming", img: "home/g-fade.jpg", sections: ["Male Grooming"], text: "Haircuts, the New Look, beard shaping and colour." },
];

function Services({ data, book }) {
  const [open, setOpen] = useState(false);
  const minPrice = (names) => Math.min(...names.flatMap((n) => (data.bySection[n] || []).map((s) => Number(s.price))), Infinity);
  const cols = useMemo(() => {
    const names = [...SECTIONS.filter((n) => data.bySection[n]), ...Object.keys(data.bySection).filter((n) => !SECTIONS.includes(n))];
    const left = [], right = [];
    names.forEach((n, i) => (i % 2 === 0 ? left : right).push(n));
    return [left, right];
  }, [data.bySection]);

  return (
    <Section id="services">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><SectionTag>Salon services</SectionTag><Heading>Care for <em>every occasion</em></Heading></div>
        <div className="flex flex-wrap gap-3">
          <Btn as={Link} to={book}>Book appointment</Btn>
          <Btn as="button" variant="outline" arrow={false} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "View"} price list</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {SERVICE_CARDS.map((c) => {
          const from = minPrice(c.sections);
          return (
            <button key={c.title} onClick={() => setOpen(true)} className="group relative isolate flex min-h-[380px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-left sm:min-h-[460px] sm:p-7">
              <Img name={c.img} pos={c.pos} alt="" className="absolute inset-0 -z-10 [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#17130f]/90 via-[#17130f]/30 to-transparent" />
              {Number.isFinite(from) && <span className="mb-3 self-start rounded-full bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-primary">From {rs(from)}</span>}
              <h3 className="font-head-lux text-[28px] leading-none text-white sm:text-[34px]">{c.title}</h3>
              <p className="mt-2 hidden text-[14px] leading-relaxed text-white/80 sm:block">{c.text}</p>
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-16" id="price-list">
          {!data.loaded ? <p className="text-center">Loading our menu…</p> : data.count === 0 ? <p className="text-center">Our menu is being updated - please call us for prices.</p> : (
            <div className="grid items-start gap-5 lg:grid-cols-2">
              {cols.map((col, i) => <div key={i} className="space-y-5">{col.map((n) => <PriceCard key={n} title={n} items={data.bySection[n]} />)}</div>)}
            </div>
          )}
          <p className="mt-6 text-center text-sm">Prices marked “onwards” start at the amount shown. *Rica is our premium wax range.</p>
        </div>
      )}
    </Section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq" className="bg-surface-1">
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
    <Section id="appointment">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-24">
        <div>
          <SectionTag>Get in touch</SectionTag>
          <Heading>Not sure what your hair <em>needs?</em></Heading>
          <p className="mt-6 max-w-lg text-[17px] leading-relaxed">Tell us about your hair and we'll recommend a routine, or help you book a salon visit. We usually reply the same day.</p>
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
  const [group, setGroup] = useState("All");
  const book = user ? (user.role === "customer" ? "/app/book" : "/salon/new-booking") : "/register";
  return (
    <SiteLayout>
      <Hero data={data} book={book} />
      <Trust />
      <Categories onPick={setGroup} />
      <Bestsellers group={group} setGroup={setGroup} />
      <Gallery />
      <Stylists book={book} />
      <Services data={data} book={book} />
      <Faq />
      <Enquire />
    </SiteLayout>
  );
}
