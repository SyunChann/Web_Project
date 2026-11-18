-- No emails/accounts are created. All fixture rows and policies are rolled back.
begin;
select set_config('request.jwt.claims','{}',true);
do $$ declare prefix text:='perf100%_-'||gen_random_uuid()::text; i integer;
begin
  perform set_config('test.drinks_prefix',prefix,true);
  for i in 1..26 loop
    insert into public.drink_posts(name,category,kind,rating,body,tags,images,author_name,created_at)
    values(prefix||case when i=26 then 'HIDDEN' else i::text end,
      case when i%2=0 then 'whisky' else 'beer' end,
      case when i%3=0 then 'curious' else 'review' end,
      case when i%3=0 then null else 4.5 end,
      repeat('가',9989)||'TAIL_MARKER',
      case when i%3=0 then '{}'::text[] else array['바닐라','견과류','오크향','달콤함'] end,
      array['first.jpg','second.jpg'],'fixture','2000-01-01T00:00:00Z');
  end loop;
end $$;
create policy "preview test hidden row" on public.drink_posts as restrictive for select to anon
  using (name<>current_setting('test.drinks_prefix')||'HIDDEN');
set local role anon;
do $$ declare p jsonb; p2 jsonb; item jsonb; prefix text:=current_setting('test.drinks_prefix'); expected integer;
begin
  p:=public.drink_list_page_v1(upper(prefix));
  p2:=public.drink_list_page_v1(prefix,p_page=>2);
  if (p->>'total_count')::int<>25 or jsonb_array_length(p->'items')<>24 or jsonb_array_length(p2->'items')<>1 then raise exception 'pagination or RLS failed'; end if;
  if exists(select 1 from jsonb_array_elements(p->'items') a join jsonb_array_elements(p2->'items') b on a->>'id'=b->>'id') then raise exception 'duplicate page rows'; end if;
  if (public.drink_list_page_v1(prefix,p_page=>0)->'items') is distinct from p->'items' then raise exception 'page clamp failed'; end if;
  if public.drink_list_page_v1(prefix) is distinct from p then raise exception 'unstable tied-date ordering'; end if;
  for item in select * from jsonb_array_elements(p->'items') loop
    if char_length(item->>'excerpt')<>180 or item->>'image'<>'first.jpg' or jsonb_array_length(item->'tags')>3 then raise exception 'preview bounds failed'; end if;
    if item ?| array['body','methods','images','author_id','updated_at'] then raise exception 'unneeded fields transferred'; end if;
  end loop;
  if strpos(p::text,'TAIL_MARKER')>0 then raise exception 'full body leaked into list'; end if;
  select count(*) into expected from public.drink_posts where strpos(lower(name),lower(prefix))>0 and category='whisky' and kind='review' and rating>=4 and '바닐라'=any(tags);
  p:=public.drink_list_page_v1(prefix,'whisky','review',4,'바닐라',1);
  if (p->>'total_count')::int<>expected then raise exception 'combined filters failed'; end if;
  if (public.drink_list_page_v1(prefix,'','curious',4)->>'total_count')::int<>0 then raise exception 'curious rating semantics changed'; end if;
  if exists(select 1 from pg_proc where oid='public.drink_list_page_v1(text,text,text,numeric,text,integer)'::regprocedure and prosecdef) then raise exception 'function bypasses RLS'; end if;
end $$;
reset role;
rollback;
select 'PASS: bounded previews, literal search, combined filters, exact totals, deterministic pagination and caller RLS' as result;
