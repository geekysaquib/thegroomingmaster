import { ScanPoster } from "../components/ScanPoster";

/**
 * Public "Scan to book" page (/scan): just the golden A4 poster, scaled to fit the screen. Scanning its QR opens the booking form at
 * /scan/booking. Show it on a counter tablet / screen, or print it (Ctrl+P prints one full A4 page). No login, light theme.
 */
export default function ScanQrScreen() {
  const bookingUrl = `${window.location.origin}/scan/booking`;
  return (
    <div className="min-h-full bg-[#efe6d2] px-3 py-5">
      <ScanPoster url={bookingUrl} fitHeight reserve={40} />
    </div>
  );
}
