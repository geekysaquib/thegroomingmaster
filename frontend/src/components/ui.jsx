import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, XCircle, Clock3, Info } from "lucide-react";

// Primitives styled after the monoZHub console (Panel, MetricCard, TanStack-style table, status badges).

export function Panel({ title, actions, className = "", bodyClassName = "p-4", children }) {
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-surface-1 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="text-[13px] font-semibold text-ink-primary">{title}</div>
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, icon, hint }) {
  return (
    <div className="rounded-md border border-border bg-surface-1 p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span>
        {icon && <span className="text-ink-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <div className="mt-1.5 text-2xl font-semibold leading-tight text-ink-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

/**
 * Page heading. Like monoZHub, the title + breadcrumb live in the top bar (rendered by Shell) and a page's
 * actions are portalled into the bar's right-hand slot; only an optional subtitle stays in the page body.
 */
export function PageTitle({ subtitle, actions }) {
  const [slot, setSlot] = useState(null);
  useEffect(() => { setSlot(document.getElementById("topbar-actions")); }, []);
  return (
    <>
      {slot && actions ? createPortal(actions, slot) : null}
      {subtitle && <p className="mb-3 text-[13px] text-ink-secondary">{subtitle}</p>}
    </>
  );
}

const btn = {
  primary: "bg-btn text-btn-foreground hover:bg-btn-hover",
  secondary: "border border-border bg-surface-1 text-ink-primary hover:bg-surface-3",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-ink-secondary hover:bg-surface-3",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }) {
  const sz = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-[13px]";
  return (
    <button {...props}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${btn[variant]} ${className}`} />
  );
}

const field = "w-full rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink-primary placeholder:text-ink-muted focus:border-ink-muted focus:outline-none focus:ring-1 focus:ring-ink-muted";

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-ink-secondary">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
export const Input = ({ className = "", ...p }) => <input {...p} className={`${field} ${className}`} />;
export const Select = ({ className = "", children, ...p }) => <select {...p} className={`${field} ${className}`}>{children}</select>;
export const Textarea = ({ className = "", ...p }) => <textarea {...p} className={`${field} ${className}`} />;

const tones = {
  success: ["bg-success/15 text-success", CheckCircle2], warning: ["bg-warning/15 text-warning", Clock3],
  danger: ["bg-danger/15 text-danger", XCircle], info: ["bg-info/15 text-info", Info], neutral: ["bg-surface-3 text-ink-secondary", null],
};
/** Pill badge with a leading status icon, like the READY badge in monoZHub's tenant table. */
export function Badge({ tone = "neutral", children }) {
  const [cls, Icon] = tones[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {Icon && <Icon size={11} />}{children}
    </span>
  );
}

export const statusTone = { booked: "info", completed: "success", cancelled: "danger", no_show: "warning", paid: "success", pending: "warning" };

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-lg border border-border bg-surface-1 shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-primary">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-muted hover:bg-surface-3"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

const PAGE_SIZES = [10, 25, 50, 100];

/** Table with monoZHub's compact uppercase header and "Show N  « ‹ 1 / 3 › »" footer. */
export function DataTable({ columns, rows, empty = "Nothing here yet.", onRowClick, pageSize: initialSize = 50 }) {
  const [size, setSize] = useState(initialSize);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * size, current * size);
  const go = (p) => setPage(Math.min(Math.max(1, p), pages));
  const nav = "flex h-7 w-7 items-center justify-center text-ink-muted hover:bg-surface-3 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-[0.08em] text-ink-muted">
              {columns.map((c) => <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.className || ""}`}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-muted">{empty}</td></tr>}
            {visible.map((r, i) => (
              <tr key={r.id ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`h-11 border-b border-border last:border-0 ${onRowClick ? "cursor-pointer hover:bg-surface-2" : ""}`}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-2 text-ink-primary ${c.className || ""}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-ink-secondary">
          <label className="flex items-center gap-2">Show
            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-border bg-surface-1 px-2 py-1 text-xs text-ink-primary">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="flex items-center overflow-hidden rounded-md border border-border">
            <button className={nav} disabled={current === 1} onClick={() => go(1)} aria-label="First page"><ChevronsLeft size={14} /></button>
            <button className={nav} disabled={current === 1} onClick={() => go(current - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
            <span className="border-x border-border bg-surface-2 px-3 py-1 font-medium text-ink-primary">{current}</span>
            <span className="px-2.5 text-ink-muted">/ {pages}</span>
            <button className={nav} disabled={current === pages} onClick={() => go(current + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
            <button className={nav} disabled={current === pages} onClick={() => go(pages)} aria-label="Last page"><ChevronsRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Spinner = () => <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>;
export const ErrorNote = ({ children }) => children ? <div role="alert" className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{children}</div> : null;
