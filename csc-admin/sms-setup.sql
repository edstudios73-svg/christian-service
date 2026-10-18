-- Christian Service Church: SMS setup (paste the WHOLE file in Supabase > SQL Editor > Run)
-- =====================================================================
-- SMS announcements and updates (SasuSync bulk SMS)
-- Safe to run more than once. Requires public.is_admin() from the main setup.
-- =====================================================================

-- Ghana phone normaliser: 0551234567 / +233551234567 / 551234567 -> 233551234567
create or replace function public.normalize_gh_phone(raw text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g');
begin
  if length(d) = 14 and d like '00233%' then d := substr(d, 3); end if;
  if d ~ '^233[0-9]{9}$' then return d;
  elsif d ~ '^0[0-9]{9}$' then return '233' || substr(d, 2);
  elsif d ~ '^[0-9]{9}$' then return '233' || d;
  end if;
  return null;
end $$;

-- People who receive announcements by SMS
create table if not exists public.sms_subscribers (
  id text primary key default gen_random_uuid()::text,
  phone text not null unique,
  name text,
  status text not null default 'active' check (status in ('active', 'opted_out')),
  source text not null default 'admin' check (source in ('website', 'admin', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  opted_out_at timestamptz
);

create or replace function public.sms_subscribers_prepare() returns trigger
language plpgsql as $$
begin
  new.phone := public.normalize_gh_phone(new.phone);
  if new.phone is null then
    raise exception 'Enter a valid Ghana phone number, for example 0551234567' using errcode = '22023';
  end if;
  new.name := nullif(btrim(coalesce(new.name, '')), '');
  new.updated_at := now();
  if new.status = 'opted_out' and (tg_op = 'INSERT' or old.status is distinct from 'opted_out') then
    new.opted_out_at := now();
  elsif new.status = 'active' then
    new.opted_out_at := null;
  end if;
  return new;
end $$;

drop trigger if exists sms_subscribers_prepare on public.sms_subscribers;
create trigger sms_subscribers_prepare
  before insert or update on public.sms_subscribers
  for each row execute function public.sms_subscribers_prepare();

alter table public.sms_subscribers enable row level security;
drop policy if exists "visitors can subscribe" on public.sms_subscribers;
drop policy if exists "admin manages sms subscribers" on public.sms_subscribers;
-- Anyone can sign up from the website footer; nobody but the admin can read or change the list.
create policy "visitors can subscribe" on public.sms_subscribers
  for insert to anon, authenticated
  with check (status = 'active' and source = 'website' and phone ~ '^233[0-9]{9}$' and char_length(coalesce(name, '')) <= 80);
create policy "admin manages sms subscribers" on public.sms_subscribers
  for all using (public.is_admin()) with check (public.is_admin());
grant insert on public.sms_subscribers to anon;
grant select, insert, update, delete on public.sms_subscribers to authenticated;

-- Log of every SMS send (also prevents sending the same announcement twice)
create table if not exists public.sms_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'announcement' check (kind in ('announcement', 'test', 'custom')),
  announcement_id text references public.announcements(id) on delete set null,
  message text not null,
  sender_id text not null,
  mode text not null default 'live' check (mode in ('live', 'sandbox')),
  recipients_count integer not null default 0,
  credits_deducted integer,
  job_ids text[] not null default '{}',
  status text not null default 'sending' check (status in ('sending', 'sent', 'partial', 'failed')),
  error text,
  triggered_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists sms_messages_announcement_once
  on public.sms_messages (announcement_id)
  where kind = 'announcement' and mode = 'live' and status in ('sending', 'sent', 'partial');

alter table public.sms_messages enable row level security;
drop policy if exists "admin manages sms messages" on public.sms_messages;
create policy "admin manages sms messages" on public.sms_messages
  for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.sms_messages to authenticated;

-- =====================================================================
-- HEALTH CHECK: every status below should say OK
-- =====================================================================
select * from (
  select 1 as n, 'SMS subscribers table' as check_name,
    case when to_regclass('public.sms_subscribers') is not null then 'OK' else 'FIX: table missing' end as status
  union all
  select 2, 'SMS log table', case when to_regclass('public.sms_messages') is not null then 'OK' else 'FIX: table missing' end
  union all
  select 3, 'Security switched on for both tables',
    case when (select count(*) from pg_tables where schemaname = 'public' and tablename in ('sms_subscribers', 'sms_messages') and rowsecurity) = 2 then 'OK' else 'FIX: row security is off' end
  union all
  select 4, 'Website visitors can subscribe',
    case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sms_subscribers' and policyname = 'visitors can subscribe') then 'OK' else 'FIX: sign-up policy missing' end
  union all
  select 5, 'Only the admin can read the subscriber list',
    case when exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sms_subscribers' and policyname = 'admin manages sms subscribers') then 'OK' else 'FIX: admin policy missing' end
  union all
  select 6, 'Phone numbers are cleaned automatically',
    case when public.normalize_gh_phone('0551172156') = '233551172156' then 'OK' else 'FIX: normaliser not working' end
  union all
  select 7, 'Active SMS subscribers so far', (select count(*)::text from public.sms_subscribers where status = 'active')
) checks
order by n;
