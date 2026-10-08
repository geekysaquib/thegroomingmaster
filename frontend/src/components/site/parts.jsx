import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Logo from "../Logo";

/** Photo slot: shows /images/<name> (".jpg" assumed when no extension), otherwise a soft placeholder with the crest. */
export function Img({ name, alt = "", className = "", pos, children }) {
  const [failed, setFailed] = useState(false);
  const src = `/images/${/\.\w+$/.test(name) ? name : `${name}.jpg`}`;
  return (
    <div className={`${/absolute/.test(className) ? "" : "relative"} overflow-hidden bg-surface-2 ${className}`}>
      {!failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} style={pos ? { objectPosition: pos } : undefined} className="absolute inset-0 h-full w-full object-cover" />}
      {failed && <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true"><Logo variant="mark" className="h-1/3 max-h-24 opacity-30" /></div>}
      {children}
    </div>
  );
}

export const Container = ({ className = "", children }) => <div className={`mx-auto w-full max-w-[1280px] px-5 sm:px-8 ${className}`}>{children}</div>;

/** Small eyebrow label with a hairline */
export const SectionTag = ({ children }) => (
  <div className="mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
    <span className="h-px w-8 bg-accent" />{children}
  </div>
);

/** Serif heading; wrap highlighted words in <em> (rendered italic, gold). */
export const Heading = ({ as: Tag = "h2", className = "", children }) => (
  <Tag className={`font-head-lux text-[44px] leading-[0.98] text-ink-primary sm:text-[68px] [&_em]:not-italic [&_em]:text-inherit ${className}`}>{children}</Tag>
);

const base = "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[13px] font-medium uppercase tracking-[0.14em] transition-colors";
export function Btn({ as: Tag = "button", variant = "gold", className = "", children, arrow = true, ...p }) {
  const v = variant === "gold" ? "bg-btn text-btn-foreground hover:bg-btn-hover" : variant === "light" ? "bg-white text-ink-primary hover:bg-surface-2" : "border border-ink-primary/30 text-ink-primary hover:border-ink-primary hover:bg-ink-primary hover:text-white";
  return (
    <Tag {...p} className={`${base} ${v} ${className}`}>
      {children}
      {arrow && <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
    </Tag>
  );
}

export const Card = ({ className = "", children }) => <div className={`rounded-2xl border border-border bg-white ${className}`}>{children}</div>;
