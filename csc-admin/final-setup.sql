-- =====================================================================
-- Christian Service Church: FINAL Supabase setup (safe to run many times)
-- Paste the WHOLE file in Supabase > SQL Editor > New query, then press Run.
-- Nothing here deletes your content. It only creates what is missing,
-- repairs security rules, and returns a health check at the end.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------
create table if not exists public.leaders (
  id text primary key default gen_random_uuid()::text,
  name text, role text, location text, body text, phone text, email text, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);

create table if not exists public.sermons (
  id text primary key default gen_random_uuid()::text,
  title text, preacher text, date date, series text,
  video_url text, audio_url text, download_url text, body text, image text,
  published boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz
);
alter table public.sermons add column if not exists video_file text;
alter table public.sermons add column if not exists download_url text;

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

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users alter column email drop not null;

create table if not exists public.pages (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  title text not null,
  subtitle text,
  body text,
  hero_image text,
  content_overrides jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pages add column if not exists content_overrides jsonb not null default '{}'::jsonb;

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
alter table public.announcements add column if not exists sender_name text;
alter table public.announcements add column if not exists sender_role text;

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

create table if not exists public.homepage_content (
  id text primary key default 'home',
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb not null default '{}'::jsonb,
  draft_updated_at timestamptz not null default now(),
  published_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  last_seen timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists last_seen timestamptz;
alter table public.push_subscriptions add column if not exists last_seen_at timestamptz;

create table if not exists public.announcement_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id text not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  announcement_id text not null unique references public.announcements(id) on delete cascade,
  triggered_by uuid references auth.users(id),
  sent_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'google_analytics',
  property_id text not null,
  measurement_id text not null,
  account_email text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_successful_sync timestamptz,
  last_error text
);
create index if not exists analytics_integrations_provider_idx on public.analytics_integrations (provider);
create index if not exists analytics_integrations_enabled_idx on public.analytics_integrations (enabled);

-- Default page records (existing ones are left exactly as they are).
-- No built-in hero photo: the homepage shows only the image you publish in the admin.
insert into public.pages (slug, title, subtitle, hero_image) values
  ('home', 'Christian Service Church', 'House of Testimonies · East Legon, Accra', null),
  ('about', 'Who We Are', 'A Bible-believing church family in East Legon, Accra.', null),
  ('contact', 'Contact & Visit', 'Call us, send a message, or come and see us.', null),
  ('events', 'Upcoming Events', 'Here is what is coming up at Christian Service Church.', null),
  ('gallery', 'Gallery', 'Pictures from our services, programmes and outreach.', null),
  ('giving', 'Giving', 'Support the work of God at Christian Service Church.', null),
  ('members', 'Our Leaders & Church Family', 'Meet the pastors, elders and leaders who serve.', null),
  ('ministries', 'Our Ministries', 'Whatever your age, there is a group here for you.', null),
  ('pastor', 'Rev. Dr. Joseph Payin Ezekiel', 'General Overseer of Christian Service Church.', null),
  ('prayer', 'Prayer Request', 'You are not alone. We will pray with you.', null),
  ('sermons', 'Sermons', 'Watch and listen to messages preached at Christian Service Church.', null),
  ('testimonies', 'Testimonies', 'Members share what God has done for them.', null),
  ('announcements', 'Announcements', 'Stay up to date with the latest church information.', null)
on conflict (slug) do nothing;

-- Remove the OLD built-in hero photo if it is still saved as the home page image,
-- so it can never override the new image you uploaded in the admin.
update public.pages
set hero_image = null, updated_at = now()
where slug = 'home' and hero_image in ('gallery/HERO.png', '/gallery/HERO.png');

-- ---------------------------------------------------------------------
-- 2. Admin account + security
--    Admin email used by this project (change only if it is wrong):
-- ---------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, coalesce(new.email, 'anonymous:' || new.id::text), coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'editor')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- >>> ADMIN EMAIL: edit the address below if your admin login is different <<<
insert into public.users (id, email, role)
select id, email, 'admin' from auth.users
where lower(email) = lower('edstudios77@gmail.com')
on conflict (id) do update set email = excluded.email, role = 'admin', updated_at = now();

-- Public content tables: visitors read published rows, only the admin edits.
do $$
declare t text;
begin
  foreach t in array array['leaders','sermons','gallery','testimonies','events','pages','announcements','ministries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "visitors read published" on public.%I', t);
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format('create policy "visitors read published" on public.%I for select using (published)', t);
    execute format('create policy "admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Users
alter table public.users enable row level security;
drop policy if exists "users read own profile" on public.users;
drop policy if exists "admin manages users" on public.users;
create policy "users read own profile" on public.users for select using (id = auth.uid());
create policy "admin manages users" on public.users for all using (public.is_admin()) with check (public.is_admin());

-- Prayer requests and visit messages: anyone can send, only the admin can read.
alter table public.prayers enable row level security;
drop policy if exists "visitors send requests" on public.prayers;
drop policy if exists "admin full access" on public.prayers;
create policy "visitors send requests" on public.prayers for insert with check (status is null or status = 'New');
create policy "admin full access" on public.prayers for all using (public.is_admin()) with check (public.is_admin());

alter table public.visit_messages enable row level security;
drop policy if exists "visitors send visit messages" on public.visit_messages;
drop policy if exists "admin manages visit messages" on public.visit_messages;
create policy "visitors send visit messages" on public.visit_messages for insert with check (status = 'New');
create policy "admin manages visit messages" on public.visit_messages for all using (public.is_admin()) with check (public.is_admin());

-- Homepage editor: the public may read ONLY the published version, never drafts.
alter table public.homepage_content enable row level security;
drop policy if exists "public reads published homepage" on public.homepage_content;
drop policy if exists "admin manages homepage" on public.homepage_content;
create policy "public reads published homepage" on public.homepage_content for select using (true);
create policy "admin manages homepage" on public.homepage_content for all using (public.is_admin()) with check (public.is_admin());
revoke select on public.homepage_content from anon;
grant select (id, published_content, published_updated_at) on public.homepage_content to anon;
grant select, insert, update, delete on public.homepage_content to authenticated;

-- Notifications
alter table public.push_subscriptions enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.notification_events enable row level security;
drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own announcement reads" on public.announcement_reads;
create policy "users manage own announcement reads" on public.announcement_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admins read notification events" on public.notification_events;
create policy "admins read notification events" on public.notification_events
  for select using (public.is_admin());

-- Analytics settings: admin only
alter table public.analytics_integrations enable row level security;
drop policy if exists "admins manage analytics config" on public.analytics_integrations;
drop policy if exists "visitors cannot access analytics config" on public.analytics_integrations;
create policy "admins manage analytics config" on public.analytics_integrations
  for all using (public.is_admin()) with check (public.is_admin());
create policy "visitors cannot access analytics config" on public.analytics_integrations
  for select using (false);

-- ---------------------------------------------------------------------
-- 3. Live updates (each table is added on its own, so one already being
--    enabled never blocks the others)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['leaders','sermons','gallery','testimonies','events','pages','announcements','ministries','prayers','homepage_content'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. Photo storage: public bucket "media" (the admin uploads here)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "anyone views media" on storage.objects;
drop policy if exists "admin adds media" on storage.objects;
drop policy if exists "admin edits media" on storage.objects;
drop policy if exists "admin removes media" on storage.objects;
create policy "anyone views media" on storage.objects for select using (bucket_id = 'media');
create policy "admin adds media" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
create policy "admin edits media" on storage.objects for update using (bucket_id = 'media' and public.is_admin());
create policy "admin removes media" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------
-- 5. HEALTH CHECK (results appear in the table below after Run)
--    Every "status" should say OK. Anything else tells you what to fix.
-- ---------------------------------------------------------------------
select * from (
  select 1 as n, 'Admin account exists and has admin role' as check_name,
    case when exists (select 1 from public.users where role = 'admin') then 'OK'
         else 'FIX: no admin yet. Create the admin user in Authentication > Users with the email above, then run this file again' end as status
  union all
  select 2, 'Homepage published content saved',
    case when exists (select 1 from public.homepage_content where id = 'home' and published_content <> '{}'::jsonb) then 'OK'
         else 'FIX: open the admin Homepage editor and press Publish' end
  union all
  select 3, 'Homepage hero image published',
    case when exists (select 1 from public.homepage_content where id = 'home' and coalesce(published_content #>> '{hero,image}', '') <> '') then 'OK'
         else 'FIX: upload the hero image in the Homepage editor and Publish' end
  union all
  select 4, 'Homepage pastor image published',
    case when exists (select 1 from public.homepage_content where id = 'home' and coalesce(published_content #>> '{pastor,image}', '') <> '') then 'OK'
         else 'FIX: upload the pastor image in the Homepage editor and Publish' end
  union all
  select 5, 'No old built-in photos still referenced',
    case when exists (
      select 1 from public.homepage_content
      where id = 'home' and published_content::text ~ '(^|[^a-z])gallery/[A-Za-z]'
    ) then 'FIX: some homepage images still point to old files in gallery/. Re-upload them in the Homepage editor and Publish'
    else 'OK' end
  union all
  select 6, 'Photo bucket "media" is public',
    case when exists (select 1 from storage.buckets where id = 'media' and public) then 'OK' else 'FIX: bucket missing or private' end
  union all
  select 7, 'Security enabled on all tables',
    case when not exists (
      select 1 from pg_tables where schemaname = 'public'
        and tablename in ('leaders','sermons','gallery','testimonies','events','pages','announcements','ministries','prayers','users','visit_messages','homepage_content','push_subscriptions','announcement_reads','notification_events','analytics_integrations')
        and not rowsecurity
    ) then 'OK' else 'FIX: a table has security switched off' end
  union all
  select 8, 'Visitors cannot read homepage drafts',
    case when not has_column_privilege('anon', 'public.homepage_content', 'draft_content', 'select') then 'OK' else 'FIX: drafts are readable by the public' end
  union all
  select 9, 'Live updates enabled',
    case when (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('leaders','pages','announcements','ministries','homepage_content')) = 5 then 'OK' else 'FIX: live updates missing on some tables' end
) checks
order by n;
