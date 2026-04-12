create table if not exists public.community_comment_replies (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  author_email text,
  body text not null check (char_length(trim(body)) between 12 and 4000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_comment_replies_comment_idx
  on public.community_comment_replies (comment_id, created_at asc);

drop trigger if exists set_community_comment_replies_updated_at on public.community_comment_replies;
create trigger set_community_comment_replies_updated_at
before update on public.community_comment_replies
for each row execute procedure public.set_updated_at();

alter table public.community_comment_replies enable row level security;

drop policy if exists "community_comment_replies_public_select_published" on public.community_comment_replies;
create policy "community_comment_replies_public_select_published"
on public.community_comment_replies
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "community_comment_replies_insert_own" on public.community_comment_replies;
create policy "community_comment_replies_insert_own"
on public.community_comment_replies
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_comment_replies_update_own" on public.community_comment_replies;
create policy "community_comment_replies_update_own"
on public.community_comment_replies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
