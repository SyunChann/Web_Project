-- Server-only counters. No raw IP addresses, nicknames, emails or credentials are stored.
create table if not exists private.nickname_request_limits (
  key text primary key check (key ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  hits integer not null check(hits between 1 and 601)
);
alter table private.nickname_request_limits enable row level security;
revoke all on private.nickname_request_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.nickname_request_limits to service_role;
create index if not exists nickname_request_limits_window_idx on private.nickname_request_limits(window_start);
create or replace function public.consume_nickname_limit_v1(p_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare current_window timestamptz:=date_trunc('minute',clock_timestamp()); k text; count_hits integer; max_hits integer;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' or p_key=repeat('0',64) then raise exception 'Invalid rate key'; end if;
  delete from private.nickname_request_limits where key in (select key from private.nickname_request_limits where window_start < current_window-interval '10 minutes' order by window_start limit 100);
  -- Check the global bucket first so rejected traffic cannot allocate unbounded IP rows.
  foreach k in array array[repeat('0',64),p_key] loop
    max_hits:=case when k=p_key then 30 else 600 end;
    insert into private.nickname_request_limits as limits(key,window_start,hits) values(k,current_window,1)
    on conflict(key) do update set window_start=excluded.window_start,
      hits=case when limits.window_start=excluded.window_start then least(limits.hits+1,601) else 1 end
    returning hits into count_hits;
    if count_hits>max_hits then return jsonb_build_object('allowed',false,'retry_after',greatest(1,ceil(extract(epoch from current_window+interval '1 minute'-clock_timestamp()))::int)); end if;
  end loop;
  return jsonb_build_object('allowed',true,'retry_after',0);
end $$;
revoke all on function public.consume_nickname_limit_v1(text) from public,anon,authenticated;
grant execute on function public.consume_nickname_limit_v1(text) to service_role;
