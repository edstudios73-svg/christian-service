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

create index if not exists analytics_integrations_provider_idx
  on public.analytics_integrations (provider);

create index if not exists analytics_integrations_enabled_idx
  on public.analytics_integrations (enabled);

alter table public.analytics_integrations enable row level security;

create policy "admins manage analytics config"
  on public.analytics_integrations
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "visitors cannot access analytics config"
  on public.analytics_integrations
  for select using (false);
