-- The Grooming Master - run this in the Supabase SQL editor.
-- The backend talks to Supabase with the service-role key, so RLS is enabled with no
-- policies: the tables are unreachable from the public anon key.

create extension if not exists "pgcrypto";

create table users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text unique,
  phone         text,
  gender        text check (gender in ('male', 'female', 'other')),
  avatar        text,                       -- base64 data URL, max 2 MB (enforced by the API)
  password_hash text,                       -- null for walk-in customers added by staff
  role          text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  base_salary   numeric(10,2) default 0,    -- staff/admin only
  commission_pct numeric(5,2) default 0,    -- % of billed sales credited to staff
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  section      text not null default 'Hair Care',   -- price-list section (Hair Care, Waxing, ...)
  category     text not null check (category in ('male', 'female', 'unisex')),
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  price_type   text not null default 'fixed' check (price_type in ('fixed', 'onwards')),
  sort_order   int not null default 0,
  duration_min int not null default 30 check (duration_min > 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table bookings (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references users(id),
  staff_id    uuid references users(id),
  service_id  uuid not null references services(id),
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  status      text not null default 'booked' check (status in ('pending', 'booked', 'completed', 'cancelled', 'no_show')),
  notes       text,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);
create index bookings_start_idx on bookings (start_at);
create index bookings_staff_idx on bookings (staff_id, start_at);

create sequence invoice_seq start 1001;

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_no     text unique not null default ('GM-' || nextval('invoice_seq')),
  customer_id    uuid not null references users(id),
  booking_id     uuid references bookings(id),
  staff_id       uuid references users(id),   -- who served / gets commission
  items          jsonb not null,              -- [{ name, price, qty }]
  subtotal       numeric(10,2) not null,
  discount       numeric(10,2) not null default 0,
  tax_pct        numeric(5,2) not null default 0,
  tax            numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'upi', 'other')),
  created_by     uuid references users(id),
  created_at     timestamptz not null default now()
);

create table salaries (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references users(id),
  month       text not null,                  -- 'YYYY-MM'
  base        numeric(10,2) not null default 0,
  commission  numeric(10,2) not null default 0,
  bonus       numeric(10,2) not null default 0,
  deductions  numeric(10,2) not null default 0,
  net         numeric(10,2) not null,
  status      text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (staff_id, month)
);

alter table users    enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table invoices enable row level security;
alter table salaries enable row level security;

-- Load the salon's real services next: run supabase/update_price_list.sql

-- Website enquiries (also created by update_price_list.sql).
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
