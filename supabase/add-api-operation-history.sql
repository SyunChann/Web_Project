-- Run after add-api-monitoring.sql. Only server-side service_role can access these records.
create table if not exists public.api_service_observations (
  service text not null check (service in ('icn-flights','icn-t1','icn-t2','exchange-koreaexim','exchange-ecb','toss','naver-shopping','lck-official','lck-naver','anilist')),
  checked_at timestamptz not null,
  state text not null check (state in ('ok','empty','partial','stale','authentication','rate-limit','timeout','invalid-response','upstream-error','network-error')),
  duration_ms integer not null check (duration_ms between 0 and 300000),
  http_status integer check (http_status between 100 and 599),
  source_updated_at timestamptz,
  primary key (service, checked_at)
);
create index if not exists api_service_observations_time_idx on public.api_service_observations (checked_at);
alter table public.api_service_observations enable row level security;
revoke all on public.api_service_observations from public,anon,authenticated;
grant select,insert,delete on public.api_service_observations to service_role;

create or replace function public.record_api_observations_v1(p_events jsonb)
returns void language plpgsql security invoker set search_path = '' as $function$
declare e record; inserted integer;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 20 then raise exception 'Invalid observation batch'; end if;
  -- Consistent lock ordering across concurrent service batches.
  for e in select * from jsonb_to_recordset(p_events) as x(service text,state text,checked_at timestamptz,duration_ms integer,http_status integer,source_updated_at timestamptz)
    order by service,checked_at
  loop
    if e.checked_at > now() + interval '5 minutes' or e.checked_at < now() - interval '1 day' then continue; end if;
    insert into public.api_service_observations (service,state,checked_at,duration_ms,http_status,source_updated_at)
      values (e.service,e.state,e.checked_at,e.duration_ms,e.http_status,e.source_updated_at)
      on conflict (service,checked_at) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then continue; end if;
    insert into public.api_service_health as h (service,state,checked_at,duration_ms,http_status,source_updated_at,last_success_at,last_error_at,last_error_state)
      values (e.service,e.state,e.checked_at,e.duration_ms,e.http_status,e.source_updated_at,
        case when e.state in ('ok','empty','partial') then e.checked_at end,
        case when e.state not in ('ok','empty') then e.checked_at end,
        case when e.state not in ('ok','empty') then e.state end)
    on conflict (service) do update set
      state=case when excluded.checked_at >= h.checked_at then excluded.state else h.state end,
      duration_ms=case when excluded.checked_at >= h.checked_at then excluded.duration_ms else h.duration_ms end,
      http_status=case when excluded.checked_at >= h.checked_at then excluded.http_status else h.http_status end,
      source_updated_at=case when excluded.checked_at >= h.checked_at then excluded.source_updated_at else h.source_updated_at end,
      checked_at=greatest(h.checked_at,excluded.checked_at),
      last_success_at=greatest(h.last_success_at,excluded.last_success_at),
      last_error_state=case when excluded.last_error_at >= coalesce(h.last_error_at,'-infinity'::timestamptz) then excluded.last_error_state else h.last_error_state end,
      last_error_at=greatest(h.last_error_at,excluded.last_error_at);
  end loop;
  -- Indexed retention cleanup runs only when a batch is stored; no scheduled provider probes.
  delete from public.api_service_observations where checked_at < now() - interval '8 days';
end;
$function$;
revoke all on function public.record_api_observations_v1(jsonb) from public,anon,authenticated;
grant execute on function public.record_api_observations_v1(jsonb) to service_role;

create or replace function public.get_api_operation_stats_v1()
returns jsonb language sql stable security invoker set search_path = '' as $function$
  with bounds as (
    select ((now() at time zone 'Asia/Seoul')::date - 6)::timestamp at time zone 'Asia/Seoul' as starts_at, now() as ends_at
  ), observations as materialized (
    select o.service,o.checked_at,o.duration_ms,o.http_status,
      case when o.service in ('icn-t1','icn-t2') and o.state in ('ok','empty') and o.source_updated_at < o.checked_at - interval '10 minutes' then 'stale' else o.state end as state
    from public.api_service_observations o,bounds b
    where o.checked_at >= b.starts_at - interval '1 day' and o.checked_at <= b.ends_at
  ), daily as (
    select service,(checked_at at time zone 'Asia/Seoul')::date as day,
      count(*) as total_count,count(*) filter (where state in ('ok','empty')) as success_count,
      count(*) filter (where state='rate-limit' or http_status=429) as limited_count,
      sum(duration_ms) as duration_total_ms,max(duration_ms) as max_duration_ms
    from observations,bounds where checked_at >= starts_at group by service,day
  ), sequence as (
    select service,state,checked_at,http_status,lag(state) over (partition by service order by checked_at) as previous_state
    from observations
  ), transitions as (
    select s.*, row_number() over (partition by service order by checked_at desc) as position
    from sequence s,bounds b where s.checked_at >= b.starts_at and (
      (s.state not in ('ok','empty') and s.state is distinct from s.previous_state)
      or (s.state in ('ok','empty') and s.previous_state is not null and s.previous_state not in ('ok','empty'))
    )
  )
  select jsonb_build_object(
    'window_start', b.starts_at, 'window_end', b.ends_at,
    'first_observation_at',(select min(checked_at) from observations where checked_at >= b.starts_at),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day,d.service) from daily d),'[]'::jsonb),
    'incidents',coalesce((select jsonb_agg(jsonb_build_object('service',service,'state',state,'previous_state',previous_state,'checked_at',checked_at,'http_status',http_status) order by checked_at desc,service) from transitions where position<=50),'[]'::jsonb)
  ) from bounds b;
$function$;
revoke all on function public.get_api_operation_stats_v1() from public,anon,authenticated;
grant execute on function public.get_api_operation_stats_v1() to service_role;
notify pgrst,'reload schema';
