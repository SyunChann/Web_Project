-- 기존 관리자 판정과 대국 기록을 보존하는 보안 보완용 SQL입니다.
begin;
set local lock_timeout = '5s';

-- JWT만 읽는 함수에 소유자 권한은 필요하지 않습니다.
-- 관리자 이메일과 기존 실행 권한은 변경하지 않습니다.
do $$
declare body text;
begin
  select prosrc into strict body from pg_proc
    where oid = 'public.is_admin()'::regprocedure;
  if body !~* '^\s*select\s+lower\(coalesce\(auth\.jwt\(\)'
    or body ~* '\m(from|join|insert|update|delete)\M' then
    raise exception 'is_admin implementation changed; review privileges before applying';
  end if;
end $$;
alter function public.is_admin() security invoker;
alter function public.is_admin() set search_path = '';

-- 종료된 미니게임의 기록은 남기고 접근·구독·불필요한 트리거를 제거합니다.
do $$
begin
  if to_regclass('public.omok_rooms') is not null then
    revoke all on public.omok_rooms from public, anon, authenticated;
    if exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'omok_rooms') then
      alter publication supabase_realtime drop table public.omok_rooms;
    end if;
    drop trigger if exists prevent_multiple_active_omok_rooms on public.omok_rooms;
  end if;
end $$;
-- CASCADE를 사용하지 않아 예상하지 못한 의존성이 있으면 전체를 롤백합니다.
drop function if exists public.prevent_multiple_active_omok_rooms();
commit;
