import "dotenv/config";
import bcrypt from "bcryptjs";
import { supabase, unwrap } from "./supabase.js";

const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env");
  process.exit(1);
}

const password_hash = await bcrypt.hash(password, 10);
unwrap(await supabase.from("users").upsert(
  { name: "Salon Admin", email, role: "admin", password_hash },
  { onConflict: "email" }
));
console.log(`Admin ready: ${email}`);
