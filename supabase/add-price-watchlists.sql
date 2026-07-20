create table if not exists public.price_watchlists (
  id text primary key,
  title text not null,
  product_url text not null,
  source text not null default 'coupang',
  current_price numeric(12, 0) not null check (current_price >= 0),
  lowest_price numeric(12, 0) not null check (lowest_price >= 0),
  target_price numeric(12, 0),
  is_active boolean not null default true,
  author_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  watchlist_id text not null references public.price_watchlists(id) on delete cascade,
  price numeric(12, 0) not null check (price >= 0),
  source text not null default 'manual',
  checked_at timestamptz not null default now()
);

create index if not exists price_history_watchlist_checked_idx on public.price_history (watchlist_id, checked_at desc);
alter table public.price_watchlists enable row level security;
alter table public.price_history enable row level security;

alter table public.price_watchlists
  add column if not exists last_checked_at timestamptz;

drop policy if exists "price watchlists are publicly readable" on public.price_watchlists;
drop policy if exists "price history is publicly readable" on public.price_history;
drop policy if exists "invited users can manage price watchlists" on public.price_watchlists;
drop policy if exists "invited users can add price history" on public.price_history;
drop policy if exists "authors can manage price watchlists" on public.price_watchlists;
drop policy if exists "authors can add price history" on public.price_history;

create policy "price watchlists are publicly readable" on public.price_watchlists for select using (true);
create policy "price history is publicly readable" on public.price_history for select using (true);
create policy "authors can manage price watchlists" on public.price_watchlists for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors can add price history" on public.price_history for insert to authenticated with check (exists (select 1 from public.price_watchlists where id = watchlist_id and author_id = auth.uid()));
