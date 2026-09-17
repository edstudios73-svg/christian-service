-- =====================================================================
-- Christian Service Church admin: Supabase setup
-- Run the three steps below one at a time in Supabase > SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1 of 3: create the tables
-- ---------------------------------------------------------------------
create table if not exists public.updates (
  id text primary key default gen_random_uuid()::text,
  title text, category text, date date, body text, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.sermons (
  id text primary key default gen_random_uuid()::text,
  title text, preacher text, date date, series text,
  video_url text, audio_url text, body text, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.gallery (
  id text primary key default gen_random_uuid()::text,
  caption text, album text, date date, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.testimonies (
  id text primary key default gen_random_uuid()::text,
  name text, title text, body text, date date, image text,
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  title text, date date, time time, location text, body text, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.prayers (
  id text primary key default gen_random_uuid()::text,
  name text, contact text, body text, status text default 'New', date date,
  created_at timestamptz not null default now(), updated_at timestamptz
);

-- Auth credentials stay in auth.users. This table stores profile and role data only.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  title text not null,
  subtitle text,
  body text,
  hero_image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  category text,
  date date not null default current_date,
  body text not null,
  image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pages (slug, title, subtitle, hero_image)
values
  ('home', 'Christian Service Church', 'House of Testimonies · East Legon, Accra', 'gallery/HERO.png'),
  ('about', 'Who We Are', 'A Bible-believing church family in East Legon, Accra.', 'gallery/rev dr payin.jpeg'),
  ('contact', 'Contact & Visit', 'Call us, send a message, or come and see us.', 'gallery/building.jpg'),
  ('events', 'Upcoming Events', 'Here is what is coming up at Christian Service Church.', 'assets/outreach.jpg'),
  ('gallery', 'Gallery', 'Pictures from our services, programmes and outreach.', 'assets/media.jpg'),
  ('giving', 'Giving', 'Support the work of God at Christian Service Church.', 'assets/giving header.jpg'),
  ('members', 'Our Leaders & Church Family', 'Meet the pastors, elders and leaders who serve.', 'assets/sermon-images/7655.png'),
  ('ministries', 'Our Ministries', 'Whatever your age, there is a group here for you.', 'gallery/building.jpg'),
  ('pastor', 'Rev. Dr. Joseph Payin Ezekiel', 'General Overseer of Christian Service Church.', 'gallery/4.jpeg'),
  ('prayer', 'Prayer Request', 'You are not alone. We will pray with you.', 'assets/prayer.jpg'),
  ('sermons', 'Sermons', 'Watch and listen to messages preached at Christian Service Church.', 'gallery/gifty ezekiel.png'),
  ('testimonies', 'Testimonies', 'Members share what God has done for them.', 'assets/hero.png'),
  ('announcements', 'Announcements', 'Stay up to date with the latest church information.', 'gallery/building.jpg')
on conflict (slug) do nothing;

delete from public.pages where slug = 'constitution';


-- ---------------------------------------------------------------------
-- STEP 2 of 3: security rules
-- The authorized admin email for this project is edstudios77@gmail.com.
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  )
$$;

-- Create a profile automatically whenever a Supabase Auth user is created.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'editor')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill the existing administrator if the Auth user was created already.
insert into public.users (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'edstudios77@gmail.com'
on conflict (id) do update set email = excluded.email, role = 'admin', updated_at = now();

-- Promote the existing church administrator after the profile is created.
update public.users
set role = 'admin', updated_at = now()
where email = 'edstudios77@gmail.com';

-- Visitors can read published items. Only the admin can change anything.
do $$
declare t text;
begin
  foreach t in array array['updates','sermons','gallery','testimonies','events','pages','announcements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "visitors read published" on public.%I', t);
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format('create policy "visitors read published" on public.%I for select using (published)', t);
    execute format('create policy "admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Anyone can send a prayer request. Only the admin can read them.
alter table public.prayers enable row level security;
alter table public.users enable row level security;
drop policy if exists "users read own profile" on public.users;
drop policy if exists "admin manages users" on public.users;
create policy "users read own profile" on public.users
  for select using (id = auth.uid());
create policy "admin manages users" on public.users
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "visitors send requests" on public.prayers;
drop policy if exists "admin full access" on public.prayers;
create policy "visitors send requests" on public.prayers
  for insert with check (status is null or status = 'New');
create policy "admin full access" on public.prayers
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------------------------------------------------------------------
-- STEP 3 of 3: photo storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "anyone views media" on storage.objects;
drop policy if exists "admin adds media" on storage.objects;
drop policy if exists "admin edits media" on storage.objects;
drop policy if exists "admin removes media" on storage.objects;
create policy "anyone views media" on storage.objects
  for select using (bucket_id = 'media');
create policy "admin adds media" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
create policy "admin edits media" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());
create policy "admin removes media" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------
-- OPTIONAL: clear all database content for a fresh start
-- Run only when you want to wipe the site content.
-- ---------------------------------------------------------------------
truncate table public.announcements restart identity cascade;
truncate table public.pages restart identity cascade;
truncate table public.updates restart identity cascade;
truncate table public.sermons restart identity cascade;
truncate table public.gallery restart identity cascade;
truncate table public.testimonies restart identity cascade;
truncate table public.events restart identity cascade;
truncate table public.prayers restart identity cascade;

-- After this, run STEP 1 again if you want the default page records back.
