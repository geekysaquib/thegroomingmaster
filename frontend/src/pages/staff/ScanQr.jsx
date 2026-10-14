import { PageTitle } from "../../components/ui";
import { ScanPanel } from "./Settings";

// Admin page for the public "Scan to book" feature: the QR code, the printable A4 poster and the link customers' phones open (/scan).
export default function ScanQr() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageTitle subtitle="Put this QR code on your counter or mirror. Customers scan it, choose services and a time, and send a booking request - no login needed." />
      <ScanPanel />
    </div>
  );
}
