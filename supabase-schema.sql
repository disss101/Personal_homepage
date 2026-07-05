create table if not exists public.article_likes (
  article_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create table if not exists public.article_comments (
  id bigint generated always as identity primary key,
  article_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '匿名用户',
  body text not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);

alter table public.article_likes enable row level security;
alter table public.article_comments enable row level security;

drop policy if exists "Anyone can read likes" on public.article_likes;
create policy "Anyone can read likes"
on public.article_likes for select
to anon, authenticated
using (true);

drop policy if exists "Users can like as themselves" on public.article_likes;
create policy "Users can like as themselves"
on public.article_likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike their own likes" on public.article_likes;
create policy "Users can unlike their own likes"
on public.article_likes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Anyone can read comments" on public.article_comments;
create policy "Anyone can read comments"
on public.article_comments for select
to anon, authenticated
using (true);

drop policy if exists "Users can comment as themselves" on public.article_comments;
create policy "Users can comment as themselves"
on public.article_comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own comments" on public.article_comments;
create policy "Users can delete their own comments"
on public.article_comments for delete
to authenticated
using (auth.uid() = user_id);
