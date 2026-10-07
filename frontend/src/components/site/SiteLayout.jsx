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

const navCls = ({ isActive }) => `px-3 py-2 text-[15px] font-medium transition-colors ${isActive ? "text-accent" : "text-white hover:text-accent"}`;

export function BrandMark({ className = "" }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="The Grooming Master - home">
      <Logo variant="mark" className="h-10" />
      <span className="leading-none">
        <span className="block text-[15px] font-bold uppercase tracking-[0.12em] text-white sm:text-[17px]">The Grooming Master</span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.4em] text-accent">Luxury Salon</span>
      </span>
    </Link>
  );
}

export default function SiteLayout({ children }) {
  const { user } = useAuth();
  const account = user ? (user.role === "customer" ? "/app/book" : "/staff/calendar") : "/login";
  const book = user ? (user.role === "customer" ? "/app/book" : "/staff/new-booking") : "/register";

  return (
    <div className="theme-kre8 min-h-full">
      {/* Top bar */}
      <div className="border-b border-border bg-surface-0 text-[13px]">
        <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {SALON.phones.map((p, i) => (
              <a key={p} href={`tel:${p}`} className={`items-center gap-1.5 text-white/90 hover:text-accent ${i ? "hidden sm:flex" : "flex"}`}><Phone size={13} className="text-accent" /> +91 {p}</a>
            ))}
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-white/90">{SALON.tagline}</span>
            <a href={SALON.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="text-accent hover:text-white"><InstagramIcon /></a>
          </div>
        </Container>
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-surface-0/90 backdrop-blur">
        <Container className="flex h-[76px] items-center justify-between gap-4">
          <BrandMark />
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/" end className={navCls}>Home</NavLink>
            <NavLink to="/contact" className={navCls}>Contact Us</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to={account} aria-label={user ? "My account" : "Sign in"} title={user ? "My account" : "Sign in"} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-white hover:border-accent hover:text-accent"><UserRound size={18} /></Link>
            <Btn as={Link} to={book} className="hidden sm:inline-flex">Book Appointment</Btn>
          </div>
        </Container>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border bg-surface-1">
        <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-ink-muted">A luxury salon for hair, skin, makeup and nails. Grooming for him and for her, in Mohali.</p>
            <div className="mt-5 flex gap-2">
              <a href={SALON.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-white hover:border-accent hover:text-accent"><InstagramIcon /></a>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Quick Links</h3>
            <ul className="space-y-2.5 text-[15px]">
              {[["/", "Home"], ["/contact", "Contact Us"], [book, "Book Appointment"], [account, user ? "My Account" : "Sign In"]].map(([to, l]) => <li key={l}><Link to={to} className="hover:text-accent">{l}</Link></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Our Services</h3>
            <ul className="space-y-2.5 text-[15px]">
              {["Hair Care", "Hair Services", "Waxing & Bleach", "Grooming", "Male Grooming"].map((l) => <li key={l}><a href="/#price-list" className="hover:text-accent">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-medium text-white">Contact</h3>
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-2.5"><Phone size={16} className="mt-1 shrink-0 text-accent" /><span>{SALON.phones.map((p) => <a key={p} href={`tel:${p}`} className="block hover:text-accent">+91 {p}</a>)}</span></li>
              <li className="flex gap-2.5"><MapPin size={16} className="mt-1 shrink-0 text-accent" /><a href={SALON.mapUrl} target="_blank" rel="noreferrer" className="hover:text-accent">{SALON.address}</a></li>
              <li className="flex gap-2.5"><Clock size={16} className="mt-1 shrink-0 text-accent" />{SALON.hours}</li>
            </ul>
          </div>
        </Container>
        <div className="border-t border-border">
          <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-sm">
            <span>© {new Date().getFullYear()} The Grooming Master. All rights reserved.</span>
            <Link to="/staff-login" className="hover:text-accent">Staff login</Link>
          </Container>
        </div>
      </footer>
    </div>
  );
}
