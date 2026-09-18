alter table public.announcements add column if not exists sender_name text;
alter table public.announcements add column if not exists sender_role text;
alter table public.sermons add column if not exists video_file text;

create table if not exists public.ministries (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text,
  image text,
  link text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visit_messages (
  id text primary key default gen_random_uuid()::text,
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  subject text,
  message text not null,
  visit_time text,
  status text not null default 'New',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ministries enable row level security;
drop policy if exists "visitors read published" on public.ministries;
drop policy if exists "admin full access" on public.ministries;
create policy "visitors read published" on public.ministries for select using (published);
create policy "admin full access" on public.ministries for all using (public.is_admin()) with check (public.is_admin());

alter table public.visit_messages enable row level security;
drop policy if exists "visitors send visit messages" on public.visit_messages;
drop policy if exists "admin manages visit messages" on public.visit_messages;
create policy "visitors send visit messages" on public.visit_messages for insert with check (status = 'New');
create policy "admin manages visit messages" on public.visit_messages for all using (public.is_admin()) with check (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.ministries;
exception when duplicate_object then null;
end $$;
