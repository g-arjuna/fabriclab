create table if not exists public.community_activity_reviews (
  activity_type text not null check (
    activity_type in (
      'content_comment',
      'content_comment_reply',
      'tracked_discussion',
      'tracked_discussion_reply',
      'general_thread',
      'general_thread_reply'
    )
  ),
  activity_id uuid not null,
  reviewed_by_user_id uuid not null references auth.users (id) on delete cascade,
  reviewed_by_name text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (activity_type, activity_id)
);

create index if not exists community_activity_reviews_reviewed_at_idx
  on public.community_activity_reviews (reviewed_at desc);

alter table public.community_activity_reviews enable row level security;
