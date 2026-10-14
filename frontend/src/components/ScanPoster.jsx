import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { A4Sheet } from "./Documents";
import { SALON } from "../lib/format";

const SERIF = { fontFamily: '"Cormorant Garamond", Georgia, serif' };
const KEEP = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
const GOLD_BAR = "linear-gradient(90deg, #f3dc94, #d4a73c 50%, #a77a1c)";
// very faint gold diamond lattice behind the poster (inline SVG)
const LATTICE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M24 2 46 24 24 46 2 24Z' fill='none' stroke='%23d4a73c' stroke-opacity='0.13' stroke-width='1'/%3E%3C/svg%3E")`;
const GOLD_TEXT = { backgroundImage: "linear-gradient(180deg, #e9c867 0%, #b88a22 60%, #8e6512 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };

/** QR code as an inline SVG string (dark modules on a transparent background; error-correction H so a logo can sit in the middle). */
export function useQrSvg(url) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "H", color: { dark: "#1a1610", light: "#0000" } }).then((s) => live && setSvg(s)).catch(() => live && setSvg(""));
    return () => { live = false; };
  }, [url]);
  return svg;
}

/** A square QR (as PNG data URL) for download / sharing. */
export const qrPng = (url, size = 1024) => QRCode.toDataURL(url, { width: size, margin: 2, errorCorrectionLevel: "H", color: { dark: "#1a1610", light: "#fffdf8" } });

function Corner({ pos }) {
  const base = "pointer-events-none absolute h-9 w-9 border-[#d4a73c]";
  const map = { tl: "-left-1 -top-1 border-l-[3px] border-t-[3px]", tr: "-right-1 -top-1 border-r-[3px] border-t-[3px]", bl: "-bottom-1 -left-1 border-b-[3px] border-l-[3px]", br: "-bottom-1 -right-1 border-b-[3px] border-r-[3px]" };
  return <span aria-hidden="true" className={`${base} ${map[pos]}`} />;
}

/** The QR in a gold bracket frame with the crest in the middle. `size` = QR side in px. */
export function QrFrame({ url, size = 330 }) {
  const svg = useQrSvg(url);
  const logo = Math.round(size * 0.22);
  return (
    <div className="relative bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgba(122,86,20,0.18)] sm:p-7" style={KEEP}>
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
      <div className="relative" style={{ width: size, height: size }}>
        {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="QR code to book an appointment" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="h-full w-full animate-pulse bg-[#f6ecd5]" />}
        <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffdf8] ring-2 ring-[#d4a73c]" style={{ width: logo, height: logo }}><img src="/images/brand/crest.png" alt="" className="object-contain" style={{ height: logo * 0.76, width: logo * 0.54 }} /></span>
      </div>
    </div>
  );
}

/** The A4 counter / table-top poster: crest, "Scan to Book", the QR in a gold frame, three steps and the salon details. */
export function ScanPoster({ url, fitHeight = false }) {
  const svg = useQrSvg(url);
  return (
    <A4Sheet fitHeight={fitHeight}>
      <div className="relative flex flex-1 flex-col items-center px-14 pb-9 pt-10 text-center" style={{ ...KEEP, backgroundImage: LATTICE }}>
        {/* gold bars top and bottom */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3" style={{ backgroundImage: GOLD_BAR, ...KEEP }} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3" style={{ backgroundImage: GOLD_BAR, ...KEEP }} />
        {/* double gold frame */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-6 border-2 border-[#d4a73c]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[34px] border border-[#d4a73c]/60" />

        <img src="/images/brand/crest.png" alt="" className="h-[100px] w-[72px] object-contain" />
        <div className="mt-2.5 text-[36px] font-semibold leading-none tracking-wide text-[#1a1610]" style={SERIF}>The Grooming Master</div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.4em] text-[#946c14]">Luxury Salon · Mohali</div>

        <div aria-hidden="true" className="mt-4 flex w-56 items-center gap-3"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4a73c]" /><span className="h-1.5 w-1.5 rotate-45 bg-[#d4a73c]" /><span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4a73c]" /></div>

        <h1 className="mt-3 font-semibold" style={{ ...SERIF, ...GOLD_TEXT }}>
          <span className="block text-[78px] leading-[0.95]">Scan to Book</span>
          <span className="block text-[48px] leading-[1.05] tracking-[0.04em]">Appointment</span>
        </h1>
        <p className="mt-2 text-[17px] italic text-[#5f5342]" style={SERIF}>Book your visit in under a minute</p>

        {/* QR in a gold bracket frame, crest in the middle */}
        <div className="relative mt-5 bg-[#fffdf8] p-6 shadow-[0_8px_30px_rgba(122,86,20,0.18)]" style={KEEP}>
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
          <div className="relative h-[290px] w-[290px]">
            {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="h-full w-full animate-pulse bg-[#f6ecd5]" />}
            <span className="absolute left-1/2 top-1/2 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffdf8] ring-2 ring-[#d4a73c]"><img src="/images/brand/crest.png" alt="" className="h-[50px] w-[36px] object-contain" /></span>
          </div>
        </div>
        <p className="mt-3 text-[13px] font-medium text-[#5f5342]">Point your phone camera at the code</p>

        <ol className="mt-5 grid w-full max-w-[560px] grid-cols-3 gap-4">
          {[["1", "Choose", "your services"], ["2", "Pick", "a day & time"], ["3", "Relax", "we'll confirm it"]].map(([n, a, b]) => (
            <li key={n} className="flex flex-col items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d4a73c] bg-[#f6ecd5] text-[16px] font-semibold text-[#946c14]" style={{ ...SERIF, ...KEEP }}>{n}</span>
              <span className="mt-2 text-[20px] font-semibold leading-none text-[#1a1610]" style={SERIF}>{a}</span>
              <span className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5342]">{b}</span>
            </li>
          ))}
        </ol>

        <div className="mt-auto w-full pt-5">
          <div className="mb-4 h-px bg-gradient-to-r from-transparent via-[#d4a73c] to-transparent" />
          <p className="text-[22px] italic text-[#946c14]" style={SERIF}>Look good, feel great!</p>
          <p className="mt-1.5 text-[11px] text-[#5f5342]">{SALON.address}</p>
          <p className="text-[11px] text-[#5f5342]">{SALON.phones.join("  ·  ")}  ·  {SALON.instagram}</p>
        </div>
      </div>
    </A4Sheet>
  );
}
