-- Christian Service Church: ministry sites (one site and one admin login per ministry)
-- Paste the whole file in Supabase > SQL Editor > Run. Safe to run more than once.
-- It needs the main setup (supabase-setup.sql) to have been run already, because it uses public.is_admin().

-- 1. The ministries that get their own site. "slug" is the first part of the address
--    (mediateam -> mediateam.christianservicechurch.org).
create table if not exists public.ministry_sites (
  slug text primary key check (slug ~ '^[a-z0-9]+$'),
  name text not null,
  tagline text,
  about text,
  hero_image text,
  meeting_info text,
  contact_phone text,
  contact_email text,
  whatsapp text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Who may edit which ministry site (the head of the team). The church admin adds rows here.
create table if not exists public.ministry_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null references public.ministry_sites(slug) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- 3. Announcements, events and updates posted by a ministry.
create table if not exists public.ministry_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  kind text not null default 'announcement' check (kind in ('announcement', 'event', 'update')),
  title text not null,
  body text,
  event_date date,
  event_time text,
  location text,
  image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ministry_posts_slug_idx on public.ministry_posts (slug, created_at desc);

create table if not exists public.ministry_gallery (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  image text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index if not exists ministry_gallery_slug_idx on public.ministry_gallery (slug, created_at desc);

create table if not exists public.ministry_team (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  name text not null,
  role text,
  image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ministry_team_slug_idx on public.ministry_team (slug, sort_order);

create table if not exists public.ministry_join_requests (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  name text not null,
  phone text not null,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'joined')),
  created_at timestamptz not null default now()
);
create index if not exists ministry_join_slug_idx on public.ministry_join_requests (slug, created_at desc);

-- 4. Who can edit a ministry: its own head, or the church admin.
create or replace function public.can_edit_ministry(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.ministry_admins a where a.user_id = auth.uid() and a.slug = p_slug
  )
$$;

-- 5. Security rules
alter table public.ministry_sites enable row level security;
alter table public.ministry_admins enable row level security;
alter table public.ministry_posts enable row level security;
alter table public.ministry_gallery enable row level security;
alter table public.ministry_team enable row level security;
alter table public.ministry_join_requests enable row level security;

drop policy if exists "visitors read sites" on public.ministry_sites;
create policy "visitors read sites" on public.ministry_sites for select using (published or public.can_edit_ministry(slug));
drop policy if exists "church admin manages sites" on public.ministry_sites;
create policy "church admin manages sites" on public.ministry_sites for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "heads edit their site" on public.ministry_sites;
create policy "heads edit their site" on public.ministry_sites for update using (public.can_edit_ministry(slug)) with check (public.can_edit_ministry(slug));

drop policy if exists "read own admin rows" on public.ministry_admins;
create policy "read own admin rows" on public.ministry_admins for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "church admin manages heads" on public.ministry_admins;
create policy "church admin manages heads" on public.ministry_admins for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "visitors read posts" on public.ministry_posts;
create policy "visitors read posts" on public.ministry_posts for select using (published or public.can_edit_ministry(slug));
drop policy if exists "heads manage posts" on public.ministry_posts;
create policy "heads manage posts" on public.ministry_posts for all using (public.can_edit_ministry(slug)) with check (public.can_edit_ministry(slug));

drop policy if exists "visitors read gallery" on public.ministry_gallery;
create policy "visitors read gallery" on public.ministry_gallery for select using (true);
drop policy if exists "heads manage gallery" on public.ministry_gallery;
create policy "heads manage gallery" on public.ministry_gallery for all using (public.can_edit_ministry(slug)) with check (public.can_edit_ministry(slug));

drop policy if exists "visitors read team" on public.ministry_team;
create policy "visitors read team" on public.ministry_team for select using (true);
drop policy if exists "heads manage team" on public.ministry_team;
create policy "heads manage team" on public.ministry_team for all using (public.can_edit_ministry(slug)) with check (public.can_edit_ministry(slug));

drop policy if exists "visitors send join requests" on public.ministry_join_requests;
create policy "visitors send join requests" on public.ministry_join_requests for insert
  with check (status = 'new' and char_length(name) between 1 and 120 and char_length(phone) between 7 and 25);
drop policy if exists "heads manage join requests" on public.ministry_join_requests;
create policy "heads manage join requests" on public.ministry_join_requests for all using (public.can_edit_ministry(slug)) with check (public.can_edit_ministry(slug));

grant select on public.ministry_sites, public.ministry_posts, public.ministry_gallery, public.ministry_team to anon, authenticated;
grant insert on public.ministry_join_requests to anon, authenticated;
grant select, insert, update, delete on public.ministry_sites, public.ministry_admins, public.ministry_posts,
  public.ministry_gallery, public.ministry_team, public.ministry_join_requests to authenticated;

-- 6. Photos: a ministry head may add, change and remove photos under ministries/<their slug>/ in the media bucket.
drop policy if exists "heads add ministry media" on storage.objects;
create policy "heads add ministry media" on storage.objects for insert
  with check (bucket_id = 'media' and name like 'ministries/%' and public.can_edit_ministry(split_part(name, '/', 2)));
drop policy if exists "heads edit ministry media" on storage.objects;
create policy "heads edit ministry media" on storage.objects for update
  using (bucket_id = 'media' and name like 'ministries/%' and public.can_edit_ministry(split_part(name, '/', 2)));
drop policy if exists "heads remove ministry media" on storage.objects;
create policy "heads remove ministry media" on storage.objects for delete
  using (bucket_id = 'media' and name like 'ministries/%' and public.can_edit_ministry(split_part(name, '/', 2)));

-- 7. The seven ministry sites (no site for the Children's Ministry).
insert into public.ministry_sites (slug, name, tagline, about) values
  ('mediateam', 'Media Team', 'Taking the Word further.', 'From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so the message reaches far beyond our walls.'),
  ('youth', 'Vibrant Youth', 'Young, bold and on fire for God.', 'Vibrant Youth brings teens and young adults together for powerful worship, real conversations, purpose and lasting friendships.'),
  ('prayer', 'Prayer Department', 'The engine room of the church.', 'Our intercessors stand in the gap for the church, the city and the nation, believing God for breakthroughs, healing and answered prayers.'),
  ('ushers', 'Ushers and Protocol', 'The warm face of our hospitality.', 'Our well-trained team welcomes every guest, keeps every service orderly and makes sure everyone feels at home from the gate to the seat.'),
  ('choir', 'Ezekiel Choir', 'Our voices lifted in worship.', 'The Ezekiel Choir ushers the church into the presence of God with anointed songs, rich harmony and excellence every Sunday and at special services.'),
  ('evangelism', 'Evangelism Team', 'Taking the Gospel to every street.', 'Our evangelists share the Good News through outreach, visits and everyday conversations, leading souls to Christ and welcoming them home.'),
  ('virtuouswomen', 'Virtuous Women of Destiny', 'Women of grace, strength and purpose.', 'Virtuous Women of Destiny gathers the women of the church to pray, grow in the Word, encourage one another and walk boldly into everything God has prepared for them.')
on conflict (slug) do nothing;

-- 8. To make someone the head of a ministry: first create their login in Supabase > Authentication > Users
--    (Add user, with email and password, "Auto confirm"). Then run this, with their email and the ministry slug:
--
-- insert into public.ministry_admins (user_id, slug)
-- select id, 'mediateam' from auth.users where email = 'head.of.media@example.com'
-- on conflict do nothing;

-- Health check: should list 7 sites
select slug, name from public.ministry_sites order by name;
