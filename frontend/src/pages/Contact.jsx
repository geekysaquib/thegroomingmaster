import { Clock, MapPin, Phone } from "lucide-react";
import { SALON } from "../lib/format";
import SiteLayout, { InstagramIcon } from "../components/site/SiteLayout";
import EnquiryForm from "../components/site/EnquiryForm";
import { Card, Container, Heading, SectionTag } from "../components/site/parts";

export default function Contact() {
  const items = [
    [Phone, "Call us", SALON.phones.map((p) => <a key={p} href={`tel:${p}`} className="block text-lg font-medium text-white hover:text-accent">+91 {p}</a>)],
    [MapPin, "Visit us", <a key="a" href={SALON.mapUrl} target="_blank" rel="noreferrer" className="text-lg font-medium text-white hover:text-accent">{SALON.address}</a>],
    [Clock, "Working hours", <span key="h" className="text-lg font-medium text-white">{SALON.hours}</span>],
    [InstagramIcon, "Follow us", <a key="i" href={SALON.instagramUrl} target="_blank" rel="noreferrer" className="text-lg font-medium text-white hover:text-accent">{SALON.instagram}</a>],
  ];
  return (
    <SiteLayout>
      <section className="border-b border-border py-14 sm:py-20">
        <Container>
          <SectionTag>Contact us</SectionTag>
          <Heading as="h1" className="max-w-3xl">We'd love to <em>hear from you</em></Heading>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed">Questions about a service, a booking or a price? Send us a message or call the salon directly.</p>
        </Container>
      </section>
      <section className="py-14 sm:py-20">
        <Container className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="grid gap-4">
            {items.map(([Icon, label, body]) => (
              <Card key={label} className="flex items-start gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-accent"><Icon size={18} /></span>
                <div><div className="mb-1 text-sm">{label}</div>{body}</div>
              </Card>
            ))}
          </div>
          <EnquiryForm source="contact" />
        </Container>
      </section>
      <section className="pb-20">
        <Container>
          <iframe title="Map to The Grooming Master" loading="lazy" className="h-[380px] w-full rounded-2xl border border-border [filter:grayscale(1)_invert(0.92)_contrast(0.9)]"
            src={`https://www.google.com/maps?q=${encodeURIComponent("The Grooming Master, SCO 19, Sector 89, Mohali")}&output=embed`} />
        </Container>
      </section>
    </SiteLayout>
  );
}
