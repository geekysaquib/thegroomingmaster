import jwt from "jsonwebtoken";
import { supabase } from "./supabase.js";

export const STAFF_ROLES = ["staff", "admin"];

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let claims;
  try { claims = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: "Session expired, please sign in again" }); }

  // Re-check the account on every call so blocking / deactivating takes effect immediately, not when the token expires.
  const { data: row, error } = await supabase.from("users").select("id, name, role, active").eq("id", claims.id).maybeSingle();
  if (error) return next(error);
  if (!row || !row.active) return res.status(401).json({ error: "Your account has been blocked. Please contact the salon." });

  req.user = { id: row.id, name: row.name, role: row.role };
  // The developer account has god mode: every permission check treats it as an admin; developer-only routes look at `developer`.
  if (row.role === "developer") Object.assign(req.user, { role: "admin", developer: true });
  next();
}

export const requireDeveloper = (req, res, next) => (req.user?.developer ? next() : res.status(403).json({ error: "Not allowed" }));

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: "Not allowed" });

/** Wraps async handlers so thrown errors reach the error middleware (Express 5 does this too, kept explicit). */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.locals.errorMessage = err.message;
  res.status(err.status || 500).json({ error: err.message || "Server error" });
}
