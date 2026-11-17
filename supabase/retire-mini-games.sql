-- 미니게임 서비스 종료: 앱 사용자의 접근과 실시간 구독을 중단합니다.
-- 기존 대국 기록은 삭제하지 않습니다.
begin;
do $$
begin
  if to_regclass('public.omok_rooms') is not null then
    revoke all on public.omok_rooms from anon, authenticated;
    if exists (select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'omok_rooms') then
      alter publication supabase_realtime drop table public.omok_rooms;
    end if;
  end if;
end $$;
commit;
