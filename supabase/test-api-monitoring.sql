-- Temporary data only. Private production records are never modified.
begin;
create temp table qa_api_health (like public.api_service_health including all);
do $copy$ begin
  if to_regclass('public.api_service_observations') is not null then
    execute 'create temp table qa_api_observations (like public.api_service_observations including all)';
  end if;
  execute replace(replace(replace(pg_get_functiondef('public.record_api_observations_v1(jsonb)'::regprocedure),
    'public.record_api_observations_v1','pg_temp.qa_record_observations'),'public.api_service_health','pg_temp.qa_api_health'),'public.api_service_observations','pg_temp.qa_api_observations');
end; $copy$;
do $test$
declare t timestamptz := now()-interval '1 minute'; h record;
begin
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','icn-flights','state','ok','checked_at',t,'duration_ms',100)));
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','icn-flights','state','authentication','checked_at',t+interval '10 seconds','duration_ms',200,'http_status',403)));
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','icn-flights','state','ok','checked_at',t+interval '5 seconds','duration_ms',300)));
  select * into h from qa_api_health where service='icn-flights';
  if h.state<>'authentication' or h.http_status<>403 or h.last_success_at<>t+interval '5 seconds' then raise exception 'out-of-order observations lost state/success'; end if;
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','icn-flights','state','empty','checked_at',t+interval '15 seconds','duration_ms',50)));
  select * into h from qa_api_health where service='icn-flights';
  if h.state<>'empty' or h.duration_ms<>50 or h.last_error_state<>'authentication' or h.last_error_at<>t+interval '10 seconds' then raise exception 'recovery lost error history'; end if;
  perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','icn-flights','state','timeout','checked_at',t+interval '2 seconds','duration_ms',1000)));
  select * into h from qa_api_health where service='icn-flights';
  if h.state<>'empty' or h.last_error_state<>'authentication' then raise exception 'old failure replaced newer state'; end if;
  begin
    perform pg_temp.qa_record_observations(jsonb_build_array(jsonb_build_object('service','unknown','state','ok','checked_at',t,'duration_ms',100)));
    raise exception 'unknown service was accepted';
  exception when check_violation then null; end;
end; $test$;
rollback;

begin;
set local role anon;
do $test$ begin
  begin perform service from public.api_service_health; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.record_api_observations_v1('[]'); raise exception 'anonymous write allowed'; exception when insufficient_privilege then null; end;
end; $test$;
set local role authenticated;
do $test$ begin
  begin perform service from public.api_service_health; raise exception 'member read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.record_api_observations_v1('[]'); raise exception 'member write allowed'; exception when insufficient_privilege then null; end;
end; $test$;
rollback;
select 'PASS: atomic latest state, success/error retention, out-of-order results, invalid service rejection, anonymous/member access denied' as result;
