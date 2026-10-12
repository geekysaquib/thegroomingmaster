import { useEffect, useState, useSyncExternalStore } from "react";
import { pendingRequests } from "../lib/api";

// Wait a beat before showing, so instant responses don't flash the loader.
const SHOW_AFTER_MS = 120;

// Hair strands that drop from the blade tips on every snip: [x, curl, fall-sideways (px), spin (deg), delay (s)]
const STRANDS = [[96, 1, -6, -40, 0], [104, -1, 8, 55, 0.04], [100, 1, 2, -20, 0.08], [108, -1, 12, 70, 0.02]];

/** Gold scissors that snip, drop a few hairs and sparkle. Pure SVG + CSS (see .snip-* in index.css). */
function Scissors() {
  return (
    <svg viewBox="0 0 130 80" className="h-24 w-40" aria-hidden="true">
      <defs>
        <linearGradient id="gm-gold" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#f6e6ad" /><stop offset="0.45" stopColor="#d9b04a" /><stop offset="1" stopColor="#8a6410" />
        </linearGradient>
        <linearGradient id="gm-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d9097" /><stop offset="0.6" stopColor="#d9dbe0" /><stop offset="1" stopColor="#f4f5f7" />
        </linearGradient>
      </defs>

      {/* Falling hair */}
      {STRANDS.map(([x, curl, dx, rot, delay]) => (
        <path key={x} d={`M${x} 46 q${3 * curl} 5 0 10 t0 10`} fill="none" stroke="url(#gm-gold)" strokeWidth="1.6" strokeLinecap="round"
          className="snip-hair" style={{ "--dx": `${dx}px`, "--rot": `${rot}deg`, animationDelay: `${delay}s` }} />
      ))}

      {/* The two halves rotate around the pivot at (60, 40) */}
      <g className="snip-half snip-up">
        <path d="M58 38.2 L119 40 L58 42 Z" fill="url(#gm-steel)" />
        <path d="M60 40 L26 40" stroke="url(#gm-gold)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="16" cy="40" r="9" fill="none" stroke="url(#gm-gold)" strokeWidth="3.4" />
      </g>
      <g className="snip-half snip-down">
        <path d="M58 38 L119 40 L58 41.8 Z" fill="url(#gm-steel)" />
        <path d="M60 40 L26 40" stroke="url(#gm-gold)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="16" cy="40" r="9" fill="none" stroke="url(#gm-gold)" strokeWidth="3.4" />
      </g>
      <circle cx="60" cy="40" r="3.4" fill="url(#gm-gold)" stroke="#6b4d0c" strokeWidth="0.6" />

      {/* Sparkle at the tips when the blades meet */}
      <path className="snip-spark" d="M119 40 l1.6 -5 1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6z" fill="#f6e6ad" />
    </svg>
  );
}

/** Centered loader shown whenever at least one API request is in flight. Mount once, near the app root. */
export default function GlobalLoader() {
  const busy = useSyncExternalStore(pendingRequests.subscribe, () => pendingRequests.getSnapshot() > 0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!busy) return undefined;
    const t = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => { clearTimeout(t); setShown(false); };
  }, [busy]);

  if (!busy || !shown) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-0/50 backdrop-blur-[1px]">
      <div className="flex flex-col items-center rounded-2xl border border-border bg-surface-1 px-9 py-6 shadow-xl">
        <Scissors />
        <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.3em] text-ink-secondary">Styling&hellip;</span>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
