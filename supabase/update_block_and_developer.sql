-- Developer (god-mode) role + activity log. Run once in the Supabase SQL editor.
-- Blocking a customer uses the existing users.active flag, so it needs no schema change.

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('customer', 'staff', 'admin', 'developer'));

create table if not exists activity_log (
  id        uuid primary key default gen_random_uuid(),
  at        timestamptz not null default now(),
  user_id   uuid,
  user_name text,
  role      text,
  method    text not null,
  path      text not null,
  status    int  not null,
  detail    text,
  ip        text
);
create index if not exists activity_log_at_idx on activity_log (at desc);
alter table activity_log enable row level security;
