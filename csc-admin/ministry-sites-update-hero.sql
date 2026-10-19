-- Update: the ministry page hero follows the picture chosen in Admin > Ministries.
-- Paste in Supabase > SQL Editor > Run. Safe to run more than once.


create or replace function public.ministry_thumb(p_slug text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select nullif(trim(m.image), '') from public.ministries m
  where case lower(coalesce(p_slug, ''))
    when 'mediateam' then m.title ilike '%media%'
    when 'youth' then m.title ilike '%youth%' or m.title ilike '%vibrant%'
    when 'prayer' then m.title ilike '%prayer%'
    when 'ushers' then m.title ilike '%usher%' or m.title ilike '%protocol%'
    when 'choir' then m.title ilike '%choir%' or m.title ilike '%ezekiel%'
    when 'evangelism' then m.title ilike '%evangel%'
    else false end
  order by m.updated_at desc nulls last, m.created_at desc limit 1
$$;
revoke execute on function public.ministry_thumb(text) from public, anon, authenticated;

-- 5. What a signed-in member sees --------------------------------------------------------------
create or replace function public.ministry_list(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  return jsonb_build_object('ok', true, 'sites', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'tagline', tagline) order by name) from public.ministry_sites), '[]'::jsonb));
end $$;

revoke execute on function public.ministry_thumb(text) from public, anon, authenticated;

create or replace function public.ministry_home(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.ministry_sites;
begin
  if not public._can_view(p_token) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  select * into s from public.ministry_sites where slug = lower(coalesce(p_slug, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  return jsonb_build_object('ok', true,
    'site', to_jsonb(s) || jsonb_build_object('hero_image', coalesce(public.ministry_thumb(s.slug), s.hero_image)),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, kind, title, body, event_date, event_time, location, image, created_at from public.ministry_posts where slug = s.slug and published order by created_at desc limit 60) x), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.created_at) from (select id, name, role, image, sort_order, created_at from public.ministry_team where slug = s.slug) x), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id, image, caption, created_at from public.ministry_gallery where slug = s.slug order by created_at desc limit 80) x), '[]'::jsonb));
end $$;

create or replace function public.mgmt_load(p_token text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare s public.ministry_sites;
begin
  if not public._can_manage(p_token, lower(coalesce(p_slug, ''))) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  select * into s from public.ministry_sites where slug = lower(p_slug);
  if not found then return jsonb_build_object('ok', false, 'error', 'notfound'); end if;
  return jsonb_build_object('ok', true, 'site', to_jsonb(s) || jsonb_build_object('hero_image', coalesce(public.ministry_thumb(s.slug), s.hero_image)),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_posts x where slug = s.slug), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_gallery x where slug = s.slug), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order, x.created_at) from public.ministry_team x where slug = s.slug), '[]'::jsonb),
    'joins', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_join_requests x where slug = s.slug), '[]'::jsonb));
end $$;

create or replace function public.mgmt_save_site(p_token text, p_slug text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(coalesce(p_slug, ''));
begin
  if not public._can_manage(p_token, sl) then return jsonb_build_object('ok', false, 'error', 'signin'); end if;
  update public.ministry_sites set tagline = nullif(p->>'tagline', ''), about = nullif(p->>'about', ''), meeting_info = nullif(p->>'meeting_info', ''),
    contact_phone = nullif(p->>'contact_phone', ''), contact_email = nullif(p->>'contact_email', ''), whatsapp = nullif(p->>'whatsapp', ''),
    hero_image = case when p ? 'hero_image' then nullif(p->>'hero_image', '') else hero_image end, updated_at = now() where slug = sl;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.ministry_home(text, text), public.mgmt_load(text, text), public.mgmt_save_site(text, text, jsonb) from public;
grant execute on function public.ministry_home(text, text), public.mgmt_load(text, text), public.mgmt_save_site(text, text, jsonb) to anon, authenticated;

select 'updated' as status;

