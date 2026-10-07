-- Profile pictures + booking approval flow. Run once in the Supabase SQL editor.

-- 1) Profile pictures: stored as a base64 data URL (max 2 MB, enforced by the API).
alter table users add column if not exists avatar text;

-- 2) Online bookings from customers start as 'pending' until the salon accepts them.
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'booked', 'completed', 'cancelled', 'no_show'));
