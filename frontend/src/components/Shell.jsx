import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, CalendarPlus, ChevronsLeft, ChevronsRight, ListChecks, LogOut, Menu, Moon, Receipt, Scissors, Sun, UserCog, Users, Wallet } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useThemeMode } from "../lib/theme";
import Logo from "./Logo";

// Layout mirrors monoZHub's console: a slim icon rail of modules, a white sidebar listing the active
// module's pages, and a top bar with the page title + breadcrumb and a slot for the page's actions.
// Each group = one rail icon; its items fill the sidebar.
const NAV = {
  customer: [
    { id: "appointments", label: "Appointments", icon: CalendarPlus, items: [
      { to: "/app/book", label: "Book Appointment", icon: CalendarPlus },
      { to: "/app/bookings", label: "My Bookings", icon: ListChecks },
    ] },
  ],
  staff: [
    { id: "salon", label: "Salon", icon: CalendarDays, items: [
      { to: "/staff/calendar", label: "Booking Calendar", icon: CalendarDays },
      { to: "/staff/new-booking", label: "New Booking", icon: CalendarPlus },
      { to: "/staff/customers", label: "Customers", icon: Users },
    ] },
    { id: "payroll", label: "Payroll", icon: Wallet, items: [{ to: "/staff/salaries", label: "My Salary Slips", icon: Wallet }] },
  ],
  admin: [
    { id: "overview", label: "Overview", icon: BarChart3, items: [{ to: "/staff/dashboard", label: "Sales Dashboard", icon: BarChart3 }] },
    { id: "salon", label: "Salon", icon: CalendarDays, items: [
      { to: "/staff/calendar", label: "Booking Calendar", icon: CalendarDays },
      { to: "/staff/new-booking", label: "New Booking", icon: CalendarPlus },
      { to: "/staff/customers", label: "Customers", icon: Users },
      { to: "/staff/services", label: "Services", icon: Scissors },
    ] },
    { id: "finance", label: "Finance", icon: Receipt, items: [
      { to: "/staff/billing", label: "Billing", icon: Receipt },
      { to: "/staff/salaries", label: "Salaries", icon: Wallet },
    ] },
    { id: "team", label: "Team", icon: UserCog, items: [{ to: "/staff/team", label: "Team", icon: UserCog }] },
  ],
};

export default function Shell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mode, toggleMode] = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const groups = NAV[user.role] || NAV.customer;
  const active = groups.find((g) => g.items.some((i) => pathname.startsWith(i.to))) || groups[0];
  const page = active.items.find((i) => pathname.startsWith(i.to)) || active.items[0];
  const home = groups[0].items[0].to;

  const signOut = () => { logout(); navigate("/"); };
  const toggleSidebar = () => (window.matchMedia("(min-width: 1024px)").matches ? setCollapsed((c) => !c) : setMobileOpen((o) => !o));

  const railBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-3";

  return (
    <div className="flex h-full bg-surface-0 text-ink-primary">
      {/* Icon rail */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-surface-0 py-2">
        <Link to="/" title="The Grooming Master" className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#1c1c1c]">
          <Logo variant="mark" className="h-[22px]" />
        </Link>
        {groups.map((g) => (
          <button key={g.id} title={g.label} aria-label={g.label} onClick={() => navigate(g.items[0].to)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${g.id === active.id ? "bg-accent text-accent-foreground" : "text-ink-secondary hover:bg-surface-3"}`}>
            <g.icon size={16} />
          </button>
        ))}
        <div className="flex-1" />
        <button className={railBtn} onClick={toggleMode} title="Toggle light / dark" aria-label="Toggle light or dark mode">{mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
        <button className={railBtn} onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={15} /></button>
        <button className={`${railBtn} hidden lg:flex`} onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label="Toggle sidebar">
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${mobileOpen ? "fixed inset-y-0 left-11 z-40 flex" : "hidden"} ${collapsed ? "lg:hidden" : "lg:flex"} w-[216px] shrink-0 flex-col border-r border-border bg-surface-1`}>
        <div className="px-4 py-3">
          <div className="text-sm font-semibold leading-tight">The Grooming Master</div>
          <div className="text-[10px] text-ink-muted">Luxury salon console</div>
        </div>
        <div className="mx-0 border-t border-border px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{active.label}</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-1">
          {active.items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium ${isActive ? "bg-accent text-accent-foreground" : "text-ink-secondary hover:bg-surface-3 hover:text-ink-primary"}`}>
              <Icon size={15} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-2 text-xs text-ink-muted">
          <div className="truncate font-medium text-ink-secondary">{user.name}</div>
          <div>{user.role === "admin" ? "Salon admin" : user.role === "staff" ? "Salon staff" : "Customer"}</div>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 border-t border-border px-4 py-3 text-[13px] text-ink-secondary hover:bg-surface-3"><LogOut size={14} /> Logout</button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[42px] shrink-0 items-center gap-3 border-b border-border bg-surface-1 px-4">
          <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="text-ink-muted hover:text-ink-primary"><Menu size={16} /></button>
          <h1 className="text-[15px] font-semibold">{page.label}</h1>
          <nav aria-label="Breadcrumb" className="hidden text-[11px] text-link sm:block">
            <Link to={home} className="hover:underline">Home</Link> <span className="text-ink-muted">/</span> <span>{page.label}</span>
          </nav>
          <div id="topbar-actions" className="ml-auto flex items-center gap-2" />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"><Outlet /></main>
      </div>
    </div>
  );
}
