-- Run once in the Supabase SQL Editor before using overseas travel records.
create table if not exists public.travel (
  id text primary key,
  scope text not null default 'overseas' check (scope in ('domestic', 'overseas')),
  trip_title text,
  title text not null,
  store_name text not null,
  category text not null check (category in ('korea', 'japan', 'china', 'other')),
  address text,
  latitude double precision,
  longitude double precision,
  place_id text,
  map_url text,
  has_parking text,
  rating numeric(2, 1) not null check (rating >= 0 and rating <= 5),
  visited_at date not null,
  visited_time time,
  itinerary jsonb not null default '[]'::jsonb,
  thumbnail text,
  thumbnail_alt text,
  summary text not null,
  review text not null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.travel
  add column if not exists scope text not null default 'overseas'
    check (scope in ('domestic', 'overseas')),
  add column if not exists trip_title text,
  add column if not exists visited_time time,
  add column if not exists itinerary jsonb not null default '[]'::jsonb,
  add column if not exists author_id uuid references auth.users(id) on delete set null,
  add column if not exists author_name text;

alter table public.travel enable row level security;

drop policy if exists "travel is publicly readable" on public.travel;
drop policy if exists "invited users can insert travel" on public.travel;
drop policy if exists "authors can update own travel" on public.travel;
drop policy if exists "authors can delete own travel" on public.travel;

create policy "travel is publicly readable"
  on public.travel for select using (true);

create policy "invited users can insert travel"
  on public.travel for insert to authenticated
  with check (public.is_invited_user() and author_id = auth.uid());

create policy "authors can update own travel"
  on public.travel for update to authenticated
  using (public.is_invited_user() and author_id = auth.uid())
  with check (public.is_invited_user() and author_id = auth.uid());

create policy "authors can delete own travel"
  on public.travel for delete to authenticated
  using (public.is_invited_user() and author_id = auth.uid());

create index if not exists travel_scope_idx on public.travel (scope);
create index if not exists travel_visited_at_idx on public.travel (visited_at, visited_time);
