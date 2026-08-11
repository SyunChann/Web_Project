create table if not exists public.omok_rooms (
  id uuid primary key default gen_random_uuid(),
  black_player_id uuid not null references auth.users(id) on delete cascade,
  black_player_name text not null,
  white_player_id uuid references auth.users(id) on delete set null,
  white_player_name text,
  board jsonb not null default '[]'::jsonb,
  turn text not null default 'black' check (turn in ('black', 'white')),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  winner text check (winner in ('black', 'white', 'draw')),
  move_count integer not null default 0 check (move_count >= 0),
  last_move_row integer check (last_move_row between 0 and 14),
  last_move_col integer check (last_move_col between 0 and 14),
  turn_started_at timestamptz,
  finish_reason text check (finish_reason in ('five', 'draw', 'agreement', 'resign', 'timeout')),
  draw_offer_by uuid references auth.users(id) on delete set null,
  rematch_requested_by uuid references auth.users(id) on delete set null,
  rematch_room_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.omok_rooms
  add column if not exists turn_started_at timestamptz,
  add column if not exists finish_reason text check (finish_reason in ('five', 'draw', 'agreement', 'resign', 'timeout')),
  add column if not exists draw_offer_by uuid references auth.users(id) on delete set null,
  add column if not exists rematch_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists rematch_room_id uuid;

create index if not exists omok_rooms_open_idx
  on public.omok_rooms (status, created_at desc);

alter table public.omok_rooms enable row level security;

drop policy if exists "omok rooms are publicly readable" on public.omok_rooms;
create policy "omok rooms are publicly readable"
  on public.omok_rooms for select using (true);

drop policy if exists "players can create omok rooms" on public.omok_rooms;
create policy "players can create omok rooms"
  on public.omok_rooms for insert to authenticated
  with check (black_player_id = auth.uid() or white_player_id = auth.uid());

drop policy if exists "players can update their omok rooms" on public.omok_rooms;
create policy "players can update their omok rooms"
  on public.omok_rooms for update to authenticated
  using (
    black_player_id = auth.uid()
    or white_player_id = auth.uid()
    or (status = 'waiting' and white_player_id is null)
  )
  with check (black_player_id = auth.uid() or white_player_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.omok_rooms;
exception
  when duplicate_object then null;
end $$;
