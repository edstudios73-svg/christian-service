-- Christian Service Church: members-only ministry sites
-- Paste this whole file in Supabase > SQL Editor > Run. Safe to run more than once.
-- Needs the main setup (supabase-setup.sql) to have been run already, because it uses public.is_admin().
--
-- HOW ACCESS WORKS
--   * Members sign in to a ministry site with an INDEX NUMBER and a PASSWORD (kept hashed, never in plain text).
--   * Each ministry has one HEAD credential. The head enters it on the main admin sign-in page and lands in
--     the admin for their ministry only. The church admin (you) can open every ministry.
--   * Nothing in these tables can be read directly from the browser. Every read and write goes through the
--     functions below, which check the sign-in first.

create extension if not exists pgcrypto with schema extensions;

-- 0. Clean start for the ministry tables (an earlier draft of this setup is replaced by this one).
drop table if exists public.ministry_join_requests, public.ministry_gallery, public.ministry_team,
  public.ministry_posts, public.ministry_admins, public.ministry_heads, public.access_sessions,
  public.church_members, public.ministry_sites cascade;
drop function if exists public.can_edit_ministry(text);

-- 1. Tables ------------------------------------------------------------------------------------
create sequence if not exists public.member_index_seq start 1;

create table public.church_members (
  id uuid primary key default gen_random_uuid(),
  index_number text not null unique,
  full_name text not null,
  phone text,
  password_hash text not null,
  active boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table public.ministry_sites (
  slug text primary key check (slug ~ '^[a-z0-9]+$'),
  name text not null,
  tagline text,
  about text,
  hero_image text,
  meeting_info text,
  contact_phone text,
  contact_email text,
  whatsapp text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ministry_heads (
  slug text primary key references public.ministry_sites(slug) on delete cascade,
  username text not null unique,
  password_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.access_sessions (
  token_hash text primary key,
  kind text not null check (kind in ('member', 'head')),
  member_id uuid references public.church_members(id) on delete cascade,
  slug text references public.ministry_sites(slug) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index access_sessions_exp_idx on public.access_sessions (expires_at);

create table public.ministry_posts (
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
create index ministry_posts_slug_idx on public.ministry_posts (slug, created_at desc);

create table public.ministry_gallery (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  image text not null,
  caption text,
  created_at timestamptz not null default now()
);
create index ministry_gallery_slug_idx on public.ministry_gallery (slug, created_at desc);

create table public.ministry_team (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  name text not null,
  role text,
  image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index ministry_team_slug_idx on public.ministry_team (slug, sort_order);

create table public.ministry_join_requests (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.ministry_sites(slug) on delete cascade,
  member_id uuid references public.church_members(id) on delete cascade,
  name text not null,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'joined')),
  created_at timestamptz not null default now()
);
create unique index ministry_join_one_open on public.ministry_join_requests (slug, member_id) where status = 'new';

-- 2. Lock every table: nothing is readable or writable straight from the browser -------------------
alter table public.church_members enable row level security;
alter table public.ministry_sites enable row level security;
alter table public.ministry_heads enable row level security;
alter table public.access_sessions enable row level security;
alter table public.ministry_posts enable row level security;
alter table public.ministry_gallery enable row level security;
alter table public.ministry_team enable row level security;
alter table public.ministry_join_requests enable row level security;
revoke all on public.church_members, public.ministry_sites, public.ministry_heads, public.access_sessions,
  public.ministry_posts, public.ministry_gallery, public.ministry_team, public.ministry_join_requests from anon, authenticated;

-- 3. Small helpers (not callable from the browser) -----------------------------------------------
create or replace function public._sha(p text) returns text
language sql immutable set search_path = public, extensions as $$ select encode(digest(p, 'sha256'), 'hex') $$;

create or replace function public._is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or session_user in ('postgres', 'supabase_admin')
$$;

create or replace function public._gen_password() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare chars text := 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY346789'; out text := ''; b bytea := gen_random_bytes(8); i int;
begin
  for i in 0..7 loop out := out || substr(chars, (get_byte(b, i) % length(chars)) + 1, 1); end loop;
  return out;
end $$;

-- who may see ministry pages: a signed-in member, a ministry head, or the church admin
create or replace function public._can_view(p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.is_admin() or exists (
    select 1 from public.access_sessions s
    left join public.church_members m on m.id = s.member_id
    where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now()
      and (s.kind = 'head' or (s.kind = 'member' and m.active))
  )
$$;

-- who may change a ministry: the church admin, or the head of that ministry
create or replace function public._can_manage(p_token text, p_slug text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.is_admin() or exists (
    select 1 from public.access_sessions s
    where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now() and s.kind = 'head' and s.slug = p_slug
  )
$$;
revoke execute on function public._sha(text), public._is_owner(), public._gen_password(),
  public._can_view(text), public._can_manage(text, text) from public, anon, authenticated;

-- 4. Sign in -----------------------------------------------------------------------------------
create or replace function public.member_login(p_index text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare m public.church_members; tok text;
begin
  select * into m from public.church_members where index_number = upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g'));
  if not found then return jsonb_build_object('ok', false, 'error', 'That index number or password is not right.'); end if;
  if m.locked_until is not null and m.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'Too many tries. Please wait 15 minutes and try again.');
  end if;
  if not m.active or m.password_hash <> crypt(coalesce(p_password, ''), m.password_hash) then
    update public.church_members set locked_until = case when failed_attempts + 1 >= 8 then now() + interval '15 minutes' else null end,
      failed_attempts = case when failed_attempts + 1 >= 8 then 0 else failed_attempts + 1 end
    where id = m.id;
    return jsonb_build_object('ok', false, 'error', 'That index number or password is not right.');
  end if;
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.access_sessions (token_hash, kind, member_id, expires_at) values (public._sha(tok), 'member', m.id, now() + interval '30 days');
  update public.church_members set failed_attempts = 0, locked_until = null, last_login = now() where id = m.id;
  delete from public.access_sessions where expires_at < now();
  return jsonb_build_object('ok', true, 'token', tok, 'kind', 'member', 'name', m.full_name, 'index', m.index_number);
end $$;

create or replace function public.head_login(p_username text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare h public.ministry_heads; tok text; nm text;
begin
  select * into h from public.ministry_heads where username = lower(trim(coalesce(p_username, '')));
  if not found then return jsonb_build_object('ok', false, 'error', 'That ministry code or password is not right.'); end if;
  if h.locked_until is not null and h.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'Too many tries. Please wait 15 minutes and try again.');
  end if;
  if h.password_hash <> crypt(coalesce(p_password, ''), h.password_hash) then
    update public.ministry_heads set locked_until = case when failed_attempts + 1 >= 8 then now() + interval '15 minutes' else null end,
      failed_attempts = case when failed_attempts + 1 >= 8 then 0 else failed_attempts + 1 end where slug = h.slug;
    return jsonb_build_object('ok', false, 'error', 'That ministry code or password is not right.');
  end if;
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.access_sessions (token_hash, kind, slug, expires_at) values (public._sha(tok), 'head', h.slug, now() + interval '7 days');
  update public.ministry_heads set failed_attempts = 0, locked_until = null where slug = h.slug;
  select name into nm from public.ministry_sites where slug = h.slug;
  return jsonb_build_object('ok', true, 'token', tok, 'kind', 'head', 'slug', h.slug, 'name', nm);
end $$;

create or replace function public.session_info(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case
    when public.is_admin() then jsonb_build_object('ok', true, 'kind', 'admin')
    else coalesce((
      select case when s.kind = 'member' then jsonb_build_object('ok', true, 'kind', 'member', 'name', m.full_name, 'index', m.index_number)
                  else jsonb_build_object('ok', true, 'kind', 'head', 'slug', s.slug, 'name', (select name from public.ministry_sites where slug = s.slug)) end
      from public.access_sessions s left join public.church_members m on m.id = s.member_id
      where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now() and (s.kind = 'head' or m.active)
    ), jsonb_build_object('ok', false))
  end
$$;

create or replace function public.session_logout(p_token text) returns void
language sql volatile security definer set search_path = public, extensions as $$
  delete from public.access_sessions where token_hash = public._sha(coalesce(p_token, ''))
$$;

-- 5. What a signed-in member sees --------------------------------------------------------------
create or replace function public.ministry_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  return jsonb_build_object('ok', true, 'sites', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'tagline', tagline) order by name) from public.ministry_sites), '[]'::jsonb));
end $$;

create or replace function public.ministry_home(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.ministry_sites;
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  select * into s from public.ministry_sites where slug = lower(coalesce(p_slug, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  return jsonb_build_object('ok', true,
    'site', to_jsonb(s),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, kind, title, body, event_date, event_time, location, image, created_at from public.ministry_posts where slug = s.slug and published order by created_at desc limit 60) x), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.created_at) from (select id, name, role, image, sort_order, created_at from public.ministry_team where slug = s.slug) x), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, image, caption, created_at from public.ministry_gallery where slug = s.slug order by created_at desc limit 80) x), '[]'::jsonb));
end $$;

create or replace function public.ministry_join(p_token text, p_slug text, p_message text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare m public.church_members;
begin
  select cm.* into m from public.access_sessions s join public.church_members cm on cm.id = s.member_id
   where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now() and s.kind = 'member' and cm.active;
  if not found then return jsonb_build_object('ok', false, 'error', 'Please sign in as a member first.'); end if;
  if not exists (select 1 from public.ministry_sites where slug = lower(coalesce(p_slug, ''))) then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  insert into public.ministry_join_requests (slug, member_id, name, phone, message)
  values (lower(p_slug), m.id, m.full_name, m.phone, nullif(left(trim(coalesce(p_message, '')), 400), ''))
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- 6. What a ministry head (or the church admin) manages ----------------------------------------
create or replace function public.mgmt_load(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.ministry_sites;
begin
  if not public._can_manage(p_token, lower(coalesce(p_slug, ''))) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  select * into s from public.ministry_sites where slug = lower(p_slug);
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  return jsonb_build_object('ok', true, 'site', to_jsonb(s),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_posts x where slug = s.slug), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_gallery x where slug = s.slug), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.created_at) from public.ministry_team x where slug = s.slug), '[]'::jsonb),
    'joins', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_join_requests x where slug = s.slug), '[]'::jsonb));
end $$;

create or replace function public.mgmt_all_sites(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'sites', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name) order by name) from public.ministry_sites), '[]'::jsonb));
end $$;

create or replace function public.mgmt_save_post(p_token text, p_slug text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if coalesce(trim(p->>'title'), '') = '' then return jsonb_build_object('ok', false, 'error', 'Please add a headline.'); end if;
  if nullif(p->>'id', '') is null then
    insert into public.ministry_posts (slug, kind, title, body, event_date, event_time, location, image, published)
    values (sl, coalesce(nullif(p->>'kind', ''), 'announcement'), left(p->>'title', 160), nullif(p->>'body', ''), nullif(p->>'event_date', '')::date, nullif(p->>'event_time', ''), nullif(p->>'location', ''), nullif(p->>'image', ''), coalesce((p->>'published')::boolean, true));
  else
    update public.ministry_posts set kind = coalesce(nullif(p->>'kind', ''), kind), title = left(p->>'title', 160), body = nullif(p->>'body', ''),
      event_date = nullif(p->>'event_date', '')::date, event_time = nullif(p->>'event_time', ''), location = nullif(p->>'location', ''),
      image = nullif(p->>'image', ''), published = coalesce((p->>'published')::boolean, true), updated_at = now()
    where id = (p->>'id')::uuid and slug = sl;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mgmt_save_person(p_token text, p_slug text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if coalesce(trim(p->>'name'), '') = '' then return jsonb_build_object('ok', false, 'error', 'Please add a name.'); end if;
  if nullif(p->>'id', '') is null then
    insert into public.ministry_team (slug, name, role, image, sort_order) values (sl, left(p->>'name', 120), nullif(p->>'role', ''), nullif(p->>'image', ''), coalesce((p->>'sort_order')::int, 0));
  else
    update public.ministry_team set name = left(p->>'name', 120), role = nullif(p->>'role', ''), image = nullif(p->>'image', ''), sort_order = coalesce((p->>'sort_order')::int, 0)
    where id = (p->>'id')::uuid and slug = sl;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mgmt_add_photo(p_token text, p_slug text, p_image text, p_caption text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if coalesce(p_image, '') = '' then return jsonb_build_object('ok', false, 'error', 'No photo.'); end if;
  insert into public.ministry_gallery (slug, image, caption) values (sl, p_image, nullif(left(p_caption, 160), ''));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mgmt_save_site(p_token text, p_slug text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  update public.ministry_sites set tagline = nullif(p->>'tagline', ''), about = nullif(p->>'about', ''), meeting_info = nullif(p->>'meeting_info', ''),
    contact_phone = nullif(p->>'contact_phone', ''), contact_email = nullif(p->>'contact_email', ''), whatsapp = nullif(p->>'whatsapp', ''),
    hero_image = nullif(p->>'hero_image', ''), updated_at = now() where slug = sl;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mgmt_delete(p_token text, p_slug text, p_what text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if p_what = 'post' then delete from public.ministry_posts where id = p_id and slug = sl;
  elsif p_what = 'photo' then delete from public.ministry_gallery where id = p_id and slug = sl;
  elsif p_what = 'person' then delete from public.ministry_team where id = p_id and slug = sl;
  elsif p_what = 'join' then delete from public.ministry_join_requests where id = p_id and slug = sl;
  else return jsonb_build_object('ok', false, 'error', 'Unknown item.'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mgmt_join_status(p_token text, p_slug text, p_id uuid, p_status text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if p_status not in ('new', 'contacted', 'joined') then return jsonb_build_object('ok', false, 'error', 'Unknown status.'); end if;
  update public.ministry_join_requests set status = p_status where id = p_id and slug = sl;
  return jsonb_build_object('ok', true);
end $$;

-- 7. Church admin only: manage members and head credentials --------------------------------------
create or replace function public.admin_members() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  return jsonb_build_object('ok', true, 'members', coalesce((select jsonb_agg(jsonb_build_object('index', index_number, 'name', full_name, 'phone', phone, 'active', active, 'last_login', last_login) order by index_number) from public.church_members), '[]'::jsonb));
end $$;

-- p_password empty = keep the current password (or create one for a new member)
create or replace function public.admin_save_member(p_index text, p_name text, p_phone text, p_password text, p_active boolean) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare idx text; pw text := nullif(trim(coalesce(p_password, '')), ''); made boolean := false;
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'Please add the member name.'); end if;
  idx := nullif(upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g')), '');
  if idx is null then idx := 'CSC-' || lpad(nextval('public.member_index_seq')::text, 4, '0'); end if;
  if not exists (select 1 from public.church_members where index_number = idx) then
    pw := coalesce(pw, public._gen_password()); made := true;
    insert into public.church_members (index_number, full_name, phone, password_hash, active) values (idx, trim(p_name), nullif(trim(coalesce(p_phone, '')), ''), crypt(pw, gen_salt('bf', 10)), coalesce(p_active, true));
  else
    update public.church_members set full_name = trim(p_name), phone = nullif(trim(coalesce(p_phone, '')), ''), active = coalesce(p_active, active),
      password_hash = case when pw is not null then crypt(pw, gen_salt('bf', 10)) else password_hash end, failed_attempts = 0, locked_until = null where index_number = idx;
  end if;
  return jsonb_build_object('ok', true, 'index', idx, 'password', case when pw is not null then pw else null end, 'created', made);
end $$;

-- p_rows: [{"name":"Ama Boateng","phone":"0551234567"}, ...]  Gives each person the next index number and a new password.
create or replace function public.admin_add_members(p_rows jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r jsonb; out jsonb := '[]'::jsonb; res jsonb;
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    res := public.admin_save_member(null, r->>'name', r->>'phone', null, true);
    out := out || jsonb_build_array(jsonb_build_object('name', r->>'name', 'phone', r->>'phone', 'index', res->>'index', 'password', res->>'password'));
  end loop;
  return jsonb_build_object('ok', true, 'members', out);
end $$;

create or replace function public.admin_delete_member(p_index text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  delete from public.church_members where index_number = upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g'));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_heads() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  return jsonb_build_object('ok', true, 'heads', coalesce((select jsonb_agg(jsonb_build_object('slug', s.slug, 'name', s.name, 'username', h.username, 'has_password', h.password_hash is not null) order by s.name) from public.ministry_sites s left join public.ministry_heads h on h.slug = s.slug), '[]'::jsonb));
end $$;

-- sets a new head password (leave p_password empty to generate one). Returns it once so you can hand it over.
create or replace function public.admin_set_head(p_slug text, p_username text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare pw text := coalesce(nullif(trim(coalesce(p_password, '')), ''), public._gen_password()); un text := lower(trim(coalesce(p_username, '')));
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  if not exists (select 1 from public.ministry_sites where slug = lower(p_slug)) then return jsonb_build_object('ok', false, 'error', 'Unknown ministry.'); end if;
  if un = '' then un := lower(p_slug) || '-head'; end if;
  insert into public.ministry_heads (slug, username, password_hash) values (lower(p_slug), un, crypt(pw, gen_salt('bf', 10)))
  on conflict (slug) do update set username = excluded.username, password_hash = excluded.password_hash, failed_attempts = 0, locked_until = null, updated_at = now();
  delete from public.access_sessions where kind = 'head' and slug = lower(p_slug);
  return jsonb_build_object('ok', true, 'username', un, 'password', pw);
end $$;

-- 8. Who may call what ------------------------------------------------------------------------
revoke execute on function public.member_login(text, text), public.head_login(text, text), public.session_info(text), public.session_logout(text),
  public.ministry_list(text), public.ministry_home(text, text), public.ministry_join(text, text, text), public.mgmt_load(text, text),
  public.mgmt_all_sites(text), public.mgmt_save_post(text, text, jsonb), public.mgmt_save_person(text, text, jsonb), public.mgmt_add_photo(text, text, text, text),
  public.mgmt_save_site(text, text, jsonb), public.mgmt_delete(text, text, text, uuid), public.mgmt_join_status(text, text, uuid, text),
  public.admin_members(), public.admin_save_member(text, text, text, text, boolean), public.admin_add_members(jsonb), public.admin_delete_member(text),
  public.admin_heads(), public.admin_set_head(text, text, text) from public;
grant execute on function public.member_login(text, text), public.head_login(text, text), public.session_info(text), public.session_logout(text),
  public.ministry_list(text), public.ministry_home(text, text), public.ministry_join(text, text, text), public.mgmt_load(text, text),
  public.mgmt_all_sites(text), public.mgmt_save_post(text, text, jsonb), public.mgmt_save_person(text, text, jsonb), public.mgmt_add_photo(text, text, text, text),
  public.mgmt_save_site(text, text, jsonb), public.mgmt_delete(text, text, text, uuid), public.mgmt_join_status(text, text, uuid, text),
  public.admin_members(), public.admin_save_member(text, text, text, text, boolean), public.admin_add_members(jsonb), public.admin_delete_member(text),
  public.admin_heads(), public.admin_set_head(text, text, text) to anon, authenticated;

-- 9. Photos for ministries (small JPEGs only, named by random id, under ministries/<ministry>/)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ministry-media', 'ministry-media', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];
drop policy if exists "ministry photos can be added" on storage.objects;
create policy "ministry photos can be added" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'ministry-media' and name ~ '^ministries/[a-z0-9]+/[0-9a-f-]{36}\.jpg$');

-- 10. The six ministry sites (no site for the Children's Ministry or Virtuous Women of Destiny) ------------------------------
insert into public.ministry_sites (slug, name, tagline, about) values
  ('mediateam', 'Media Team', 'Taking the Word further.', 'From cameras and sound to live streaming, photos and graphics, our creative team captures every moment so the message reaches far beyond our walls.'),
  ('youth', 'Vibrant Youth', 'Young, bold and on fire for God.', 'Vibrant Youth brings teens and young adults together for powerful worship, real conversations, purpose and lasting friendships.'),
  ('prayer', 'Prayer Department', 'The engine room of the church.', 'Our intercessors stand in the gap for the church, the city and the nation, believing God for breakthroughs, healing and answered prayers.'),
  ('ushers', 'Ushers and Protocol', 'The warm face of our hospitality.', 'Our well-trained team welcomes every guest, keeps every service orderly and makes sure everyone feels at home from the gate to the seat.'),
  ('choir', 'Ezekiel Choir', 'Our voices lifted in worship.', 'The Ezekiel Choir ushers the church into the presence of God with anointed songs, rich harmony and excellence every Sunday and at special services.'),
  ('evangelism', 'Evangelism Team', 'Taking the Gospel to every street.', 'Our evangelists share the Good News through outreach, visits and everyday conversations, leading souls to Christ and welcoming them home.')
on conflict (slug) do nothing;

delete from public.ministry_sites where slug = 'virtuouswomen';

-- Health check: should show 6 sites and the functions
select (select count(*) from public.ministry_sites) as sites, (select count(*) from pg_proc where proname in ('member_login', 'head_login', 'ministry_home', 'mgmt_load')) as functions;
