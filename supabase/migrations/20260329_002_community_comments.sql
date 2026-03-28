create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  content_kind text not null check (content_kind in ('chapter', 'lab')),
  content_slug text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_email text,
  comment_type text not null default 'feedback' check (comment_type in ('feedback', 'correction', 'issue', 'question')),
  body text not null check (char_length(trim(body)) between 12 and 4000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_comments_content_idx
  on public.community_comments (content_kind, content_slug, created_at desc);

drop trigger if exists set_community_comments_updated_at on public.community_comments;
create trigger set_community_comments_updated_at
before update on public.community_comments
for each row execute procedure public.set_updated_at();

alter table public.community_comments enable row level security;

drop policy if exists "community_comments_public_select_published" on public.community_comments;
create policy "community_comments_public_select_published"
on public.community_comments
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own"
on public.community_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_comments_update_own" on public.community_comments;
create policy "community_comments_update_own"
on public.community_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

