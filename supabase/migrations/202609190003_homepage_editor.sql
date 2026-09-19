create table if not exists public.homepage_content (
  id text primary key default 'home',
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb not null default '{}'::jsonb,
  draft_updated_at timestamptz not null default now(),
  published_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.homepage_content enable row level security;
drop policy if exists "public reads published homepage" on public.homepage_content;
drop policy if exists "admin manages homepage" on public.homepage_content;
create policy "public reads published homepage" on public.homepage_content for select using (true);
create policy "admin manages homepage" on public.homepage_content for all using (public.is_admin()) with check (public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.homepage_content;
exception when duplicate_object then null;
end $$;
