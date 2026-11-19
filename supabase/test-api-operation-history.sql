-- Isolated temporary tables/functions. Never replace or seed production history.
begin;
create temp table qa_api_health (like public.api_service_health including all);
create temp table qa_api_observations (like public.api_service_observations including all);
do $copy$ declare source text;
begin
  foreach source in array array[pg_get_functiondef('public.record_api_observations_v1(jsonb)'::regprocedure),pg_get_functiondef('public.get_api_operation_stats_v1()'::regprocedure)] loop
    execute replace(replace(replace(replace(source,'public.record_api_observations_v1','pg_temp.qa_record_observations'),'public.get_api_operation_stats_v1','pg_temp.qa_get_stats'),'public.api_service_health','pg_temp.qa_api_health'),'public.api_service_observations','pg_temp.qa_api_observations');
  end loop;
end; $copy$;
do $test$
declare t timestamptz := now()-interval '10 minutes'; starts timestamptz := ((now() at time zone 'Asia/Seoul')::date - 6)::timestamp at time zone 'Asia/Seoul'; result jsonb; h record;
begin
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','anilist','state','ok','checked_at',t,'duration_ms',100)));
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','anilist','state','rate-limit','checked_at',t+interval '2 seconds','duration_ms',200,'http_status',429)));
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','anilist','state','ok','checked_at',t+interval '1 second','duration_ms',300)));
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','anilist','state','ok','checked_at',t+interval '3 seconds','duration_ms',0)));
  -- Duplicate retry must not inflate counts or rewrite the accepted result.
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','anilist','state','timeout','checked_at',t+interval '3 seconds','duration_ms',999)));
  if (select count(*) from qa_api_observations)<>4 then raise exception 'idempotency failed'; end if;
  select * into h from qa_api_health where service='anilist';
  if h.state<>'ok' or h.last_error_state<>'rate-limit' then raise exception 'latest health lost recovery/error'; end if;
  result := pg_temp.qa_get_stats();
  if (select sum((d->>'total_count')::int)<>4 or sum((d->>'success_count')::int)<>3 or sum((d->>'duration_total_ms')::int)<>600 or sum((d->>'limited_count')::int)<>1 from jsonb_array_elements(result->'daily') d) then raise exception 'daily totals failed: %',result; end if;
  if jsonb_array_length(result->'incidents')<>2 or result->'incidents'->0->>'state'<>'ok' or result->'incidents'->1->>'state'<>'rate-limit' then raise exception 'event order/recovery failed'; end if;
  -- Older day before window establishes the first visible observation's previous state.
  insert into qa_api_observations values ('toss',starts-interval '1 second','timeout',500,null,null),('toss',starts,'empty',100,null,null);
  result := pg_temp.qa_get_stats();
  if not exists(select 1 from jsonb_array_elements(result->'incidents') e where e->>'service'='toss' and e->>'state'='empty' and e->>'previous_state'='timeout') then raise exception 'window-boundary recovery failed'; end if;
  if (result->>'window_start')::timestamptz<>starts then raise exception 'KST calendar boundary failed'; end if;
  insert into qa_api_observations values ('icn-t1',t,'ok',100,null,t-interval '15 minutes');
  result := pg_temp.qa_get_stats();
  if not exists(select 1 from jsonb_array_elements(result->'daily') d where d->>'service'='icn-t1' and (d->>'success_count')::int=0) then raise exception 'stale source counted as success'; end if;
  -- Empty history must not become fake availability data.
  delete from qa_api_observations;
  result := pg_temp.qa_get_stats();
  if result->'daily'<>'[]'::jsonb or result->'incidents'<>'[]'::jsonb or result->'first_observation_at'<>'null'::jsonb then raise exception 'empty history failed'; end if;
  insert into qa_api_observations values ('anilist',now()-interval '9 days','ok',1,null,null);
  perform pg_temp.qa_record_observations('[]');
  if exists(select 1 from qa_api_observations) then raise exception 'retention failed'; end if;
end; $test$;
set local role anon;
do $denied$ begin
  begin perform service from public.api_service_observations; raise exception 'anon read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.get_api_operation_stats_v1(); raise exception 'anon RPC allowed'; exception when insufficient_privilege then null; end;
end; $denied$;
set local role authenticated;
do $denied$ begin
  begin perform service from public.api_service_observations; raise exception 'member read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.get_api_operation_stats_v1(); raise exception 'member RPC allowed'; exception when insufficient_privilege then null; end;
end; $denied$;
rollback;
select 'PASS: idempotency, out-of-order history, weighted totals, rate limits, recovery, KST window, empty history, retention, anonymous/member denial' as result;
