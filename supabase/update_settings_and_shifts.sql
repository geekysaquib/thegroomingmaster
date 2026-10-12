-- Admin-managed settings (salon hours, SMTP) + staff shifts. Run once in the Supabase SQL editor.

create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;

-- Shift assigned by the admin, as 'HH:MM' (24h).
alter table users add column if not exists shift_start text;
alter table users add column if not exists shift_end   text;
