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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "reviews are publicly readable" on public.reviews;

create policy "reviews are publicly readable"
  on public.reviews
  for select
  using (true);

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
