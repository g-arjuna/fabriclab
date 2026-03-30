alter table public.email_subscriptions
  add column if not exists preferences_confirmed boolean not null default false;

comment on column public.email_subscriptions.preferences_confirmed is
  'Tracks whether a user explicitly saved notification preferences, as distinct from rows auto-created by participation.';
