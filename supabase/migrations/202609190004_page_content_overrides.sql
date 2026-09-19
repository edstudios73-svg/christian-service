alter table public.pages
  add column if not exists content_overrides jsonb not null default '{}'::jsonb;

comment on column public.pages.content_overrides is
  'Published per-element text, link, and image overrides managed by the Page Editors workspace.';
