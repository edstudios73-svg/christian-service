-- Public "Join now" form on the Ministries page. Requests go to that ministry's head (Joins tab in their admin)
-- and to the church admin (Admin > Ministry join requests). Safe to run more than once.

alter table public.ministry_join_requests drop constraint if exists ministry_join_requests_slug_fkey;
alter table public.ministry_join_requests add column if not exists ministry_title text;

create or replace function public.ministry_join_public(p_slug text, p_name text, p_phone text, p_message text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare sl text := lower(trim(coalesce(p_slug, ''))); ph text := public.normalize_gh_phone(p_phone); nm text := left(trim(coalesce(p_name, '')), 80); ttl text;
begin
  if sl not in ('mediateam','youth','prayer','ushers','choir','evangelism','virtuouswomen','children') then return jsonb_build_object('ok', false, 'error', 'Please choose a ministry.'); end if;
  if char_length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'Please enter your name.'); end if;
  if ph is null then return jsonb_build_object('ok', false, 'error', 'Please enter a valid Ghana phone number, for example 0551234567.'); end if;
  if exists (select 1 from public.ministry_join_requests where slug = sl and phone = ph and status = 'new' and created_at > now() - interval '1 day') then
    return jsonb_build_object('ok', true);
  end if;
  ttl := case sl when 'mediateam' then 'Media Ministry' when 'youth' then 'Vibrant Youth' when 'prayer' then 'Prayer Team' when 'ushers' then 'Ushers & Protocol'
    when 'choir' then 'Ezekiel Choir' when 'evangelism' then 'Evangelism' when 'virtuouswomen' then 'Virtuous Women of Destiny' else 'Children''s Ministry' end;
  insert into public.ministry_join_requests (slug, name, phone, message, ministry_title) values (sl, nm, ph, nullif(left(trim(coalesce(p_message, '')), 500), ''), ttl);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.ministry_join_public(text, text, text, text) from public;
grant execute on function public.ministry_join_public(text, text, text, text) to anon, authenticated;

-- Church admin: every request across all ministries
create or replace function public.admin_join_list() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  return jsonb_build_object('ok', true, 'joins', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.ministry_join_requests x), '[]'::jsonb));
end $$;
create or replace function public.admin_join_status(p_id uuid, p_status text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'error', 'Admin only.'); end if;
  if p_status = 'delete' then delete from public.ministry_join_requests where id = p_id;
  elsif p_status in ('new', 'contacted', 'joined') then update public.ministry_join_requests set status = p_status where id = p_id;
  else return jsonb_build_object('ok', false, 'error', 'Unknown status.'); end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.admin_join_list(), public.admin_join_status(uuid, text) from public, anon;
grant execute on function public.admin_join_list(), public.admin_join_status(uuid, text) to authenticated;

select 'updated' as status;
