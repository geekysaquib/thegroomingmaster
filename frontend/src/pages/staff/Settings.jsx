import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, Mail, Printer, QrCode, Save, Send } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { Badge, Button, ErrorNote, Field, Input, Modal, PageTitle, Panel, Select } from "../../components/ui";
import { printSheet } from "../../components/Documents";
import { ScanPoster, qrPng, useQrSvg } from "../../components/ScanPoster";

const Ok = ({ children }) => children ? <div role="status" className="mb-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{children}</div> : null;

// Display order Monday..Sunday; `i` is the JS weekday index the API uses (0 = Sunday).
const WEEK = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [0, "Sunday"]];

export default function Settings() {
  return (
    <div className="flex min-h-full flex-col">
      <PageTitle subtitle="Salon timings and email notifications. Only admins can change these." />
      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
        <HoursPanel />
        <SmtpPanel />
      </div>
    </div>
  );
}

function HoursPanel() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ ok: "", err: "" });
  useEffect(() => { api.get("/settings/hours").then((r) => setForm(r.data)).catch((e) => setMsg({ ok: "", err: errMsg(e) })); }, []);
  if (!form) return <Panel title="Salon hours"><ErrorNote>{msg.err}</ErrorNote></Panel>;

  const setDay = (i, patch) => setForm({ ...form, days: form.days.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });
  const copyMondayToAll = () => setForm({ ...form, days: form.days.map(() => ({ ...form.days[1] })) });

  const save = async (e) => {
    e.preventDefault(); setMsg({ ok: "", err: "" });
    try {
      const { data } = await api.put("/settings/hours", { slot_min: Number(form.slot_min), days: form.days });
      setForm(data); setMsg({ ok: "Salon hours saved. Customers now see slots for these timings.", err: "" });
    } catch (err) { setMsg({ ok: "", err: errMsg(err) }); }
  };

  return (
    <Panel title="Salon hours" actions={<Button type="button" size="sm" variant="ghost" onClick={copyMondayToAll}><Copy size={13} /> Copy Monday to all</Button>}>
      <form onSubmit={save} className="space-y-3">
        <ErrorNote>{msg.err}</ErrorNote><Ok>{msg.ok}</Ok>
        <div className="divide-y divide-border rounded-md border border-border">
          {WEEK.map(([i, name]) => {
            const d = form.days[i];
            return (
              <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <div className="w-24 shrink-0 text-[13px] font-medium text-ink-primary">{name}</div>
                <label className="flex w-20 items-center gap-1.5 text-xs text-ink-secondary">
                  <input type="checkbox" checked={!d.closed} onChange={(e) => setDay(i, { closed: !e.target.checked })} /> {d.closed ? "Closed" : "Open"}
                </label>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Input type="time" required={!d.closed} disabled={d.closed} value={d.open} onChange={(e) => setDay(i, { open: e.target.value })} aria-label={`${name} opening time`} className="min-w-0 flex-1 sm:w-32 sm:flex-none" />
                  <span className="text-xs text-ink-muted">to</span>
                  <Input type="time" required={!d.closed} disabled={d.closed} value={d.close} onChange={(e) => setDay(i, { close: e.target.value })} aria-label={`${name} closing time`} className="min-w-0 flex-1 sm:w-32 sm:flex-none" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="w-40"><Field label="Slot every"><Select value={form.slot_min} onChange={(e) => setForm({ ...form, slot_min: e.target.value })}>{[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Field></div>
        <p className="text-xs text-ink-muted">Customers can book any slot between opening and closing time on that day ({form.timezone}); closed days can't be booked. The number of bookings at a slot never limits availability.</p>
        <Button type="submit"><Save size={14} /> Save hours</Button>
      </form>
    </Panel>
  );
}

/** "Scan to book": the public booking page (/scan) behind a QR code the salon can print and put on the counter. */
export function ScanPanel() {
  const url = `${window.location.origin}/scan/booking`; // what the QR code opens: the booking form
  const svg = useQrSvg(url);
  const [poster, setPoster] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy this link", url); } };
  const download = async () => { const a = document.createElement("a"); a.href = await qrPng(url); a.download = "grooming-master-scan-to-book.png"; a.click(); };

  return (
    <Panel title="Scan to book" actions={<Badge tone="success">Live</Badge>}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-44 w-44 shrink-0 bg-[#fffdf8] p-3 shadow-sm ring-1 ring-border sm:mx-0">
          {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="h-full w-full animate-pulse bg-surface-3" />}
          <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffdf8] ring-1 ring-[#d4a73c]"><img src="/images/brand/crest.png" alt="" className="h-8 w-6 object-contain" /></span>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-ink-secondary">Customers scan this code and the booking form opens: choose services and a time, add their details (existing customers are recognised, new ones are registered on the spot) and send a request - two short steps, no login. Requests appear in your calendar as <b>pending</b> for you to accept.</p>
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"><QrCode size={15} className="shrink-0 text-ink-muted" /><span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setPoster(true)}><Printer size={14} /> Print A4 poster</Button>
            <Button type="button" variant="secondary" onClick={download}><Download size={14} /> Download QR (PNG)</Button>
            <Button type="button" variant="secondary" onClick={copy}><Copy size={14} /> {copied ? "Copied!" : "Copy link"}</Button>
            <a href="/scan" target="_blank" rel="noreferrer"><Button type="button" variant="secondary"><ExternalLink size={14} /> Show QR screen</Button></a>
            <a href="/scan/booking" target="_blank" rel="noreferrer"><Button type="button" variant="secondary"><ExternalLink size={14} /> Open booking form</Button></a>
          </div>
        </div>
      </div>
      {poster && (
        <Modal title="Scan to book - A4 poster" onClose={() => setPoster(false)} wide="a4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">Print on A4 (or "Save as PDF"). Tip: set Margins to "None" and tick "Background graphics" if your browser asks.</p>
            <Button size="sm" onClick={printSheet}><Printer size={14} /> Print poster</Button>
          </div>
          <div className="max-h-[72vh] overflow-y-auto rounded-md bg-surface-2 p-3 sm:p-4"><ScanPoster url={url} /></div>
        </Modal>
      )}
    </Panel>
  );
}

const PROVIDERS = {
  gmail: { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false, help: "Turn on 2-Step Verification on the Google account, then create an app password.", link: "https://myaccount.google.com/apppasswords" },
  outlook: { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, secure: false, help: "Create an app password in your Microsoft account security settings (SMTP AUTH must be enabled).", link: "https://account.microsoft.com/security" },
  yahoo: { label: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true, help: "Account security > Generate app password.", link: "https://login.yahoo.com/account/security" },
  zoho: { label: "Zoho Mail", host: "smtp.zoho.in", port: 465, secure: true, help: "Zoho Accounts > Security > App passwords. Use smtp.zoho.com if your account isn't on the .in data centre.", link: "https://accounts.zoho.in/home#security/app_password" },
  custom: { label: "Other (custom SMTP)", host: "", port: 587, secure: false, help: "Enter your mail provider's SMTP server details.", link: "" },
};

const DOMAIN_PROVIDER = { "gmail.com": "gmail", "googlemail.com": "gmail", "outlook.com": "outlook", "hotmail.com": "outlook", "live.com": "outlook", "yahoo.com": "yahoo", "yahoo.in": "yahoo", "zoho.com": "zoho", "zoho.in": "zoho" };

function SmtpPanel() {
  const [form, setForm] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ ok: "", err: "" });
  useEffect(() => {
    api.get("/settings/smtp").then((r) => { setForm({ ...r.data, pass: "" }); setConfigured(r.data.configured); setEnabled(r.data.enabled); }).catch((e) => setMsg({ ok: "", err: errMsg(e) }));
  }, []);
  if (!form) return <Panel title="Email notifications"><ErrorNote>{msg.err}</ErrorNote></Panel>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const provider = PROVIDERS[form.provider] || PROVIDERS.custom;
  // Typing a Gmail / Outlook / Yahoo / Zoho address while on "Other" with no valid host picks that provider for you.
  const setEmail = (e) => {
    const user = e.target.value;
    const guess = DOMAIN_PROVIDER[user.split("@")[1]?.toLowerCase()];
    const hostBad = !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(form.host || "");
    if (guess && form.provider === "custom" && hostBad) { const p = PROVIDERS[guess]; setForm({ ...form, user, provider: guess, host: p.host, port: p.port, secure: p.secure }); }
    else setForm({ ...form, user });
  };
  const pickProvider = (e) => {
    const p = PROVIDERS[e.target.value];
    setForm({ ...form, provider: e.target.value, ...(e.target.value === "custom" ? {} : { host: p.host, port: p.port, secure: p.secure }) });
  };

  const save = async (e) => {
    e.preventDefault(); setMsg({ ok: "", err: "" }); setBusy("save");
    try {
      const { data } = await api.put("/settings/smtp", { provider: form.provider, host: form.host, port: Number(form.port), secure: form.secure, user: form.user, pass: form.pass, from_name: form.from_name });
      setForm({ ...data, pass: "" }); setConfigured(data.configured); setMsg({ ok: "Email settings saved. Send a test email to confirm it works.", err: "" });
    } catch (err) { setMsg({ ok: "", err: errMsg(err) }); } finally { setBusy(""); }
  };
  const toggle = async () => {
    const next = !enabled;
    setMsg({ ok: "", err: "" }); setEnabled(next);
    try { await api.put("/settings/smtp/enabled", { enabled: next }); setMsg({ ok: next ? "Email sending is ON." : "Email sending is OFF. No emails will be sent until you turn it back on.", err: "" }); }
    catch (err) { setEnabled(!next); setMsg({ ok: "", err: errMsg(err) }); }
  };
  const test = async () => {
    setMsg({ ok: "", err: "" }); setBusy("test");
    try { const { data } = await api.post("/settings/smtp/test", { to: testTo }); setMsg({ ok: `Test email sent to ${data.sent_to}.`, err: "" }); }
    catch (err) { setMsg({ ok: "", err: errMsg(err) }); } finally { setBusy(""); }
  };

  return (
    <Panel title="Email notifications" actions={<>
      <Badge tone={!configured ? "warning" : enabled ? "success" : "neutral"}>{!configured ? "Not set up" : enabled ? "Sending" : "Paused"}</Badge>
      <button type="button" role="switch" aria-checked={enabled} aria-label="Send emails" onClick={toggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted ${enabled ? "bg-success" : "bg-gray-300"}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </>}>
      <form onSubmit={save} className="space-y-3">
        <ErrorNote>{msg.err}</ErrorNote><Ok>{msg.ok}</Ok>
        <Field label="Mail provider"><Select value={form.provider} onChange={pickProvider}>{Object.entries(PROVIDERS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}</Select></Field>
        <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-ink-secondary">
          Sign in with an <b>app password</b>, not your normal mailbox password. {provider.help}
          {provider.link && <> <a href={provider.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-link hover:underline">Open <ExternalLink size={11} /></a></>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email address" hint={form.host === "smtp.gmail.com" && !/@(gmail|googlemail)\.com$/i.test(form.user) ? "Gmail only accepts the Google account that created the app password (e.g. yourname@gmail.com), not another domain." : ""}><Input type="email" required autoComplete="off" placeholder="salon@gmail.com" value={form.user} onChange={setEmail} /></Field>
          <Field label="App password" hint={form.has_pass ? "Saved - leave blank to keep it" : "Spaces are ignored"}><Input type="password" autoComplete="new-password" required={!form.has_pass} value={form.pass} onChange={set("pass")} /></Field>
        </div>
        <Field label="Sender name" hint="Shown to recipients as the sender"><Input value={form.from_name} onChange={set("from_name")} /></Field>
        {form.provider === "custom" && (
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label="SMTP host" hint="A server name like smtp.example.com, not an email address"><Input required placeholder="smtp.example.com" value={form.host} onChange={set("host")} /></Field></div>
            <Field label="Port"><Input type="number" required value={form.port} onChange={set("port")} /></Field>
            <label className="col-span-3 flex items-center gap-2 text-sm text-ink-secondary"><input type="checkbox" checked={form.secure} onChange={(e) => setForm({ ...form, secure: e.target.checked })} /> Use SSL/TLS (usually port 465). Leave off for STARTTLS on 587.</label>
          </div>
        )}
        <Button type="submit" disabled={busy === "save"}><Save size={14} /> Save email settings</Button>
        <div className="flex items-end gap-2 border-t border-border pt-3">
          <div className="flex-1"><Field label="Send a test email to"><Input type="email" placeholder="Defaults to your account email" value={testTo} onChange={(e) => setTestTo(e.target.value)} /></Field></div>
          <Button type="button" variant="secondary" disabled={!configured || busy === "test"} onClick={test}><Send size={14} /> Send test</Button>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-ink-muted"><Mail size={13} className="mt-0.5 shrink-0" /> While the switch is on and email is set up, emails go out for new bookings, status changes, e-bills and invoices, salary slips and new staff accounts.</p>
      </form>
    </Panel>
  );
}
