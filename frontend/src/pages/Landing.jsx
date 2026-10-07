import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, Check, ChevronDown, Clock, Crown, MapPin, Phone, ShoppingBag, Scissors, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { SALON, SECTIONS, rs } from "../lib/format";
import { useAuth } from "../lib/auth";
import { ABOUT_POINTS, BENEFITS, BLOG, FAQ, PLANS, PRODUCTS, TEAM, TESTIMONIALS, WHY } from "../lib/siteContent";
import SiteLayout, { InstagramIcon } from "../components/site/SiteLayout";
import EnquiryForm from "../components/site/EnquiryForm";
import { Btn, Card, Container, Heading, Img, SectionTag } from "../components/site/parts";

const Section = ({ id, className = "", children }) => <section id={id} className={`scroll-mt-24 py-16 sm:py-24 ${className}`}><Container>{children}</Container></section>;
const WHY_ICONS = { user: UserRound, scissors: Scissors, crown: Crown, badge: BadgeCheck };

function useSalonData() {
  const [services, setServices] = useState(null);
  useEffect(() => { api.get("/services").then((r) => setServices(r.data)).catch(() => setServices([])); }, []);
  return useMemo(() => {
    const list = services || [];
    const bySection = {};
    for (const s of list) (bySection[s.section] ||= []).push(s);
    const minPrice = (names) => Math.min(...names.flatMap((n) => (bySection[n] || []).map((s) => Number(s.price))), Infinity);
    return { loaded: services !== null, list, bySection, count: list.length, sectionCount: Object.keys(bySection).length, minPrice };
  }, [services]);
}

function Hero({ book }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <Container className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <SectionTag>Luxury salon for him &amp; her</SectionTag>
          <Heading as="h1" className="!text-[40px] sm:!text-[64px]">Look good. <em>Feel great.</em></Heading>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed">Hair, skin, makeup and nails by skilled stylists, in a calm and luxurious space. Choose your service, pick a time and we'll take care of the rest.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn as={Link} to={book}>Book An Appointment</Btn>
            <Btn as="a" href="#services" variant="outline">Explore Our Services</Btn>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Hair", "Skin", "Makeup", "Nails"].map((t) => <span key={t} className="rounded-full border border-border bg-white/[0.05] px-4 py-1.5 text-sm text-white">{t}</span>)}
          </div>
          <div className="mt-10 grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-white"><Clock size={18} className="text-accent" /> <span className="text-lg font-medium">Working Hours</span></div>
              <p>{SALON.hours}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-white"><MapPin size={18} className="text-accent" /> <span className="text-lg font-medium">Studio Location</span></div>
              <a href={SALON.mapUrl} target="_blank" rel="noreferrer" className="hover:text-accent">SCO 19, First Floor, Sector 89, Mohali</a>
            </div>
          </div>
        </div>
        <Img name="hero" alt="Stylist at work in the studio" className="aspect-[4/5] rounded-3xl border border-border lg:aspect-[5/6]" />
      </Container>
    </section>
  );
}

function About({ data }) {
  return (
    <Section id="about">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative">
          <Img name="about-1" alt="Inside the salon" className="aspect-[4/5] rounded-3xl border border-border" />
          <div className="absolute -bottom-8 right-4 hidden w-1/2 sm:block"><Img name="about-2" alt="Styling in progress" className="aspect-square rounded-2xl border-4 border-surface-0" /></div>
        </div>
        <div>
          <SectionTag>About us</SectionTag>
          <Heading>Modern hair, personal style, <em>exceptional experience</em></Heading>
          <p className="mt-6 text-[17px] leading-relaxed">The Grooming Master is a luxury salon in Sector 89, Mohali. We bring together expert technique, quality products and a welcoming atmosphere so that every visit leaves you looking and feeling your best.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {ABOUT_POINTS.map((p) => (
              <div key={p.title}><h3 className="text-xl font-medium text-white">{p.title}</h3><p className="mt-2 text-[15px] leading-relaxed">{p.text}</p></div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Card className="px-6 py-4">
              <div className="text-4xl font-medium text-accent">{data.count ? `${data.count}+` : "50+"}</div>
              <div className="text-sm">Services on our menu</div>
            </Card>
            <div className="flex flex-wrap items-center gap-4">
              <Btn as={Link} to="/contact">Know About Us</Btn>
              <a href={`tel:${SALON.phones[0]}`} className="flex items-center gap-3 text-white hover:text-accent">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border"><Phone size={18} className="text-accent" /></span>
                <span><span className="block text-xs">Call us</span><span className="font-medium">+91 {SALON.phones[0]}</span></span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

const SERVICE_CARDS = [
  { title: "Hair Care & Styling", img: "service-1", sections: ["Hair Care", "Hair Services"], text: "Root touch-ups, blow dry, ironing, colour, keratin, botox, balayage and more." },
  { title: "Waxing & Bleach", img: "service-2", sections: ["Waxing", "Bleach"], text: "Smooth, comfortable waxing in Basic or Rica ranges, plus brightening bleach." },
  { title: "Face & Body Grooming", img: "service-3", sections: ["Grooming"], text: "Eyebrows, upper lip, forehead, side locks and full-face finishing touches." },
  { title: "Male Grooming", img: "service-4", sections: ["Male Grooming"], text: "Haircuts, the New Look, beard shaping and beard or hair colour." },
];

function Services({ data }) {
  return (
    <Section id="services">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><SectionTag>Our services</SectionTag><Heading>Everything you need for <em>effortless style</em></Heading></div>
        <div className="max-w-md"><p className="mb-4">From a quick blow dry to a complete transformation, find a service for every occasion.</p><Btn as="a" href="#price-list" variant="outline">View Price List</Btn></div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICE_CARDS.map((c) => {
          const from = data.minPrice(c.sections);
          return (
            <a key={c.title} href="#price-list" className="group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-2xl border border-border">
              <Img name={c.img} alt="" className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              <div className="relative p-6">
                {Number.isFinite(from) && <div className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">Starting from {rs(from)}</div>}
                <h3 className="text-2xl font-medium text-white">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/75">{c.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">Learn more <ArrowUpRight size={15} /></span>
              </div>
            </a>
          );
        })}
      </div>
    </Section>
  );
}

function PriceRow({ name, children }) {
  return (
    <li className="flex items-baseline gap-3 py-1.5">
      <span className="text-[16px] text-white">{name}</span>
      <span className="min-w-3 flex-1 border-b border-dotted border-white/20" />
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
    <Card className="p-6">
      <h3 className="mb-3 text-2xl font-medium text-accent">{title}</h3>
      {waxing && <div className="flex justify-end gap-6 pb-1 text-xs uppercase tracking-wider"><span className="w-16 text-right">Basic</span><span className="w-16 text-right">Rica*</span></div>}
      <ul>
        {waxing
          ? pairs.map(([name, p]) => <PriceRow key={name} name={name}><span className="w-16 text-right text-white">{rs(p.Basic)}</span><span className="w-16 text-right text-white">{rs(p.Rica)}</span></PriceRow>)
          : items.map((s) => <PriceRow key={s.id} name={s.name}><span className="whitespace-nowrap text-white">{rs(s.price)}{s.price_type === "onwards" && <span className="ml-1 text-xs text-ink-muted">onwards</span>}</span></PriceRow>)}
      </ul>
    </Card>
  );
}

function PriceList({ data, book }) {
  const cols = useMemo(() => {
    const names = [...SECTIONS.filter((n) => data.bySection[n]), ...Object.keys(data.bySection).filter((n) => !SECTIONS.includes(n))];
    const left = [], right = [];
    names.forEach((n, i) => (i % 2 === 0 ? left : right).push(n));
    return [left, right];
  }, [data.bySection]);

  return (
    <Section id="price-list" className="border-y border-border bg-surface-1">
      <div className="mb-12 text-center"><div className="flex justify-center"><SectionTag>Price list</SectionTag></div><Heading>Our <em>menu &amp; prices</em></Heading></div>
      {!data.loaded ? <p className="text-center">Loading our menu…</p> : data.count === 0 ? <p className="text-center">Our menu is being updated - please call us for prices.</p> : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {cols.map((col, i) => <div key={i} className="space-y-5">{col.map((n) => <PriceCard key={n} title={n} items={data.bySection[n]} />)}</div>)}
        </div>
      )}
      <p className="mt-6 text-center text-sm">Prices marked “onwards” start at the amount shown. *Rica is our premium wax range.</p>
      <div className="mt-8 flex justify-center"><Btn as={Link} to={book}>Book Your Visit</Btn></div>
    </Section>
  );
}

function Benefits({ data }) {
  const min = data.minPrice(SECTIONS);
  const stats = [[data.count ? `${data.count}+` : "50+", "Services on the menu"], [data.sectionCount || 6, "Treatment categories"], [Number.isFinite(min) ? rs(min) : "Rs 30", "Services start from"], ["His & Hers", "Grooming for everyone"]];
  return (
    <Section id="benefits">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Img name="benefits" alt="Consultation at the salon" className="aspect-[5/4] rounded-3xl border border-border" />
        <div>
          <SectionTag>Why it feels different</SectionTag>
          <Heading>The Grooming Master difference, <em>made for you</em></Heading>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((b) => <li key={b} className="flex items-start gap-3 text-[17px] text-white"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check size={14} /></span>{b}</li>)}
          </ul>
          <div className="mt-8"><Btn as={Link} to="/contact">Talk To Us</Btn></div>
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-6 border-y border-border py-10 lg:grid-cols-4">
        {stats.map(([n, l]) => <div key={l} className="text-center"><div className="text-4xl font-medium text-white sm:text-5xl">{n}</div><div className="mt-1 text-sm">{l}</div></div>)}
      </div>

      <div className="mt-16 text-center"><Heading className="mx-auto max-w-3xl">Step inside our studio &amp; <em>experience luxury grooming</em></Heading></div>
      <Img name="studio" alt="The Grooming Master studio" className="mt-10 aspect-[16/8] rounded-3xl border border-border">
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-black/85 to-transparent p-6 text-white">
          <span className="flex items-center gap-2 text-lg font-medium"><Clock size={18} className="text-accent" /> Our Working Hours</span>
          <span>{SALON.hours}</span>
        </div>
      </Img>
    </Section>
  );
}

function WhyChoose({ data }) {
  return (
    <Section id="why" className="border-y border-border bg-surface-1">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionTag>Why choose us</SectionTag>
          <Heading>More than a haircut. <em>Styles that feel uniquely you.</em></Heading>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed">Skill, care and attention to detail in every service, from your first consultation to the final finish.</p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {WHY.map((w) => {
              const Icon = WHY_ICONS[w.icon];
              return (
                <div key={w.title}>
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-white/[0.05] text-accent"><Icon size={24} /></span>
                  <h3 className="text-xl font-medium text-white">{w.title}</h3><p className="mt-2 text-[15px] leading-relaxed">{w.text}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="col-span-2 flex items-center justify-between px-6 py-5"><div><div className="text-4xl font-medium text-accent">{data.count ? `${data.count}+` : "50+"}</div><div className="text-sm">Services under one roof</div></div><Scissors className="text-accent" size={32} /></Card>
          <Img name="why-1" alt="" className="col-span-2 aspect-[16/9] rounded-2xl border border-border" />
          <Img name="why-2" alt="" className="aspect-square rounded-2xl border border-border" />
          <Img name="why-3" alt="" className="aspect-square rounded-2xl border border-border" />
        </div>
      </div>
    </Section>
  );
}

function Products() {
  return (
    <Section id="products">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><SectionTag>Our products</SectionTag><Heading>Premium care for <em>healthy hair &amp; skin</em></Heading></div>
        <p className="max-w-md">Take the salon result home with products our stylists trust.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {PRODUCTS.map((p, i) => (
          <Card key={p.name} className="overflow-hidden">
            <Img name={`product-${i + 1}`} alt={p.name} className="aspect-[4/3]" />
            <div className="p-6">
              <div className="text-2xl font-medium text-accent">{p.price}</div>
              <h3 className="mt-2 text-xl font-medium text-white">{p.name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed">{p.text}</p>
              <Btn as={Link} to="/contact" className="mt-5 !px-4 !py-2.5" arrow={false}><ShoppingBag size={16} /> Enquire</Btn>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Membership({ book }) {
  return (
    <Section id="membership" className="border-y border-border bg-surface-1">
      <div className="mb-12 max-w-3xl"><SectionTag>Membership plans</SectionTag><Heading>Unlock more style with <em>exclusive member benefits</em></Heading></div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.name} className={`rounded-2xl border p-8 ${p.featured ? "border-accent bg-accent/[0.07]" : "border-border bg-white/[0.04]"}`}>
            <h3 className="text-xl font-medium text-white">{p.name}</h3>
            <p className="mt-1 text-[15px]">{p.text}</p>
            <div className="my-6 text-5xl font-medium text-white">{p.price}<span className="text-base text-ink-muted"> / {p.per}</span></div>
            <Btn as={Link} to={book} variant={p.featured ? "gold" : "outline"} className="w-full justify-center">Become a Member</Btn>
            <div className="mb-3 mt-7 text-sm font-medium uppercase tracking-wider text-white">What's included</div>
            <ul className="space-y-3">{p.perks.map((x) => <li key={x} className="flex items-center gap-3 text-[15px]"><Check size={16} className="shrink-0 text-accent" />{x}</li>)}</ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Appointment() {
  return (
    <Section id="appointment">
      <div className="grid items-start gap-12 lg:grid-cols-2">
        <div>
          <SectionTag>Book an appointment</SectionTag>
          <Heading>Let's create a look that feels <em>uniquely you</em></Heading>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed">Have a question or ready to book? Send us a message and we'll confirm your slot, or call us directly.</p>
          <ul className="mt-8 space-y-5">
            <li className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-accent"><Phone size={18} /></span><span><span className="block text-sm">Call us</span>{SALON.phones.map((p) => <a key={p} href={`tel:${p}`} className="block text-lg font-medium text-white hover:text-accent">+91 {p}</a>)}</span></li>
            <li className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-accent"><InstagramIcon size={18} /></span><span><span className="block text-sm">Instagram</span><a href={SALON.instagramUrl} target="_blank" rel="noreferrer" className="text-lg font-medium text-white hover:text-accent">{SALON.instagram}</a></span></li>
            <li className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-accent"><MapPin size={18} /></span><span><span className="block text-sm">Visit us</span><a href={SALON.mapUrl} target="_blank" rel="noreferrer" className="text-lg font-medium text-white hover:text-accent">{SALON.address}</a></span></li>
          </ul>
        </div>
        <EnquiryForm source="appointment" cta="Request Appointment" />
      </div>
    </Section>
  );
}

function Gallery() {
  // 11 tiles in a masonry-like grid; add /public/images/gallery-1.jpg ... gallery-11.jpg
  const spans = ["row-span-2", "", "", "row-span-2", "", "", "", "row-span-2", "", "", ""];
  return (
    <Section id="gallery" className="border-t border-border">
      <div className="mb-12 max-w-3xl"><SectionTag>Our work</SectionTag><Heading>Modern looks crafted for <em>your personal style</em></Heading></div>
      <div className="grid auto-rows-[170px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {spans.map((s, i) => <Img key={i} name={`gallery-${i + 1}`} alt={`Salon work ${i + 1}`} className={`rounded-2xl border border-border ${s}`} />)}
      </div>
    </Section>
  );
}

function Team() {
  return (
    <Section id="team" className="border-y border-border bg-surface-1">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><SectionTag>Meet our experts</SectionTag><Heading>The creative minds behind <em>your style</em></Heading></div>
        <Btn as={Link} to="/contact" variant="outline">Talk To Our Team</Btn>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {TEAM.map((t, i) => (
          <Card key={i} className="overflow-hidden">
            <Img name={`team-${i + 1}`} alt={t.name} className="aspect-[4/5]" />
            <div className="p-6"><h3 className="text-xl font-medium text-white">{t.name}</h3><p className="mt-1 text-[15px]">{t.role}</p></div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Testimonials({ book }) {
  return (
    <Section id="testimonials">
      <div className="mb-12 max-w-3xl"><SectionTag>Testimonials</SectionTag><Heading>Loved by clients, defined by <em>their style</em></Heading></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TESTIMONIALS.map((t, i) => (
          <Card key={i} className="flex flex-col p-6">
            <p className="flex-1 text-[15px] leading-relaxed">“{t.text}”</p>
            <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
              <Img name={`client-${i + 1}`} alt="" className="h-12 w-12 rounded-full" />
              <div><div className="font-medium text-white">{t.name}</div><div className="text-sm">{t.role}</div></div>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex justify-center"><Btn as={Link} to={book}>Book an Appointment Today</Btn></div>
    </Section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq" className="border-y border-border bg-surface-1">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionTag>FAQ</SectionTag>
          <Heading>Everything you need to know <em>before your visit</em></Heading>
          <p className="mt-5">Can't find your answer?</p>
          <div className="mt-6"><Btn as={Link} to="/contact">Contact Us</Btn></div>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <div key={f.q} className="rounded-2xl border border-border bg-white/[0.04]">
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-medium text-white">
                {f.q}<ChevronDown size={20} className={`shrink-0 text-accent transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-6 pb-5 text-[16px] leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Blog() {
  return (
    <Section id="blog">
      <div className="mb-12 max-w-3xl"><SectionTag>Latest blogs</SectionTag><Heading>Trends and tips in <em>hair, skin &amp; grooming</em></Heading></div>
      <div className="grid gap-5 md:grid-cols-3">
        {BLOG.map((b, i) => (
          <Card key={b.title} className="overflow-hidden">
            <Img name={`blog-${i + 1}`} alt="" className="aspect-[4/3]" />
            <div className="p-6">
              <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider text-accent">{b.tag}</span>
              <h3 className="mt-4 text-xl font-medium leading-snug text-white">{b.title}</h3>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">Coming soon <ArrowUpRight size={15} /></span>
            </div>
          </Card>
        ))}
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
      <Hero book={book} />
      <About data={data} />
      <Services data={data} />
      <PriceList data={data} book={book} />
      <Benefits data={data} />
      <WhyChoose data={data} />
      <Products />
      <Membership book={book} />
      <Appointment />
      <Gallery />
      <Team />
      <Testimonials book={book} />
      <Faq />
      <Blog />
    </SiteLayout>
  );
}
