import { Link, NavLink } from "react-router-dom";
import { Clock, MapPin, Phone, UserRound } from "lucide-react";
import { SALON } from "../../lib/format";
import { useAuth } from "../../lib/auth";
import Logo from "../Logo";
import { Btn, Container } from "./parts";

export function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

const navCls = ({ isActive }) => `px-3 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors ${isActive ? "text-accent" : "text-ink-primary hover:text-accent"}`;
const anchorCls = "px-3 py-2 text-[12px] font-medium uppercase tracking-[0.16em] text-ink-primary transition-colors hover:text-accent";

/** Crest + serif wordmark. `onDark` flips the wordmark to ivory for the footer. */
export function BrandMark({ className = "", onDark = false }) {
  return (
    <Link to="/" className={`flex items-center gap-3 ${className}`} aria-label="The Grooming Master - home">
      <Logo variant="mark" className="h-11 drop-shadow-[0_1px_2px_rgba(26,23,20,0.25)]" />
      <span className="leading-none">
        <span className={`font-head-lux block text-[19px] tracking-[0.14em] sm:text-[23px] ${onDark ? "text-[#f6f1e7]" : "text-ink-primary"}`}>The Grooming Master</span>
        <span className={`mt-1.5 block text-[9px] uppercase tracking-[0.5em] ${onDark ? "text-[#c9ab6d]" : "text-accent"}`}>Hair Atelier</span>
      </span>
    </Link>
  );
}

export default function SiteLayout({ children }) {
  const { user } = useAuth();
  const account = user ? (user.role === "customer" ? "/app/book" : "/salon/calendar") : "/login";
  const book = user ? (user.role === "customer" ? "/app/book" : "/salon/new-booking") : "/register";
  const footLink = "text-[#b9b0a1] hover:text-[#e4c98a]";

  return (
    <div className="theme-lux min-h-full">
      <div className="bg-[#1a1714] text-[12px] tracking-wide text-[#e8e0d0]">
        <Container className="flex items-center justify-between gap-4 py-2">
          <span className="uppercase tracking-[0.2em]">Salon-grade haircare, delivered with expert advice</span>
          <a href={`tel:${SALON.phones[0]}`} className="hidden items-center gap-1.5 hover:text-[#e4c98a] sm:flex"><Phone size={12} /> +91 {SALON.phones[0]}</a>
        </Container>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-surface-0/90 backdrop-blur">
        <Container className="flex h-[76px] items-center justify-between gap-4">
          <BrandMark />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={navCls}>Home</NavLink>
            <a href="/#shop" className={anchorCls}>Shop</a>
            <a href="/#bestsellers" className={anchorCls}>Bestsellers</a>
            <a href="/#services" className={anchorCls}>Services</a>
            <a href="/#gallery" className={anchorCls}>Gallery</a>
            <a href="/#stylists" className={anchorCls}>Stylists</a>
            <NavLink to="/contact" className={navCls}>Contact</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to={account} aria-label={user ? "My account" : "Sign in"} title={user ? "My account" : "Sign in"} className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-primary hover:border-accent hover:text-accent"><UserRound size={18} /></Link>
            <Btn as={Link} to={book} className="hidden !px-5 !py-3 sm:inline-flex" arrow={false}>Book Appointment</Btn>
          </div>
        </Container>
        <nav aria-label="Main (mobile)" className="flex justify-center gap-1 overflow-x-auto border-t border-border px-2 lg:hidden">
          <a href="/#shop" className={anchorCls}>Shop</a>
          <a href="/#bestsellers" className={anchorCls}>Bestsellers</a>
          <a href="/#services" className={anchorCls}>Services</a>
          <a href="/#gallery" className={anchorCls}>Gallery</a>
          <NavLink to="/contact" className={navCls}>Contact</NavLink>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="bg-[#17130f] text-[#b9b0a1]">
        <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark onDark />
            <p className="mt-6 max-w-xs text-[15px] leading-relaxed">Premium haircare and expert grooming, from our Mohali studio to your everyday routine.</p>
            <div className="mt-6 flex gap-2">
              <a href={SALON.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-[#e8e0d0] hover:border-[#e4c98a] hover:text-[#e4c98a]"><InstagramIcon /></a>
            </div>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#e4c98a]">Shop</h3>
            <ul className="space-y-3 text-[15px]">
              {["Shampoo", "Conditioner", "Serums & Oils", "Masks", "Styling"].map((l) => <li key={l}><a href="/#bestsellers" className={footLink}>{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#e4c98a]">Explore</h3>
            <ul className="space-y-3 text-[15px]">
              {[["/", "Home"], ["/#services", "Salon Services"], ["/contact", "Contact Us"], [book, "Book Appointment"], [account, user ? "My Account" : "Sign In"]].map(([to, l]) => <li key={l}><Link to={to} className={footLink}>{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[#e4c98a]">Visit</h3>
            <ul className="space-y-3.5 text-[15px]">
              <li className="flex gap-2.5"><Phone size={16} className="mt-1 shrink-0 text-[#e4c98a]" /><span>{SALON.phones.map((p) => <a key={p} href={`tel:${p}`} className={`block ${footLink}`}>+91 {p}</a>)}</span></li>
              <li className="flex gap-2.5"><MapPin size={16} className="mt-1 shrink-0 text-[#e4c98a]" /><a href={SALON.mapUrl} target="_blank" rel="noreferrer" className={footLink}>{SALON.address}</a></li>
              <li className="flex gap-2.5"><Clock size={16} className="mt-1 shrink-0 text-[#e4c98a]" />{SALON.hours}</li>
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
