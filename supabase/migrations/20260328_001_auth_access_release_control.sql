create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  kind text not null check (kind in ('chapter', 'lab')),
  title text,
  part text,
  order_index integer,
  duration_minutes integer,
  description text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  access_tier text not null default 'paid' check (access_tier in ('free', 'paid')),
  preview_enabled boolean not null default true,
  preview_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_key text not null check (entitlement_key in ('core_paid')),
  source text not null check (source in ('manual', 'billing')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entitlement_key)
);

create table if not exists public.chapter_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_slug text not null,
  completed_pages integer[] not null default '{}',
  last_page_index integer not null default 0,
  percent_complete integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chapter_slug)
);

create table if not exists public.lab_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lab_id text not null,
  completed boolean not null default false,
  score integer,
  attempts integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lab_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_content_catalog_updated_at on public.content_catalog;
create trigger set_content_catalog_updated_at
before update on public.content_catalog
for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_entitlements_updated_at on public.user_entitlements;
create trigger set_user_entitlements_updated_at
before update on public.user_entitlements
for each row execute procedure public.set_updated_at();

drop trigger if exists set_chapter_progress_updated_at on public.chapter_progress;
create trigger set_chapter_progress_updated_at
before update on public.chapter_progress
for each row execute procedure public.set_updated_at();

drop trigger if exists set_lab_progress_updated_at on public.lab_progress;
create trigger set_lab_progress_updated_at
before update on public.lab_progress
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.content_catalog enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.lab_progress enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_update_own_display_name" on public.profiles;
create policy "profiles_update_own_display_name"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "catalog_public_select_published" on public.content_catalog;
create policy "catalog_public_select_published"
on public.content_catalog
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "entitlements_select_own" on public.user_entitlements;
create policy "entitlements_select_own"
on public.user_entitlements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "chapter_progress_select_own" on public.chapter_progress;
create policy "chapter_progress_select_own"
on public.chapter_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "chapter_progress_insert_own" on public.chapter_progress;
create policy "chapter_progress_insert_own"
on public.chapter_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "chapter_progress_update_own" on public.chapter_progress;
create policy "chapter_progress_update_own"
on public.chapter_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "lab_progress_select_own" on public.lab_progress;
create policy "lab_progress_select_own"
on public.lab_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "lab_progress_insert_own" on public.lab_progress;
create policy "lab_progress_insert_own"
on public.lab_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "lab_progress_update_own" on public.lab_progress;
create policy "lab_progress_update_own"
on public.lab_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
