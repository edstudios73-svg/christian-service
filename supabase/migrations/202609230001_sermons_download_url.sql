-- Ensure existing Supabase projects expose the optional sermon download link.
alter table public.sermons add column if not exists download_url text;
