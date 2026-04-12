alter table public.community_comment_replies
  add column if not exists parent_reply_id uuid references public.community_comment_replies (id) on delete cascade;

create index if not exists community_comment_replies_parent_idx
  on public.community_comment_replies (parent_reply_id, created_at asc);
