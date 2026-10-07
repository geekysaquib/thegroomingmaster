import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_KEY not set - copy .env.example to .env");
}

export const supabase = createClient(
  process.env.SUPABASE_URL || "http://localhost",
  process.env.SUPABASE_SERVICE_KEY || "missing",
  { auth: { persistSession: false } }
);

/** Throws on a Supabase error so route handlers can stay linear. */
export function unwrap({ data, error }) {
  if (error) {
    const err = new Error(error.message);
    err.status = 400;
    throw err;
  }
  return data;
}
