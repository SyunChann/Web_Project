begin;
set local role anon;
do $$ begin
  begin perform public.consume_nickname_limit_v1(repeat('a',64)); raise exception 'Anonymous limiter access accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform public.consume_nickname_limit_v1(repeat('a',64)); raise exception 'Member limiter access accepted'; exception when insufficient_privilege then null; end;
  begin perform count(*) from private.nickname_request_limits; raise exception 'Counters exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare result jsonb; key_a text:=encode(sha256(gen_random_uuid()::text::bytea),'hex'); key_b text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
begin
  result:=public.consume_nickname_limit_v1(key_a);
  if not (result->>'allowed')::boolean then raise exception 'First request blocked'; end if;
  update private.nickname_request_limits set hits=30 where key=key_a;
  result:=public.consume_nickname_limit_v1(key_a);
  if (result->>'allowed')::boolean or (result->>'retry_after')::int not between 1 and 60 then raise exception 'IP limit failed'; end if;
  update private.nickname_request_limits set window_start=window_start-interval '1 minute' where key=key_a;
  result:=public.consume_nickname_limit_v1(key_a);
  if not (result->>'allowed')::boolean then raise exception 'Expired window did not reset'; end if;
  update private.nickname_request_limits set hits=600 where key=repeat('0',64);
  result:=public.consume_nickname_limit_v1(key_b);
  if (result->>'allowed')::boolean then raise exception 'Global limit failed'; end if;
  if exists(select 1 from private.nickname_request_limits where key=key_b) then raise exception 'Blocked global request allocated a new IP row'; end if;
end $$;
reset role;
rollback;
select 'PASS: server-only privileges, private counters, IP/global quotas and window reset' as result;
