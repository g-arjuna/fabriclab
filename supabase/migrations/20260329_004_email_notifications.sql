create table if not exists public.email_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  notify_new_content boolean not null default true,
  notify_thread_activity boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_subscriptions_notify_new_content_idx
  on public.email_subscriptions (notify_new_content)
  where notify_new_content = true;

create index if not exists email_subscriptions_notify_thread_activity_idx
  on public.email_subscriptions (notify_thread_activity)
  where notify_thread_activity = true;

drop trigger if exists set_email_subscriptions_updated_at on public.email_subscriptions;
create trigger set_email_subscriptions_updated_at
before update on public.email_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.email_subscriptions enable row level security;

drop policy if exists "email_subscriptions_select_own" on public.email_subscriptions;
create policy "email_subscriptions_select_own"
on public.email_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "email_subscriptions_insert_own" on public.email_subscriptions;
create policy "email_subscriptions_insert_own"
on public.email_subscriptions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "email_subscriptions_update_own" on public.email_subscriptions;
create policy "email_subscriptions_update_own"
on public.email_subscriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
