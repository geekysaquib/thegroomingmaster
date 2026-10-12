import { supabase } from "../supabase.js";

/** Writes one row to activity_log. Never throws - logging must not break a request. */
export async function logEvent(row) {
  try {
    const { error } = await supabase.from("activity_log").insert(row);
    if (error) console.error("[activity] insert failed:", error.message);
  } catch (e) { console.error("[activity] insert failed:", e.message); }
}

/**
 * Records every write (POST/PUT/PATCH/DELETE) and every failed request, with who did it. Bodies are never stored.
 * The row is written before the response is flushed: serverless hosts can freeze the function once it has replied.
 */
export function activityLogger(req, res, next) {
  if (req.path === "/api/health") return next();
  const json = res.json.bind(res);
  res.json = (body) => { if (res.statusCode >= 400 && body?.error) res.locals.errorMessage ||= body.error; return json(body); };

  const end = res.end.bind(res);
  res.end = (...args) => {
    res.end = end;
    const failed = res.statusCode >= 400;
    if (req.method === "GET" || req.method === "OPTIONS") { if (!failed || req.method === "OPTIONS") return end(...args); }
    const detail = res.locals.errorMessage || (req.originalUrl.startsWith("/api/auth/login") ? String(req.body?.email || "").slice(0, 160) : null);
    logEvent({
      user_id: req.user?.id || null, user_name: req.user?.name || null, role: req.user?.developer ? "developer" : req.user?.role || null,
      method: req.method, path: req.originalUrl.split("?")[0].slice(0, 300), status: res.statusCode, detail: detail ? String(detail).slice(0, 500) : null, ip: req.ip,
    }).finally(() => end(...args));
    return res;
  };
  next();
}
