-- Members belong to ministries. A member signs in with their index number and password and sees only their own ministry page(s).
-- The church admin chooses the ministry when adding a member; a ministry head adds members to their own ministry
-- (the head allocates the index number, the system makes a password from the member's name). Safe to run more than once.

alter table public.church_members add column if not exists ministries text[] not null default '{}';

-- Password made from the first name, e.g. Kofi-48271
create or replace function public._gen_member_password(p_name text) returns text
language plpgsql volatile set search_path = public, extensions as $$
declare f text := regexp_replace(split_part(trim(coalesce(p_name, '')), ' ', 1), '[^A-Za-z]', '', 'g');
begin
  if length(f) < 2 then f := 'Member'; end if;
  return initcap(lower(left(f, 10))) || '-' || lpad((abs(('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 100000)::text, 5, '0');
end $$;

-- who may see one ministry page: church admin, that ministry's head, or a member of that ministry
create or replace function public._can_view_slug(p_token text, p_slug text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select public.is_admin() or exists (
    select 1 from public.access_sessions s
    left join public.church_members m on m.id = s.member_id
    where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now()
      and ((s.kind = 'head' and s.slug = lower(coalesce(p_slug, ''))) or (s.kind = 'member' and m.active and lower(coalesce(p_slug, '')) = any(m.ministries)))
  )
$$;
revoke execute on function public._gen_member_password(text), public._can_view_slug(text, text) from public, anon, authenticated;

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
  return jsonb_build_object('ok', true, 'token', tok, 'kind', 'member', 'name', m.full_name, 'index', m.index_number, 'ministries', to_jsonb(m.ministries));
end $$;

create or replace function public.session_info(p_token text) returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  select case
    when public.is_admin() then jsonb_build_object('ok', true, 'kind', 'admin')
    else coalesce((
      select case when s.kind = 'member' then jsonb_build_object('ok', true, 'kind', 'member', 'name', m.full_name, 'index', m.index_number, 'ministries', to_jsonb(m.ministries))
                  else jsonb_build_object('ok', true, 'kind', 'head', 'slug', s.slug, 'name', (select name from public.ministry_sites where slug = s.slug)) end
      from public.access_sessions s left join public.church_members m on m.id = s.member_id
      where s.token_hash = public._sha(coalesce(p_token, '')) and s.expires_at > now() and (s.kind = 'head' or m.active)
    ), jsonb_build_object('ok', false))
  end
$$;

create or replace function public.ministry_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  return jsonb_build_object('ok', true, 'sites', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'tagline', tagline) order by name)
    from public.ministry_sites where public._can_view_slug(p_token, slug)), '[]'::jsonb));
end $$;

create or replace function public.ministry_home(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.ministry_sites;
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if not public._can_view_slug(p_token, p_slug) then return jsonb_build_object('ok', false, 'error', 'notmember'); end if;
  select * into s from public.ministry_sites where slug = lower(coalesce(p_slug, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  return jsonb_build_object('ok', true,
    'site', to_jsonb(s) || jsonb_build_object('hero_image', coalesce(public.ministry_thumb(s.slug), s.hero_image)),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, kind, title, body, event_date, event_time, location, image, created_at from public.ministry_posts where slug = s.slug and published order by created_at desc limit 60) x), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.created_at) from (select id, name, role, image, sort_order, created_at from public.ministry_team where slug = s.slug) x), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, image, caption, created_at from public.ministry_gallery where slug = s.slug order by created_at desc limit 80) x), '[]'::jsonb));
end $$;

-- Church admin ---------------------------------------------------------------------------------
create or replace function public.admin_members() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  return jsonb_build_object('ok', true, 'members', coalesce((select jsonb_agg(jsonb_build_object('index', index_number, 'name', full_name, 'phone', phone, 'active', active, 'last_login', last_login, 'ministries', to_jsonb(ministries)) order by index_number) from public.church_members), '[]'::jsonb));
end $$;

drop function if exists public.admin_save_member(text, text, text, text, boolean);
-- p_password empty = keep the current password (or make one from the name for a new member); p_ministries null = keep as is
create or replace function public.admin_save_member(p_index text, p_name text, p_phone text, p_password text, p_active boolean, p_ministries text[] default null) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare idx text; pw text := nullif(trim(coalesce(p_password, '')), ''); made boolean := false; mins text[];
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'Please add the member name.'); end if;
  if p_ministries is not null then
    select coalesce(array_agg(slug order by slug), '{}') into mins from public.ministry_sites where slug = any(p_ministries);
  end if;
  idx := nullif(upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g')), '');
  if idx is null then
    loop
      idx := 'CSC-' || lpad(nextval('public.member_index_seq')::text, 4, '0');
      exit when not exists (select 1 from public.church_members where index_number = idx);
    end loop;
  end if;
  if not exists (select 1 from public.church_members where index_number = idx) then
    pw := coalesce(pw, public._gen_member_password(p_name)); made := true;
    insert into public.church_members (index_number, full_name, phone, password_hash, active, ministries)
    values (idx, trim(p_name), nullif(trim(coalesce(p_phone, '')), ''), crypt(pw, gen_salt('bf', 10)), coalesce(p_active, true), coalesce(mins, '{}'));
  else
    update public.church_members set full_name = trim(p_name), phone = nullif(trim(coalesce(p_phone, '')), ''), active = coalesce(p_active, active),
      ministries = coalesce(mins, ministries),
      password_hash = case when pw is not null then crypt(pw, gen_salt('bf', 10)) else password_hash end, failed_attempts = 0, locked_until = null where index_number = idx;
  end if;
  return jsonb_build_object('ok', true, 'index', idx, 'password', pw, 'created', made);
end $$;

drop function if exists public.admin_add_members(jsonb);
-- p_rows: [{"name":"Ama Boateng","phone":"0551234567"}, ...]; p_ministries: the ministry(ies) all of them join
create or replace function public.admin_add_members(p_rows jsonb, p_ministries text[] default '{}') returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare r jsonb; out jsonb := '[]'::jsonb; res jsonb;
begin
  if not public._is_owner() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    res := public.admin_save_member(null, r->>'name', r->>'phone', null, true, p_ministries);
    out := out || jsonb_build_array(jsonb_build_object('name', r->>'name', 'phone', r->>'phone', 'index', res->>'index', 'password', res->>'password'));
  end loop;
  return jsonb_build_object('ok', true, 'members', out);
end $$;

-- Ministry head (own ministry only) -------------------------------------------------------------
create or replace function public.mgmt_members(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  return jsonb_build_object('ok', true, 'members', coalesce((select jsonb_agg(jsonb_build_object('index', index_number, 'name', full_name, 'phone', phone, 'active', active, 'last_login', last_login) order by full_name)
    from public.church_members where sl = any(ministries)), '[]'::jsonb));
end $$;

create or replace function public.mgmt_add_member(p_token text, p_slug text, p_index text, p_name text, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, '')); idx text := upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g')); nm text := left(trim(coalesce(p_name, '')), 80); pw text;
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  if idx !~ '^[A-Z0-9-]{3,20}$' then return jsonb_build_object('ok', false, 'error', 'Enter an index number of 3 to 20 letters, numbers or dashes, for example CSC-1021.'); end if;
  if char_length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'Please enter the member name.'); end if;
  if exists (select 1 from public.church_members where index_number = idx) then return jsonb_build_object('ok', false, 'error', 'That index number is already used. Please choose another one.'); end if;
  pw := public._gen_member_password(nm);
  insert into public.church_members (index_number, full_name, phone, password_hash, active, ministries)
  values (idx, nm, nullif(left(trim(coalesce(p_phone, '')), 20), ''), crypt(pw, gen_salt('bf', 10)), true, array[sl]);
  return jsonb_build_object('ok', true, 'index', idx, 'name', nm, 'password', pw);
end $$;

create or replace function public.mgmt_member_password(p_token text, p_slug text, p_index text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, '')); idx text := upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g')); m public.church_members; pw text;
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  select * into m from public.church_members where index_number = idx and sl = any(ministries);
  if not found then return jsonb_build_object('ok', false, 'error', 'Member not found in your ministry.'); end if;
  pw := public._gen_member_password(m.full_name);
  update public.church_members set password_hash = crypt(pw, gen_salt('bf', 10)), failed_attempts = 0, locked_until = null where id = m.id;
  delete from public.access_sessions where member_id = m.id;
  return jsonb_build_object('ok', true, 'index', idx, 'name', m.full_name, 'password', pw);
end $$;

create or replace function public.mgmt_remove_member(p_token text, p_slug text, p_index text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, '')); idx text := upper(regexp_replace(coalesce(p_index, ''), '\s', '', 'g'));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  update public.church_members set ministries = array_remove(ministries, sl) where index_number = idx;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.member_login(text, text), public.session_info(text), public.ministry_list(text), public.ministry_home(text, text),
  public.admin_members(), public.admin_save_member(text, text, text, text, boolean, text[]), public.admin_add_members(jsonb, text[]),
  public.mgmt_members(text, text), public.mgmt_add_member(text, text, text, text, text), public.mgmt_member_password(text, text, text), public.mgmt_remove_member(text, text, text) from public;
grant execute on function public.member_login(text, text), public.session_info(text), public.ministry_list(text), public.ministry_home(text, text),
  public.admin_members(), public.admin_save_member(text, text, text, text, boolean, text[]), public.admin_add_members(jsonb, text[]),
  public.mgmt_members(text, text), public.mgmt_add_member(text, text, text, text, text), public.mgmt_member_password(text, text, text), public.mgmt_remove_member(text, text, text) to anon, authenticated;

select 'updated' as status;
