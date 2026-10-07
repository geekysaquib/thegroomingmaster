import Avatar from "./Avatar";

const greeting = (d = new Date()) => { const h = d.getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

/** Greeting hero with the user's picture. `children` = quick-action buttons. */
export default function WelcomeBanner({ user, message, children }) {
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <section aria-label="Welcome" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1b1b1d] via-[#26262a] to-[#3a3326] p-5 text-white sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-[#c9b182]/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full border-[20px] border-[#c9b182]/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar user={user} size={60} className="ring-2 ring-[#c9b182]" />
          <div>
            <div className="text-xs text-[#c9b182]">{today}</div>
            <h2 className="text-xl font-semibold sm:text-2xl">{greeting()}, {user.name.split(" ")[0]}!</h2>
            {message && <p className="mt-0.5 text-sm text-white/70">{message}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </section>
  );
}
