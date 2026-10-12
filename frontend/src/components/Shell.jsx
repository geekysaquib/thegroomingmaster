import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bug, CalendarDays, CalendarPlus, ChevronsLeft, ChevronsRight, ListChecks, LogOut, Menu, Moon, Receipt, Scissors, Settings, Sun, UserCog, Users, Wallet } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useThemeMode } from "../lib/theme";
import Logo from "./Logo";
import Avatar from "./Avatar";
import ProfileMenu from "./ProfileMenu";
import { Button, Modal } from "./ui";

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
      { to: "/salon/calendar", label: "Booking Calendar", icon: CalendarDays },
      { to: "/salon/new-booking", label: "New Booking", icon: CalendarPlus },
    ] },
    { id: "customers", label: "Customers", icon: Users, items: [{ to: "/salon/customers", label: "Customers", icon: Users }] },
    { id: "payroll", label: "Payroll", icon: Wallet, items: [{ to: "/salon/salaries", label: "My Salary Slips", icon: Wallet }] },
  ],
  admin: [
    { id: "overview", label: "Overview", icon: BarChart3, items: [{ to: "/salon/dashboard", label: "Sales Dashboard", icon: BarChart3 }] },
    { id: "salon", label: "Salon", icon: CalendarDays, items: [
      { to: "/salon/calendar", label: "Booking Calendar", icon: CalendarDays },
      { to: "/salon/new-booking", label: "New Booking", icon: CalendarPlus },
    ] },
    { id: "customers", label: "Customers", icon: Users, items: [{ to: "/salon/customers", label: "Customers", icon: Users }] },
    { id: "services", label: "Services", icon: Scissors, items: [{ to: "/salon/services", label: "Services", icon: Scissors }] },
    { id: "finance", label: "Finance", icon: Receipt, items: [
      { to: "/salon/billing", label: "Billing", icon: Receipt },
      { to: "/salon/salaries", label: "Salaries", icon: Wallet },
    ] },
    { id: "team", label: "Team", icon: UserCog, items: [{ to: "/salon/team", label: "Team", icon: UserCog }] },
    { id: "settings", label: "Settings", icon: Settings, items: [{ to: "/salon/settings", label: "Salon & Email", icon: Settings }] },
  ],
};

// God mode: everything an admin sees, plus the developer's watch page.
NAV.developer = [...NAV.admin, { id: "developer", label: "Developer", icon: Bug, items: [{ to: "/salon/developer", label: "Activity & errors", icon: Bug }] }];

export default function Shell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mode, toggleMode] = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  // Sidebar starts collapsed (icon rail only); the choice is remembered per browser.
  const [collapsed, setCollapsedState] = useState(() => { try { return localStorage.getItem("gm_sidebar") !== "open"; } catch { return true; } });
  const setCollapsed = (next) => setCollapsedState((c) => {
    const value = typeof next === "function" ? next(c) : next;
    try { localStorage.setItem("gm_sidebar", value ? "closed" : "open"); } catch { /* storage blocked */ }
    return value;
  });

  const groups = NAV[user.role] || NAV.customer;
  const active = groups.find((g) => g.items.some((i) => pathname.startsWith(i.to))) || groups[0];
  const page = active.items.find((i) => pathname.startsWith(i.to)) || active.items[0];
  const home = groups[0].items[0].to;

  const askSignOut = () => { setMobileOpen(false); setConfirmingLogout(true); };
  const signOut = () => { logout(); navigate("/"); };
  const toggleSidebar = () => (window.matchMedia("(min-width: 1024px)").matches ? setCollapsed((c) => !c) : setMobileOpen((o) => !o));

  const railBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-3";

  return (
    <div className="flex h-full bg-surface-0 text-ink-primary">
      {/* Icon rail */}
      <div className="flex w-11 shrink-0 flex-col items-center gap-1.5 border-r border-border bg-surface-0 py-2">
        <Link to="/" title="The Grooming Master" className="mb-1 block h-8 w-8 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted">
          <Logo variant="badge" className="h-8 w-8" />
        </Link>
        {groups.map((g) => (
          <button key={g.id} title={g.label} aria-label={g.label} onClick={() => navigate(g.items[0].to)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${g.id === active.id ? "bg-accent text-accent-foreground" : "text-ink-secondary hover:bg-surface-3"}`}>
            <g.icon size={16} />
          </button>
        ))}
        <div className="flex-1" />
        <button className={railBtn} onClick={toggleMode} title="Toggle light / dark" aria-label="Toggle light or dark mode">{mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
        <button className={railBtn} onClick={askSignOut} title="Sign out" aria-label="Sign out"><LogOut size={15} /></button>
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
        <div className="flex items-center gap-2.5 border-t border-border px-4 py-2.5 text-xs text-ink-muted">
          <Avatar user={user} size={30} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink-secondary">{user.name}</div>
            <div>{user.role === "developer" ? "Developer" : user.role === "admin" ? "Salon admin" : user.role === "staff" ? "Salon staff" : "Customer"}</div>
          </div>
        </div>
        <button onClick={askSignOut} className="flex items-center gap-2 border-t border-border px-4 py-3 text-[13px] text-ink-secondary hover:bg-surface-3"><LogOut size={14} /> Logout</button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[42px] shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-surface-1 px-3 py-1.5 sm:flex-nowrap sm:px-4 sm:py-0">
          <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="-m-1 p-1 text-ink-muted hover:text-ink-primary"><Menu size={18} /></button>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold sm:flex-none">{page.label}</h1>
          <nav aria-label="Breadcrumb" className="hidden text-[11px] text-link sm:block">
            <Link to={home} className="hover:underline">Home</Link> <span className="text-ink-muted">/</span> <span>{page.label}</span>
          </nav>
          {/* Phones: the page's action buttons drop to their own row under the title (wrapper is display:contents); from sm up they sit in the bar beside the profile. */}
          <div className="contents sm:ml-auto sm:flex sm:items-center sm:gap-2">
            <div id="topbar-actions" className="order-last flex w-full flex-wrap items-center gap-2 empty:hidden sm:order-none sm:w-auto sm:flex-nowrap" />
            <div className="ml-auto sm:ml-0"><ProfileMenu user={user} onSignOut={askSignOut} /></div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"><Outlet /></main>
      </div>
      {confirmingLogout && (
        <Modal title="Log out" onClose={() => setConfirmingLogout(false)}>
          <p className="text-sm text-ink-secondary">Are you sure you want to log out?</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" autoFocus onClick={() => setConfirmingLogout(false)}>Cancel</Button>
            <Button onClick={signOut}><LogOut size={14} /> Log out</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
