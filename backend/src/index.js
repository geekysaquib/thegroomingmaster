import "dotenv/config";
import express from "express";
import cors from "cors";
import auth from "./routes/auth.js";
import services from "./routes/services.js";
import customers from "./routes/customers.js";
import bookings from "./routes/bookings.js";
import billing from "./routes/billing.js";
import salaries from "./routes/salaries.js";
import staff from "./routes/staff.js";
import analytics from "./routes/analytics.js";
import contact from "./routes/contact.js";
import { errorHandler } from "./middleware.js";

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set - copy backend/.env.example to backend/.env first.");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", auth);
app.use("/api/services", services);
app.use("/api/customers", customers);
app.use("/api/bookings", bookings);
app.use("/api/invoices", billing);
app.use("/api/salaries", salaries);
app.use("/api/staff", staff);
app.use("/api/analytics", analytics);
app.use("/api/contact", contact);

app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Grooming Master API on http://localhost:${port}`));
