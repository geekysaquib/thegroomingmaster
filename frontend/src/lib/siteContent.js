// Copy for the public homepage. Everything marked SAMPLE is placeholder wording written for the
// layout - replace it with the salon's real products, team, plans, reviews and posts before launch.
// Real data (services, prices, phones, address) comes from the API / lib/format.js.

export const ABOUT_POINTS = [
  { title: "Creative Expertise", text: "Our stylists blend classic technique with current trends, from precision cuts to colour and keratin finishes." },
  { title: "Personalised Service", text: "Every visit starts with a conversation, so the result suits your hair, your face and your routine." },
];

export const BENEFITS = [
  "A proper consultation before every service",
  "Salon-grade products chosen for your hair and skin",
  "Skilled hands for men's and women's grooming",
  "A calm, clean and comfortable studio atmosphere",
];

export const WHY = [
  { icon: "user", title: "Personalised Approach", text: "Services tailored to your look, lifestyle and maintenance needs." },
  { icon: "scissors", title: "Experienced Stylists", text: "Trained hands for cuts, colour, smoothing, waxing and more." },
  { icon: "crown", title: "Premium Experience", text: "A relaxed, luxurious studio from the moment you walk in." },
  { icon: "badge", title: "Results That Last", text: "Quality products and technique that keep looking good for longer." },
];

// SAMPLE
export const PLANS = [
  { name: "Essential", price: "Rs 999", per: "month", text: "Regular grooming made easy.", perks: ["Monthly haircut or blow dry", "Priority booking", "10% off add-on services", "Birthday treat"] },
  { name: "Signature", price: "Rs 2,499", per: "month", featured: true, text: "Our most popular plan for regulars.", perks: ["Two services every month", "Free head massage", "15% off products", "Complimentary touch-up"] },
  { name: "Elite", price: "Rs 4,999", per: "month", text: "The full luxury treatment.", perks: ["Four services every month", "Priority weekend slots", "20% off all services", "Exclusive member offers"] },
];

// SAMPLE - names/roles are placeholders
export const TEAM = [
  { name: "Senior Stylist", role: "Cuts • Styling" },
  { name: "Colour Specialist", role: "Colour • Keratin • Smoothing" },
  { name: "Grooming Expert", role: "Beard • Male Grooming" },
];

// SAMPLE - replace with real client reviews
export const TESTIMONIALS = [
  { name: "Client Name", role: "Regular client", text: "Replace this with a real review. Friendly team, a clean studio and a result I loved." },
  { name: "Client Name", role: "Colour client", text: "Replace this with a real review. They listened carefully and the colour came out exactly as I hoped." },
  { name: "Client Name", role: "Grooming client", text: "Replace this with a real review. A sharp cut and a relaxed visit from start to finish." },
  { name: "Client Name", role: "Skin & waxing client", text: "Replace this with a real review. Gentle, professional and very hygienic." },
];

export const FAQ = [
  { q: "How do I choose the right product?", a: "Tell us about your hair type and concerns through the enquiry form or at the studio, and our stylists will recommend a routine." },
  { q: "Are the products suitable for Indian hair types?", a: "Our edit is chosen with Indian hair in mind, from fine and straight to thick, wavy and coloured hair." },
  { q: "Can I buy products at the studio?", a: "Yes. Every product on this page is available at our Sector 89, Mohali studio. Use Enquire and we'll hold it for you." },
  { q: "Do you accept walk-ins for salon services?", a: "Walk-ins are welcome when a stylist is free, but booking online guarantees your slot." },
  { q: "Can I change or cancel my appointment?", a: "Yes. Sign in to your account and cancel from My Bookings, or call us and we'll rebook you." },
  { q: "Do you offer consultations?", a: "Every service begins with a short consultation so we agree on the result before we start." },
];

// SAMPLE
export const BLOG = [
  { tag: "Hair Care", title: "How to keep your colour looking fresh between visits" },
  { tag: "Skin", title: "Waxing aftercare: what to do and what to avoid" },
  { tag: "Grooming", title: "Beard styling basics for every face shape" },
];

// SAMPLE - product names, prices and descriptions are placeholders for the layout; replace with the real range.
// "group" drives the Bestsellers filter tabs. Images live in /public/images/home.
export const PRODUCT_GROUPS = ["All", "Cleanse", "Treat", "Style"];
export const PRODUCTS = [
  { id: "shampoo", name: "Silk Repair Shampoo", type: "Shampoo · 250 ml", group: "Cleanse", price: 649, mrp: 799, img: "home/shampoo.jpg", tag: "Bestseller", benefit: "Gently cleanses while repairing damaged lengths." },
  { id: "conditioner", name: "Silk Repair Conditioner", type: "Conditioner · 250 ml", group: "Cleanse", price: 699, img: "home/conditioner.jpg", benefit: "Detangles and seals in softness and shine." },
  { id: "serum", name: "Argan & Amla Hair Serum", type: "Leave-in serum · 50 ml", group: "Treat", price: 899, img: "home/serum.jpg", tag: "New", benefit: "Tames frizz and adds glass-like shine." },
  { id: "mask", name: "Deep Nourish Hair Mask", type: "Hair mask · 200 g", group: "Treat", price: 1099, img: "home/mask.jpg", tag: "Bestseller", benefit: "Intense weekly repair for dry, coloured hair." },
  { id: "oil", name: "Bhringraj Scalp Oil", type: "Hair oil · 100 ml", group: "Treat", price: 749, img: "home/oil.jpg", benefit: "A traditional blend for a healthy, nourished scalp." },
  { id: "mist", name: "Heat Shield Styling Mist", type: "Styling mist · 150 ml", group: "Style", price: 599, img: "home/mist.jpg", benefit: "Light hold and protection up to 220°C." },
];

export const CATEGORIES = [
  { name: "Shampoo", img: "home/shampoo.jpg", group: "Cleanse" },
  { name: "Conditioner", img: "home/conditioner.jpg", group: "Cleanse" },
  { name: "Serums & Oils", img: "home/serum.jpg", group: "Treat" },
  { name: "Masks", img: "home/mask.jpg", group: "Treat" },
  { name: "Styling", img: "home/mist.jpg", group: "Style" },
];

export const INGREDIENTS = [
  { name: "Argan oil", text: "Softens and adds shine without weight." },
  { name: "Amla", text: "A time-honoured Indian ingredient for strong-looking hair." },
  { name: "Bhringraj", text: "Traditionally used to nourish the scalp." },
  { name: "Coconut", text: "Deep moisture for dry, thirsty lengths." },
];

