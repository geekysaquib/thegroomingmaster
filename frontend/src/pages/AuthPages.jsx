import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { errMsg } from "../lib/api";
import Logo from "../components/Logo";
import { Button, ErrorNote, Field, Input, Select } from "../components/ui";

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="theme-kre8 flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-5 flex flex-col items-center" aria-label="The Grooming Master home">
        <Logo className="h-28" />
        <span className="mt-1 text-lg font-bold tracking-[0.15em] text-ink-primary">THE GROOMING MASTER</span>
        <span className="text-[10px] tracking-[0.45em] text-ink-secondary">LUXURY SALON</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-1 p-7">
        <h1 className="text-xl font-semibold text-ink-primary">{title}</h1>
        <p className="mb-5 mt-0.5 text-sm text-ink-secondary">{subtitle}</p>
        {children}
      </div>
      <div className="mt-4 text-sm text-ink-secondary">{footer}</div>
    </div>
  );
}

function LoginForm({ audience }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "customer" ? "/app/book" : "/staff/calendar"} replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const u = await login(form.email, form.password, audience);
      navigate(u.role === "customer" ? "/app/book" : u.role === "admin" ? "/staff/dashboard" : "/staff/calendar");
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <ErrorNote>{error}</ErrorNote>
      <Field label="Email"><Input type="email" required autoFocus autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Password"><Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export const CustomerLogin = () => (
  <AuthCard title="Welcome back" subtitle="Sign in to book and manage your appointments."
    footer={<>New here? <Link to="/register" className="font-medium text-link underline-offset-2 hover:underline">Create an account</Link> · <Link to="/staff-login" className="hover:underline">Staff login</Link></>}>
    <LoginForm audience="customer" />
  </AuthCard>
);

export const StaffLogin = () => (
  <AuthCard title="Staff portal" subtitle="Salon admin and staff sign in here."
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
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
