create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id text primary key,
  title text not null,
  type text not null check (type in ('movie', 'anime', 'game', 'drama')),
  genre text[] not null default '{}',
  rating numeric(2, 1) not null check (rating >= 0 and rating <= 5),
  watched_at date not null,
  thumbnail text,
  thumbnail_alt text,
  summary text not null,
  review text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_name text;

alter table public.reviews enable row level security;

drop policy if exists "reviews are publicly readable" on public.reviews;

create policy "reviews are publicly readable"
  on public.reviews
  for select
  using (true);

create table if not exists public.watchlist_items (
  id text primary key,
  title text not null,
  type text not null check (type in ('movie', 'anime', 'game', 'drama')),
  genre text[] not null default '{}',
  status text not null default 'waiting' check (status in ('waiting', 'watching', 'paused')),
  release_label text not null,
  thumbnail text,
  thumbnail_alt text,
  reason text not null,
  youtube_url text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.watchlist_items
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_name text;

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist items are publicly readable" on public.watchlist_items;

create policy "watchlist items are publicly readable"
  on public.watchlist_items
  for select
  using (true);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null default 'member' check (role in ('member', 'admin')),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0 and used_count <= max_uses),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_code_uses (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid not null references public.invite_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (invite_code_id, user_id)
);

create index if not exists invite_codes_code_idx
  on public.invite_codes (code);

create index if not exists invite_code_uses_user_id_idx
  on public.invite_code_uses (user_id);

alter table public.invite_codes enable row level security;
alter table public.invite_code_uses enable row level security;

drop policy if exists "users can read own invite code uses" on public.invite_code_uses;

create policy "users can read own invite code uses"
  on public.invite_code_uses
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_invited_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invite_code_uses
    where user_id = auth.uid()
  );
$$;

create or replace function public.validate_invite_code(invite_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.invite_codes
    where code = upper(btrim(invite_code))
      and revoked_at is null
      and expires_at > now()
      and used_count < max_uses
  );
$$;

create or replace function public.claim_invite_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invite_codes%rowtype;
  current_user_id uuid := auth.uid();
  normalized_code text := upper(btrim(invite_code));
begin
  if current_user_id is null then
    raise exception 'login required';
  end if;

  select *
    into invite_row
    from public.invite_codes
    where code = normalized_code
      and revoked_at is null
      and expires_at > now()
      and used_count < max_uses
    for update;

  if not found then
    raise exception 'invalid invite code';
  end if;

  insert into public.invite_code_uses (
    invite_code_id,
    user_id
  ) values (
    invite_row.id,
    current_user_id
  )
  on conflict do nothing;

  if found then
    update public.invite_codes
      set used_count = used_count + 1,
          updated_at = now()
      where id = invite_row.id;
  end if;

  return invite_row.id;
end;
$$;

revoke execute on function public.is_invited_user() from public;
revoke execute on function public.validate_invite_code(text) from public;
revoke execute on function public.claim_invite_code(text) from public;

grant execute on function public.is_invited_user() to authenticated;
grant execute on function public.validate_invite_code(text) to anon, authenticated;
grant execute on function public.claim_invite_code(text) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'review-thumbnails',
  'review-thumbnails',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "review thumbnails are publicly readable" on storage.objects;

create policy "review thumbnails are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'review-thumbnails');
