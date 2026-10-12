import { Link, NavLink } from "react-router-dom";
import { Clock, MapPin, Phone, UserRound } from "lucide-react";
import { SALON } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import { Btn, Container } from "./parts";

export function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

const navCls = ({ isActive }) => `shrink-0 first:ml-auto last:mr-auto px-3 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors ${isActive ? "text-accent" : "text-ink-primary hover:text-accent"}`;
const anchorCls = "shrink-0 first:ml-auto last:mr-auto px-3 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-ink-primary transition-colors hover:text-accent";

/** Crest + serif wordmark. `onDark` flips the wordmark to ivory for the footer. */
export function BrandMark({ className = "", onDark = false }) {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`} aria-label="The Grooming Master - home">
      <img src="/images/brand/crest.png" alt="" className="h-12 w-auto drop-shadow-[0_1px_2px_rgba(122,86,20,0.35)]" />
      <span className="leading-none">
        <span className={`font-head-lux block text-[19px] tracking-[0.14em] sm:text-[23px] ${onDark ? "text-[#f8e9b8]" : "text-ink-primary"}`}>The Grooming Master</span>
        <span className={`mt-1.5 block text-[9px] uppercase tracking-[0.5em] ${onDark ? "text-[#e0bf6a]" : "text-accent"}`}>Luxury Salon</span>
      </span>
    </Link>
  );
}

export default function SiteLayout({ children }) {
  const { user } = useAuth();
  const account = user ? (user.role === "customer" ? "/app/book" : "/salon/calendar") : "/login";
  const book = user ? (user.role === "customer" ? "/app/book" : "/salon/new-booking") : "/register";
  const footLink = "text-[#d9cfbd] hover:text-[#f3dc94]";

  return (
    <div className="theme-lux min-h-full">
      <div className="bg-gold text-[12px] tracking-wide text-[#3d2905]">
        <Container className="flex items-center justify-between gap-4 py-2">
          <span className="text-[11px] uppercase tracking-[0.1em] sm:text-[12px] sm:tracking-[0.2em]">Luxury hair, skin, makeup &amp; nails · Mohali</span>
          <a href={`tel:${SALON.phones[0]}`} className="hidden items-center gap-1.5 hover:text-white sm:flex"><Phone size={12} /> +91 {SALON.phones[0]}</a>
        </Container>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-surface-0/90 backdrop-blur">
        <Container className="flex h-[76px] items-center justify-between gap-4">
          <BrandMark />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={navCls}>Home</NavLink>
            <a href="/#services" className={anchorCls}>Hair Services</a>
            <a href="/#menu" className={anchorCls}>Price Menu</a>
            <a href="/#stylist" className={anchorCls}>Our Stylist</a>
            <a href="/#gallery" className={anchorCls}>Gallery</a>
            <NavLink to="/contact" className={navCls}>Contact</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to={account} aria-label={user ? "My account" : "Sign in"} title={user ? "My account" : "Sign in"} className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-primary hover:border-accent hover:text-accent"><UserRound size={18} /></Link>
            <Btn as={Link} to={book} className="hidden !px-5 !py-3 sm:inline-flex" arrow={false}>Book Appointment</Btn>
          </div>
        </Container>
        <nav aria-label="Main (mobile)" className="flex gap-1 overflow-x-auto border-t border-border px-2 lg:hidden">
          <a href="/#services" className={anchorCls}>Services</a>
          <a href="/#menu" className={anchorCls}>Menu</a>
          <a href="/#stylist" className={anchorCls}>Stylist</a>
          <a href="/#gallery" className={anchorCls}>Gallery</a>
          <NavLink to="/contact" className={navCls}>Contact</NavLink>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t-4 border-[#d4a73c] bg-[#14110c] text-[#d9cfbd]">
        <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark onDark />
            <p className="mt-6 max-w-xs text-[15px] leading-relaxed">A royal experience in hair, skin, makeup and nails, crafted by master stylists at our Mohali studio.</p>
            <div className="mt-6 flex gap-2">
              <a href={SALON.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-[#f3e6d4] hover:border-[#f3dc94] hover:text-[#f3dc94]"><InstagramIcon /></a>
            </div>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#f3dc94]">Hair</h3>
            <ul className="space-y-3 text-[15px]">
              {["Precision Cuts", "Colour & Balayage", "Keratin & Smoothing", "Bridal Styling", "Men's Grooming"].map((l) => <li key={l}><a href="/#services" className={footLink}>{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#f3dc94]">Explore</h3>
            <ul className="space-y-3 text-[15px]">
              {[["/", "Home"], ["/#menu", "Price Menu"], ["/#gallery", "Gallery"], ["/contact", "Contact Us"], [book, "Book Appointment"], [account, user ? "My Account" : "Sign In"]].map(([to, l]) => <li key={l}><Link to={to} className={footLink}>{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#f3dc94]">Visit</h3>
            <ul className="space-y-3.5 text-[15px]">
              <li className="flex gap-2.5"><Phone size={16} className="mt-1 shrink-0 text-[#f3dc94]" /><span>{SALON.phones.map((p) => <a key={p} href={`tel:${p}`} className={`block ${footLink}`}>+91 {p}</a>)}</span></li>
              <li className="flex gap-2.5"><MapPin size={16} className="mt-1 shrink-0 text-[#f3dc94]" /><a href={SALON.mapUrl} target="_blank" rel="noreferrer" className={footLink}>{SALON.address}</a></li>
              <li className="flex gap-2.5"><Clock size={16} className="mt-1 shrink-0 text-[#f3dc94]" />{SALON.hours}</li>
            </ul>
          </div>
        </Container>
        <div className="border-t border-white/10">
          <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-sm">
            <span>© {new Date().getFullYear()} The Grooming Master. All rights reserved.</span>
            <Link to="/salon-login" className={footLink}>Salon login</Link>
          </Container>
        </div>
      </footer>
    </div>
  );
}
