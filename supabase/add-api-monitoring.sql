create table if not exists public.api_service_health (
  service text primary key check (service in ('icn-flights','icn-t1','icn-t2','exchange-koreaexim','exchange-ecb','toss','naver-shopping','lck-official','lck-naver','anilist')),
  state text not null check (state in ('ok','empty','partial','stale','authentication','rate-limit','timeout','invalid-response','upstream-error','network-error')),
  checked_at timestamptz not null,
  duration_ms integer not null check (duration_ms between 0 and 300000),
  http_status integer check (http_status between 100 and 599),
  source_updated_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_state text check (last_error_state in ('partial','stale','authentication','rate-limit','timeout','invalid-response','upstream-error','network-error'))
);
alter table public.api_service_health enable row level security;
revoke all on public.api_service_health from public,anon,authenticated;
grant select,insert,update on public.api_service_health to service_role;

create or replace function public.record_api_observations_v1(p_events jsonb)
returns void language plpgsql security invoker set search_path = '' as $function$
declare e record;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 20 then raise exception 'Invalid observation batch'; end if;
  for e in select * from jsonb_to_recordset(p_events) as x(service text,state text,checked_at timestamptz,duration_ms integer,http_status integer,source_updated_at timestamptz)
  loop
    if e.checked_at > now() + interval '5 minutes' or e.checked_at < now() - interval '1 day' then continue; end if;
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
end;
$function$;
revoke all on function public.record_api_observations_v1(jsonb) from public,anon,authenticated;
grant execute on function public.record_api_observations_v1(jsonb) to service_role;
notify pgrst,'reload schema';
