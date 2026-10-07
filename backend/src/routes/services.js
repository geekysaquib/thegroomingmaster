import { Router } from "express";
import { supabase, unwrap } from "../supabase.js";
import { requireAuth, requireRole, wrap } from "../middleware.js";

const router = Router();
const FIELDS = ["name", "section", "category", "description", "price", "price_type", "duration_min", "sort_order", "active"];
const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Public: powers the landing page and the customer booking flow.
router.get("/", wrap(async (req, res) => {
  let q = supabase.from("services").select("*").order("sort_order").order("name");
  if (req.query.all !== "1") q = q.eq("active", true);
  res.json(unwrap(await q));
}));

router.post("/", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  res.status(201).json(unwrap(await supabase.from("services").insert(pick(req.body)).select().single()));
}));

router.put("/:id", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  res.json(unwrap(await supabase.from("services").update(pick(req.body)).eq("id", req.params.id).select().single()));
}));

router.delete("/:id", requireAuth, requireRole("admin"), wrap(async (req, res) => {
  const { error } = await supabase.from("services").delete().eq("id", req.params.id);
  if (error) {
    // Referenced by bookings/invoices - retire it instead of breaking history.
    unwrap(await supabase.from("services").update({ active: false }).eq("id", req.params.id));
    return res.json({ ok: true, archived: true });
  }
  res.json({ ok: true });
}));

export default router;
