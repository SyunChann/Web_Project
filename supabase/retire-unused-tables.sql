-- 앱에서 폐기된 가격 추적·초대 코드·오목 테이블 정리.
-- 데이터와 복구용 구조는 API에 노출하지 않는 retired 스키마 안에 보관합니다.
begin;
set local lock_timeout = '5s';
set local search_path = pg_catalog;

create schema if not exists retired;
revoke all on schema retired from public, anon, authenticated, service_role;
create table if not exists retired.object_snapshots (
  object_key text primary key,
  object_type text not null check (object_type in ('table', 'function')),
  captured_at timestamptz not null default now(),
  row_count bigint,
  definition jsonb not null,
  rows jsonb
);
alter table retired.object_snapshots enable row level security;
revoke all on retired.object_snapshots from public, anon, authenticated, service_role;

do $$
declare t text; source oid; data jsonb; ddl text; metadata jsonb; fn record;
begin
  -- 검증부터 삭제까지 새 기록이 들어오지 않도록 먼저 잠급니다.
  foreach t in array array['price_history','price_watchlists','invite_code_uses','invite_codes','omok_rooms'] loop
    if to_regclass(format('public.%I',t)) is not null then
      execute format('lock table public.%I in access exclusive mode',t);
    end if;
  end loop;

  foreach t in array array['price_history','price_watchlists','invite_code_uses','invite_codes','omok_rooms'] loop
    source := to_regclass(format('public.%I',t));
    if source is null then continue; end if;
    -- 스냅샷 절차에서 지원하지 않는 열이 생겼으면 삭제하지 않고 중단합니다.
    if exists (select 1 from pg_attribute where attrelid=source and attnum>0 and not attisdropped
      and (attidentity<>'' or attgenerated<>'')) then
      raise exception 'Unexpected generated/identity columns in public.%',t;
    end if;
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by r.id),''[]''::jsonb) from public.%I r',t) into data;
    if t in ('price_history','price_watchlists') and jsonb_array_length(data)<>0 then
      raise exception 'Price tracking data appeared; review public.% before retirement',t;
    end if;
    select format('CREATE TABLE public.%I (%s)',t,string_agg(
      format('%I %s%s%s',a.attname,format_type(a.atttypid,a.atttypmod),
        case when d.adbin is null then '' else ' DEFAULT '||pg_get_expr(d.adbin,d.adrelid) end,
        case when a.attnotnull then ' NOT NULL' else '' end),', ' order by a.attnum))
      into ddl from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid=source and a.attnum>0 and not a.attisdropped;
    metadata := jsonb_build_object(
      'create_table_sql',ddl,
      'constraints',coalesce((select jsonb_agg(format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',t,conname,pg_get_constraintdef(oid))) from pg_constraint where conrelid=source),'[]'::jsonb),
      'indexes',coalesce((select jsonb_agg(pg_get_indexdef(i.indexrelid)) from pg_index i where i.indrelid=source and not exists(select 1 from pg_constraint c where c.conindid=i.indexrelid)),'[]'::jsonb),
      'policies',coalesce((select jsonb_agg(to_jsonb(p)) from pg_policies p where p.schemaname='public' and p.tablename=t),'[]'::jsonb),
      'grants',coalesce((select jsonb_agg(to_jsonb(g)) from information_schema.table_privileges g where g.table_schema='public' and g.table_name=t),'[]'::jsonb),
      'rls_enabled',(select relrowsecurity from pg_class where oid=source));
    insert into retired.object_snapshots(object_key,object_type,row_count,definition,rows)
      values('public.'||t,'table',jsonb_array_length(data),metadata,data)
      on conflict(object_key) do nothing;
    if not exists(select 1 from retired.object_snapshots where object_key='public.'||t
      and rows=data and definition=metadata and row_count=jsonb_array_length(data)) then
      raise exception 'Snapshot mismatch for public.%',t;
    end if;
  end loop;

  for fn in select p.oid,p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.oid in (to_regprocedure('public.claim_invite_code(text)'),
      to_regprocedure('public.validate_invite_code(text)'),to_regprocedure('public.is_invited_user()')) loop
    insert into retired.object_snapshots(object_key,object_type,definition)
      values(fn.signature,'function',jsonb_build_object('create_function_sql',pg_get_functiondef(fn.oid)))
      on conflict(object_key) do nothing;
    if not exists(select 1 from retired.object_snapshots where object_key=fn.signature
      and definition->>'create_function_sql'=pg_get_functiondef(fn.oid)) then
      raise exception 'Function snapshot mismatch';
    end if;
  end loop;
end $$;

-- CASCADE를 사용하지 않아 예상하지 못한 의존성이 있으면 전체를 롤백합니다.
drop function if exists public.claim_invite_code(text);
drop function if exists public.validate_invite_code(text);
drop function if exists public.is_invited_user();
drop table if exists public.price_history;
drop table if exists public.price_watchlists;
drop table if exists public.invite_code_uses;
drop table if exists public.invite_codes;
drop table if exists public.omok_rooms;
notify pgrst, 'reload schema';
commit;
