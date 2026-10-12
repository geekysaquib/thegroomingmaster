import "dotenv/config";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "./supabase.js";

// The developer (god-mode) account. Credentials come from backend/.env, never from source code.
const email = (process.env.DEV_EMAIL || "").toLowerCase();
const password = process.env.DEV_PASSWORD;
if (!email || !password) {
  console.error("Set DEV_EMAIL and DEV_PASSWORD in backend/.env");
  process.exit(1);
}
if (password.length < 12) {
  console.error("DEV_PASSWORD must be at least 12 characters - this account can see everything.");
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 12);
unwrap(await supabase.from("users").upsert(
  { name: "Developer", email, role: "developer", password_hash, active: true },
  { onConflict: "email" }
));
console.log(`Developer account ready: ${email}`);
