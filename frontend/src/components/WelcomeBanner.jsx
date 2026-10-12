import Avatar from "./Avatar";

const greeting = (d = new Date()) => { const h = d.getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

/** Greeting card with the user's picture. `children` = quick-action buttons. */
export default function WelcomeBanner({ user, message, children }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <section aria-label="Welcome" className="rounded-2xl border border-border bg-surface-1 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={60} className="ring-2 ring-border" />
          <div>
            <div className="text-xs text-ink-muted">{today}</div>
            <h2 className="text-xl font-semibold text-ink-primary sm:text-2xl">{greeting()}, {user.name.split(" ")[0]}!</h2>
            {message && <p className="mt-0.5 text-sm text-ink-secondary">{message}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}
