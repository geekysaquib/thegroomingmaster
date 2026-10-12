-- One booking can hold several services. Run once in the Supabase SQL editor.
-- items = snapshot of the chosen services: [{ service_id, name, price, price_type, duration_min }].
-- bookings.service_id keeps the first service, so older screens and reports still work.
alter table bookings add column if not exists items jsonb;
