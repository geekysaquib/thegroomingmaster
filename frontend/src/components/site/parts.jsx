import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Logo from "../Logo";

/** Photo slot: shows /images/<name>.jpg when present, otherwise a dark placeholder with the crest. */
export function Img({ name, alt = "", className = "", children }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`${/absolute/.test(className) ? "" : "relative"} overflow-hidden bg-gradient-to-br from-surface-2 to-surface-3 ${className}`}>
      {!failed && <img src={`/images/${name}.jpg`} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />}
      {failed && <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true"><Logo variant="mark" className="h-1/3 max-h-24 opacity-20" /></div>}
      {children}
    </div>
  );
}

export const Container = ({ className = "", children }) => <div className={`mx-auto w-full max-w-[1320px] px-4 sm:px-6 ${className}`}>{children}</div>;

/** Small "• ABOUT US" eyebrow label */
export const SectionTag = ({ children }) => (
  <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
    <span className="h-1.5 w-1.5 rounded-full bg-accent" />{children}
  </div>
);

/** Heading with highlighted (gold) words: wrap them in <em>. */
export const Heading = ({ as: Tag = "h2", className = "", children }) => (
  <Tag className={`text-[32px] font-medium leading-[1.12] tracking-[-0.02em] text-white sm:text-[44px] [&_em]:not-italic [&_em]:text-accent ${className}`}>{children}</Tag>
);

const base = "group inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[15px] font-medium transition-colors";
export function Btn({ as: Tag = "button", variant = "gold", className = "", children, arrow = true, ...p }) {
  const v = variant === "gold" ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "border border-white/25 text-white hover:bg-white/10";
  return (
    <Tag {...p} className={`${base} ${v} ${className}`}>
      {children}
      {arrow && <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
    </Tag>
  );
}

export const Card = ({ className = "", children }) => <div className={`rounded-2xl border border-border bg-white/[0.04] ${className}`}>{children}</div>;
