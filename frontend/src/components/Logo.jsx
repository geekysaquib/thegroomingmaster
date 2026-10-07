import { useId } from "react";

// The Grooming Master crest: crowned shield, CM monogram, scissors and laurel branches,
// redrawn as SVG from the salon's price-list artwork.

function laurelLeaves() {
  // Leaves along a curved stem (left side); the right side is mirrored in the component.
  const P0 = [96, 182], P1 = [10, 150], P2 = [44, 58];
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const t = 0.06 + i * 0.105;
    const x = (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0];
    const y = (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1];
    const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
    const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const size = 1.05 - i * 0.05;
    for (const side of [-1, 1]) {
      // Leaf sprouts from the stem, pointing toward the branch tip at +/-50deg from the tangent.
      const dir = ang + side * 50, rad = (dir * Math.PI) / 180, off = 12 * size;
      leaves.push({ x: x + Math.cos(rad) * off, y: y + Math.sin(rad) * off, rot: dir, s: size, key: `${i}${side}` });
    }
  }
  return { stem: `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`, leaves };
}
const LAUREL = laurelLeaves();

export default function Logo({ variant = "crest", className = "", title = "The Grooming Master" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gold = `gold${uid}`, dark = `dark${uid}`;
  const viewBox = variant === "crest" ? "0 14 300 190" : "100 16 100 176";

  const laurel = (
    <g>
      <path d={LAUREL.stem} fill="none" stroke={`url(#${gold})`} strokeWidth="2.2" strokeLinecap="round" />
      {LAUREL.leaves.map((l) => (
        <ellipse key={l.key} cx={l.x} cy={l.y} rx={4.6 * l.s} ry={12 * l.s} fill={`url(#${gold})`}
          stroke="#7a5606" strokeWidth="0.5" transform={`rotate(${l.rot + 90} ${l.x} ${l.y})`} />
      ))}
    </g>
  );

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#f8e9ae" /><stop offset="0.35" stopColor="#d9b04a" />
          <stop offset="0.7" stopColor="#b8860b" /><stop offset="1" stopColor="#8a6410" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b2810" /><stop offset="1" stopColor="#170d04" />
        </linearGradient>
      </defs>

      {variant === "crest" && (
        <>
          {laurel}
          <g transform="translate(300 0) scale(-1 1)">{laurel}</g>
        </>
      )}

      {/* Crown */}
      <path d="M121 58 L116 33 L134 46 L150 24 L166 46 L184 33 L179 58 Z" fill={`url(#${gold})`} stroke="#7a5606" strokeWidth="1" strokeLinejoin="round" />
      <rect x="120" y="57" width="60" height="8" rx="1.5" fill={`url(#${gold})`} stroke="#7a5606" strokeWidth="1" />
      {[[116, 31], [150, 21], [184, 31]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.4" fill={`url(#${gold})`} stroke="#7a5606" strokeWidth="0.8" />)}
      {[132, 141, 150, 159, 168].map((x) => <circle key={x} cx={x} cy="61" r="1.5" fill="#3b2810" />)}

      {/* Shield */}
      <path d="M103 70 H197 V128 C197 158 177 177 150 190 C123 177 103 158 103 128 Z" fill={`url(#${dark})`} stroke={`url(#${gold})`} strokeWidth="4" strokeLinejoin="round" />
      <path d="M110 77 H190 V128 C190 153 173 169 150 181 C127 169 110 153 110 128 Z" fill="none" stroke={`url(#${gold})`} strokeWidth="1.2" />

      {/* CM monogram */}
      <text x="150" y="130" textAnchor="middle" fontFamily="Cinzel, 'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="46" letterSpacing="-7" fill={`url(#${gold})`}>CM</text>

      {/* Scissors */}
      <g stroke={`url(#${gold})`} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M150 163 L141 146 M150 163 L159 146" />
        <path d="M150 163 L143 171 M150 163 L157 171" />
        <circle cx="140" cy="174" r="4.3" /><circle cx="160" cy="174" r="4.3" />
      </g>
    </svg>
  );
}
