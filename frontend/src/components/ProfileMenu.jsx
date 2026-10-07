import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Mail, Phone, UserPen } from "lucide-react";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";

const ROLE_LABEL = { admin: "Salon admin", staff: "Salon staff", customer: "Customer" };

/** Top-bar profile popup: avatar button -> card with details, Edit profile and Sign out. */
export default function ProfileMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Open profile menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-surface-3">
        <Avatar user={user} size={28} />
        <ChevronDown size={14} className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border bg-surface-2 p-4">
            <Avatar user={user} size={56} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-primary">{user.name}</div>
              <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">{ROLE_LABEL[user.role]}</span>
            </div>
          </div>
          <div className="space-y-1.5 border-b border-border px-4 py-3 text-xs text-ink-secondary">
            {user.email && <div className="flex items-center gap-2 truncate"><Mail size={13} className="shrink-0 text-ink-muted" />{user.email}</div>}
            {user.phone && <div className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-ink-muted" />{user.phone}</div>}
          </div>
          <div className="p-1.5">
            <button role="menuitem" onClick={() => { setOpen(false); setEditing(true); }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-ink-primary hover:bg-surface-3"><UserPen size={15} /> Edit profile &amp; picture</button>
            <button role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-ink-primary hover:bg-surface-3"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      )}
      {editing && <ProfileModal onClose={() => setEditing(false)} />}
    </div>
  );
}
