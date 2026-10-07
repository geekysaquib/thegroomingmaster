-- The Grooming Master - price list (from the salon's printed price list).
-- Run once in the Supabase SQL editor. Re-running replaces services that have no bookings
-- (services already used by bookings are kept, so re-running after go-live would duplicate them).

alter table services add column if not exists section    text not null default 'Hair Care';
alter table services add column if not exists price_type text not null default 'fixed' check (price_type in ('fixed', 'onwards'));
alter table services add column if not exists sort_order int  not null default 0;

-- Remove old sample services that nothing references, and any earlier copy of this list.
delete from services
 where id not in (select service_id from bookings);

insert into services (name, section, category, price, price_type, duration_min, sort_order) values
  ('Root Touch Up (Ammonia Free)', 'Hair Care', 'unisex', 1000, 'onwards', 60, 1),
  ('Root Touch Up (Ammonia Free) - Premium', 'Hair Care', 'unisex', 1200, 'onwards', 60, 2),
  ('Blow Dry / Styling', 'Hair Care', 'unisex', 450, 'onwards', 30, 3),
  ('Ironing', 'Hair Care', 'unisex', 700, 'onwards', 45, 4),
  ('Hair Do', 'Hair Care', 'unisex', 700, 'onwards', 45, 5),
  ('Head Massage', 'Hair Care', 'unisex', 500, 'onwards', 30, 6),
  ('Root Touch Up (Ammonia)', 'Hair Services', 'unisex', 1000, 'onwards', 60, 7),
  ('Global', 'Hair Services', 'unisex', 4000, 'onwards', 120, 8),
  ('Highlights', 'Hair Services', 'unisex', 4000, 'onwards', 120, 9),
  ('Keratin', 'Hair Services', 'unisex', 4000, 'onwards', 150, 10),
  ('Botox', 'Hair Services', 'unisex', 4000, 'onwards', 150, 11),
  ('Smoothing', 'Hair Services', 'unisex', 4000, 'onwards', 150, 12),
  ('Balayage', 'Hair Services', 'unisex', 4000, 'onwards', 150, 13),
  ('Nano Plastia', 'Hair Services', 'unisex', 4000, 'onwards', 150, 14),
  ('Hands / Feet', 'Bleach', 'female', 500, 'onwards', 30, 15),
  ('Full Arms', 'Bleach', 'female', 400, 'onwards', 30, 16),
  ('Full Front/Back', 'Bleach', 'female', 800, 'onwards', 45, 17),
  ('Face & Neck', 'Bleach', 'female', 500, 'onwards', 30, 18),
  ('Full Leg', 'Bleach', 'female', 450, 'onwards', 40, 19),
  ('Full Body', 'Bleach', 'female', 2500, 'onwards', 90, 20),
  ('Face', 'Bleach', 'female', 300, 'onwards', 20, 21),
  ('Full Arms (Basic)', 'Waxing', 'female', 350, 'fixed', 30, 22),
  ('Full Arms (Rica)', 'Waxing', 'female', 550, 'fixed', 30, 23),
  ('Half Arms (Basic)', 'Waxing', 'female', 250, 'fixed', 20, 24),
  ('Half Arms (Rica)', 'Waxing', 'female', 400, 'fixed', 20, 25),
  ('Under Arms (Basic)', 'Waxing', 'female', 100, 'fixed', 10, 26),
  ('Under Arms (Rica)', 'Waxing', 'female', 100, 'fixed', 10, 27),
  ('Full Legs (Basic)', 'Waxing', 'female', 450, 'fixed', 40, 28),
  ('Full Legs (Rica)', 'Waxing', 'female', 650, 'fixed', 40, 29),
  ('Half Legs (Basic)', 'Waxing', 'female', 250, 'fixed', 25, 30),
  ('Half Legs (Rica)', 'Waxing', 'female', 400, 'fixed', 25, 31),
  ('Front Half (Basic)', 'Waxing', 'female', 300, 'fixed', 30, 32),
  ('Front Half (Rica)', 'Waxing', 'female', 600, 'fixed', 30, 33),
  ('Back Full Front (Basic)', 'Waxing', 'female', 600, 'fixed', 45, 34),
  ('Back Full Front (Rica)', 'Waxing', 'female', 1000, 'fixed', 45, 35),
  ('Brazilian (Basic)', 'Waxing', 'female', 1200, 'fixed', 45, 36),
  ('Brazilian (Rica)', 'Waxing', 'female', 1200, 'fixed', 45, 37),
  ('Full Body (Basic)', 'Waxing', 'female', 2500, 'fixed', 90, 38),
  ('Full Body (Rica)', 'Waxing', 'female', 3500, 'fixed', 90, 39),
  ('Side Locks (Basic)', 'Waxing', 'female', 200, 'fixed', 10, 40),
  ('Side Locks (Rica)', 'Waxing', 'female', 200, 'fixed', 10, 41),
  ('Upper Lips (Basic)', 'Waxing', 'female', 50, 'fixed', 10, 42),
  ('Upper Lips (Rica)', 'Waxing', 'female', 50, 'fixed', 10, 43),
  ('Chin (Basic)', 'Waxing', 'female', 100, 'fixed', 10, 44),
  ('Chin (Rica)', 'Waxing', 'female', 100, 'fixed', 10, 45),
  ('Full Face Wax (Basic)', 'Waxing', 'female', 250, 'fixed', 20, 46),
  ('Full Face Wax (Rica)', 'Waxing', 'female', 250, 'fixed', 20, 47),
  ('Eyebrows', 'Grooming', 'female', 80, 'fixed', 15, 48),
  ('Upper Lips', 'Grooming', 'female', 30, 'fixed', 15, 49),
  ('Forehead', 'Grooming', 'female', 40, 'fixed', 15, 50),
  ('Side Locks', 'Grooming', 'female', 150, 'fixed', 15, 51),
  ('Chin', 'Grooming', 'female', 100, 'fixed', 15, 52),
  ('Full Face', 'Grooming', 'female', 250, 'fixed', 15, 53),
  ('Hair Cut', 'Male Grooming', 'male', 300, 'fixed', 30, 54),
  ('New Look', 'Male Grooming', 'male', 1000, 'fixed', 60, 55),
  ('Beard', 'Male Grooming', 'male', 250, 'fixed', 20, 56),
  ('Beard Color', 'Male Grooming', 'male', 500, 'fixed', 30, 57),
  ('Male Hair Color', 'Male Grooming', 'male', 800, 'fixed', 45, 58);

-- Website enquiries / appointment requests (Contact page + homepage form).
create table if not exists enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  message    text,
  source     text not null default 'contact',
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table enquiries enable row level security;
