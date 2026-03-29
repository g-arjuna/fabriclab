create table if not exists public.community_threads (
  id uuid primary key default gen_random_uuid(),
  thread_type text not null check (thread_type in ('general', 'chapter', 'lab')),
  content_kind text check (content_kind in ('chapter', 'lab')),
  content_slug text,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_email text,
  title text not null check (char_length(trim(title)) between 6 and 160),
  body text not null check (char_length(trim(body)) between 20 and 5000),
  github_issue_url text,
  github_issue_number integer,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_threads_target_consistency check (
    (thread_type = 'general' and content_kind is null and content_slug is null)
    or
    (thread_type in ('chapter', 'lab') and content_kind = thread_type and content_slug is not null)
  )
);

create index if not exists community_threads_type_idx
  on public.community_threads (thread_type, created_at desc);

create index if not exists community_threads_target_idx
  on public.community_threads (content_kind, content_slug, created_at desc);

drop trigger if exists set_community_threads_updated_at on public.community_threads;
create trigger set_community_threads_updated_at
before update on public.community_threads
for each row execute procedure public.set_updated_at();

alter table public.community_threads enable row level security;

drop policy if exists "community_threads_public_select_published" on public.community_threads;
create policy "community_threads_public_select_published"
on public.community_threads
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "community_threads_insert_own" on public.community_threads;
create policy "community_threads_insert_own"
on public.community_threads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_threads_update_own" on public.community_threads;
create policy "community_threads_update_own"
on public.community_threads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_email text,
  body text not null check (char_length(trim(body)) between 12 and 4000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_thread_idx
  on public.community_posts (thread_id, created_at asc);

drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row execute procedure public.set_updated_at();

alter table public.community_posts enable row level security;

drop policy if exists "community_posts_public_select_published" on public.community_posts;
create policy "community_posts_public_select_published"
on public.community_posts
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
on public.community_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
