import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, errMsg } from "../../lib/api";
import { Btn } from "./parts";

const field = "w-full rounded-lg border border-border bg-white px-4 py-3 text-[15px] text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none";

export default function EnquiryForm({ source = "contact", cta = "Send Message" }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [state, setState] = useState({ busy: false, error: "", done: false });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, error: "", done: false });
    try { await api.post("/contact", { ...form, source }); setForm({ name: "", phone: "", email: "", message: "" }); setState({ busy: false, error: "", done: true }); }
    catch (err) { setState({ busy: false, error: errMsg(err), done: false }); }
  };

  if (state.done) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-10 text-center">
        <CheckCircle2 className="text-accent" size={40} />
        <h3 className="text-2xl font-medium text-ink-primary">Thank you!</h3>
        <p>We've received your message and will get back to you shortly.</p>
        <button onClick={() => setState({ busy: false, error: "", done: false })} className="text-sm text-accent hover:underline">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-white p-6 sm:p-8">
      {state.error && <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{state.error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="sr-only">Your name</span><input required className={field} placeholder="Your name" value={form.name} onChange={set("name")} autoComplete="name" /></label>
        <label><span className="sr-only">Phone number</span><input type="tel" className={field} placeholder="Phone number" value={form.phone} onChange={set("phone")} autoComplete="tel" /></label>
      </div>
      <label className="block"><span className="sr-only">Email address</span><input type="email" className={field} placeholder="Email address" value={form.email} onChange={set("email")} autoComplete="email" /></label>
      <label className="block"><span className="sr-only">Message</span><textarea rows={4} className={field} placeholder={source === "appointment" ? "Which service and when would you like to visit?" : "How can we help?"} value={form.message} onChange={set("message")} /></label>
      <Btn type="submit" disabled={state.busy} className="disabled:opacity-60">{state.busy ? "Sending…" : cta}</Btn>
    </form>
  );
}
