begin;
do $$
declare t text; f text;
begin
  foreach t in array array['price_history','price_watchlists','invite_code_uses','invite_codes','omok_rooms'] loop
    if to_regclass(format('public.%I',t)) is not null then raise exception 'Unused table remains: %',t; end if;
    if not exists(select 1 from retired.object_snapshots where object_key='public.'||t
      and object_type='table' and row_count=jsonb_array_length(rows)
      and definition ?& array['create_table_sql','constraints','indexes','policies','grants','rls_enabled']) then
      raise exception 'Incomplete snapshot: %',t;
    end if;
  end loop;
  foreach f in array array['public.claim_invite_code(text)','public.validate_invite_code(text)','public.is_invited_user()'] loop
    if to_regprocedure(f) is not null then raise exception 'Retired function remains: %',f; end if;
    if not exists(select 1 from retired.object_snapshots where object_key=f and object_type='function'
      and definition ? 'create_function_sql') then raise exception 'Missing function snapshot: %',f; end if;
  end loop;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity) then
    raise exception 'Active table lost RLS';
  end if;
end $$;

-- 보관한 구조와 데이터로 임시 테이블에 모든 행을 복원할 수 있는지 확인합니다.
do $$
declare b record; restore_sql text; restored_count bigint; restored_rows jsonb;
begin
  for b in select * from retired.object_snapshots where object_type='table' loop
    restore_sql:=replace(b.definition->>'create_table_sql',
      'CREATE TABLE public.'||quote_ident(split_part(b.object_key,'.',2))||' (',
      'CREATE TEMP TABLE retirement_restore_check (');
    if restore_sql=b.definition->>'create_table_sql' then raise exception 'Unexpected restore DDL'; end if;
    execute restore_sql;
    execute 'insert into pg_temp.retirement_restore_check select * from jsonb_populate_recordset(null::pg_temp.retirement_restore_check,$1)' using b.rows;
    execute 'select count(*) from pg_temp.retirement_restore_check' into restored_count;
    if restored_count<>b.row_count then raise exception 'Restore row count mismatch'; end if;
    execute 'select coalesce(jsonb_agg(to_jsonb(r) order by r.id),''[]''::jsonb) from pg_temp.retirement_restore_check r' into restored_rows;
    if restored_rows<>b.rows then raise exception 'Restored data differs from snapshot'; end if;
    execute 'drop table pg_temp.retirement_restore_check';
  end loop;
end $$;

set local role anon;
do $$ begin
  if has_schema_privilege(current_user,'retired','usage') then raise exception 'Anonymous user has archive schema access'; end if;
  begin
    perform object_key from retired.object_snapshots limit 1;
    raise exception 'Anonymous user can access snapshots';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  if has_schema_privilege(current_user,'retired','usage') then raise exception 'Member has archive schema access'; end if;
  begin
    perform object_key from retired.object_snapshots limit 1;
    raise exception 'Member can access snapshots';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: unused tables/functions removed, snapshots restorable, access denied and active RLS retained' as result;
