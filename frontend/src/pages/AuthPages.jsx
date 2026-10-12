import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/api";
import Logo from "../components/Logo";
import { ThemeToggle } from "../lib/theme";
import { SALON } from "../lib/format";
import { Button, ErrorNote, Field, Input, Select } from "../components/ui";

// Royal brand styling: deep black + champagne gold (the crest's colours) on the brand panel, neutral app theme on the form side.
const GOLD_TEXT = "bg-gradient-to-b from-[#f6e8bd] via-[#d9bf86] to-[#a78a52] bg-clip-text text-transparent";
const GOLD_BTN = "!bg-gradient-to-b from-[#ecdcae] to-[#b99d66] !text-[#1a1712] shadow-sm hover:brightness-105";
// Faint diamond lattice, drawn as an inline SVG so no extra asset is needed.
const LATTICE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M24 2 46 24 24 46 2 24Z' fill='none' stroke='%23c9b182' stroke-opacity='0.09' stroke-width='1'/%3E%3C/svg%3E")`;

/** Gold hairline with a diamond in the middle. */
function Ornament({ className = "" }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9b182]/60" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[#c9b182]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9b182]/60" />
    </div>
  );
}

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-full bg-surface-0 text-ink-primary lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden lg:block"
        style={{ backgroundColor: "#0c0b09", backgroundImage: `radial-gradient(ellipse at 50% 38%, rgba(201,177,130,0.22), transparent 62%), ${LATTICE}, linear-gradient(165deg, #1a1610, #080706)` }}>
        {/* double gold frame */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-5 border border-[#c9b182]/40" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-7 border border-[#c9b182]/15" />
        {[["left-5 top-5", ""], ["right-5 top-5", "rotate-90"], ["bottom-5 right-5", "rotate-180"], ["bottom-5 left-5", "-rotate-90"]].map(([pos, rot]) => (
          <span key={pos} aria-hidden="true" className={`pointer-events-none absolute ${pos} ${rot} h-6 w-6 border-l-2 border-t-2 border-[#d9bf86]`} />
        ))}

        <div className="relative flex h-full flex-col items-center justify-between px-14 py-16 text-center">
          <Link to="/" aria-label="The Grooming Master home" className="text-[11px] font-semibold uppercase tracking-[0.5em] text-[#c9b182] hover:text-[#e6d4a6]">
            Mohali
          </Link>

          <div className="flex w-full max-w-sm flex-col items-center">
            <Logo className="h-52 drop-shadow-[0_6px_28px_rgba(201,177,130,0.35)]" />
            <h2 className={`mt-8 text-[28px] font-semibold uppercase leading-tight tracking-[0.22em] ${GOLD_TEXT}`}>The Grooming Master</h2>
            <p className="mt-2 text-[10px] uppercase tracking-[0.6em] text-[#a99d86]">Luxury Salon</p>
            <Ornament className="mt-8 w-full" />
            <p className="mt-8 text-lg tracking-wide text-[#efe3c6]">&ldquo;{SALON.tagline}&rdquo;</p>
            <p className="mt-3 text-sm leading-relaxed text-[#a99d86]">Book your appointment, follow every visit and run the salon, all in one place.</p>
          </div>

          <p className="text-[11px] tracking-wider text-[#7d7462]">&copy; {new Date().getFullYear()} The Grooming Master</p>
        </div>
      </aside>

      {/* Form */}
      <main className="relative flex flex-col items-center justify-center px-6 py-14">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#c9b182] to-transparent lg:hidden" />
        <div className="absolute right-4 top-4 flex items-center gap-3">
          <Link to="/" className="text-xs text-ink-secondary hover:text-ink-primary">&larr; Back to site</Link>
          <ThemeToggle />
        </div>
        <Link to="/" className="mb-8 flex flex-col items-center lg:hidden" aria-label="The Grooming Master home">
          <Logo className="h-24" />
          <span className="mt-2 text-sm font-semibold uppercase tracking-[0.25em]">The Grooming Master</span>
        </Link>
        <div className="w-full max-w-sm">
          <Ornament className="mb-5 w-24" />
          <h1 className="text-2xl font-semibold uppercase tracking-[0.12em]">{title}</h1>
          <p className="mb-7 mt-2 text-sm text-ink-secondary">{subtitle}</p>
          {children}
        </div>
        <div className="mt-7 text-sm text-ink-secondary">{footer}</div>
      </main>
    </div>
  );
}

function LoginForm({ audience }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "customer" ? "/app/book" : "/salon/calendar"} replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const u = await login(form.email, form.password, audience);
      navigate(u.role === "customer" ? "/app/book" : u.role === "admin" || u.role === "developer" ? "/salon/dashboard" : "/salon/calendar");
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorNote>{error}</ErrorNote>
      <Field label="Email"><Input type="email" required autoFocus autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Password"><Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <Button type="submit" disabled={busy} className={`w-full ${GOLD_BTN}`}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export const CustomerLogin = () => (
  <AuthCard title="Welcome back" subtitle="Sign in to book and manage your appointments."
    footer={<>New here? <Link to="/register" className="font-medium text-link underline-offset-2 hover:underline">Create an account</Link> · <Link to="/salon-login" className="hover:underline">Salon login</Link></>}>
    <LoginForm audience="customer" />
  </AuthCard>
);

export const StaffLogin = () => (
  <AuthCard title="Salon login" subtitle="Salon admin and staff sign in here."
    footer={<Link to="/login" className="font-medium text-link underline-offset-2 hover:underline">Customer login</Link>}>
    <LoginForm audience="staff" />
  </AuthCard>
);

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", gender: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to="/app/book" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try { await register({ ...form, gender: form.gender || null }); navigate("/app/book"); }
    catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <AuthCard title="Create your account" subtitle="Book appointments in a few taps."
      footer={<>Already registered? <Link to="/login" className="font-medium text-link underline-offset-2 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <Field label="Full name"><Input required value={form.name} onChange={set("name")} autoComplete="name" /></Field>
        <Field label="Email"><Input type="email" required value={form.email} onChange={set("email")} autoComplete="email" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" /></Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={set("gender")}>
              <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <Field label="Password" hint="At least 8 characters"><Input type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>
        <Button type="submit" disabled={busy} className={`w-full ${GOLD_BTN}`}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
