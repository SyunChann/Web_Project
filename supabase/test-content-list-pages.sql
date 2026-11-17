-- Uses only temporary tables and rolls back. Run after optimize-content-lists.sql.
begin;
create temp table qa_travel as select * from public.travel with no data;
create temp table qa_restaurants as select * from public.restaurant_reviews with no data;
create temp table qa_watchlist as select * from public.watchlist_items with no data;
insert into qa_travel select (jsonb_populate_record(null::pg_temp.qa_travel,to_jsonb(b)||jsonb_build_object('id','qa-'||i,'trip_title','trip-'||((i-1)%12),'title','record-'||i,'scope','overseas','category','japan','itinerary','[]'::jsonb,'created_at','2026-11-01T01:00:'||lpad(((i-1)%12)::text,2,'0')||'+00:00','review',case when i=1 then 'unique%needle' when i=2 then 'unique_under' else 'normal' end,'rating',(i%5)+0.5))).* from (select * from public.travel limit 1) b cross join generate_series(1,30) i;
insert into qa_travel select (jsonb_populate_record(null::pg_temp.qa_travel,to_jsonb(b)||jsonb_build_object('id','qa-modern','trip_title','trip-0','review','normal','itinerary','[{"storeName":"A","visitedAt":"2026-01-01"},{"storeName":"B","visitedAt":"2026-01-01"}]'::jsonb))).* from qa_travel b where id='qa-1';
insert into qa_travel select (jsonb_populate_record(null::pg_temp.qa_travel,to_jsonb(b)||jsonb_build_object('id','qa-invalid','trip_title','invalid','review','normal','itinerary','[{},null,{"storeName":"","visitedAt":"x"}]'::jsonb))).* from qa_travel b where id='qa-1';
insert into qa_travel select (jsonb_populate_record(null::pg_temp.qa_travel,to_jsonb(b)||jsonb_build_object('id','qa-author','review','normal','author_id','00000000-0000-4000-8000-000000000001'))).* from qa_travel b where id='qa-1';
insert into qa_travel select (jsonb_populate_record(null::pg_temp.qa_travel,to_jsonb(b)||jsonb_build_object('id','qa-day','review','normal','created_at','2026-11-02T01:00:00+00:00'))).* from qa_travel b where id='qa-1';
insert into qa_watchlist select (jsonb_populate_record(null::pg_temp.qa_watchlist,to_jsonb(b)||jsonb_build_object('id','qa-'||i,'title','record-'||i,'type','movie','genre',jsonb_build_array('qa','needle'),'status',case when i>30 then 'paused' else 'waiting' end,'reason',case when i=1 then 'literal%' else 'normal' end,'created_at','2026-11-01T01:00:'||lpad(i::text,2,'0')||'+00:00'))).* from (select * from public.watchlist_items limit 1) b cross join generate_series(1,40) i;
insert into qa_restaurants select (jsonb_populate_record(null::pg_temp.qa_restaurants,to_jsonb(b)||jsonb_build_object('id','qa-'||i,'title','record-'||i,'scope',case when i=1 then null when i>20 then 'overseas' else 'domestic' end,'category',case when i>20 then 'japanese' else 'korean' end,'review',case when i=1 then 'literal%' else 'normal' end,'summary','normal','created_at','2026-11-01T01:00:'||lpad(i::text,2,'0')||'+00:00'))).* from (select * from public.restaurant_reviews limit 1) b cross join generate_series(1,25) i;
do $copy$
begin
  execute replace(replace(replace(replace(pg_get_functiondef('public.archive_list_page_v1(text,text,text,text,text,text,integer)'::regprocedure),
    'public.archive_list_page_v1','pg_temp.qa_archive_list'),'public.travel','pg_temp.qa_travel'),
    'public.restaurant_reviews','pg_temp.qa_restaurants'),'public.watchlist_items','pg_temp.qa_watchlist');
end;
$copy$;
do $test$
declare a jsonb; b jsonb; total_places int;
begin
a:=pg_temp.qa_archive_list('travel'); b:=pg_temp.qa_archive_list('travel',p_page=>2);
if (a->>'total_count')::int<>16 or jsonb_array_length(a->'items')<>9 or jsonb_array_length(b->'items')<>7 then raise exception 'travel grouped pagination failed'; end if;
select sum((x->>'place_count')::int) into total_places from jsonb_array_elements((a->'items')||(b->'items')) x;
if total_places<>35 then raise exception 'travel place counts failed: %',total_places; end if;
a:=pg_temp.qa_archive_list('travel','%'); if (a->>'total_count')::int<>1 or (a->'items'->0->>'place_count')::int<>1 then raise exception 'literal query and matched legacy members failed'; end if;
a:=pg_temp.qa_archive_list('travel',p_page=>9999); if (a->>'page')::int<>2 then raise exception 'travel page clamp failed'; end if;
a:=pg_temp.qa_archive_list('watchlist',p_page=>9999); if (a->>'total_count')::int<>40 or (a->>'page')::int<>5 or jsonb_array_length(a->'items')<>4 then raise exception 'watchlist pagination failed'; end if;
a:=pg_temp.qa_archive_list('watchlist',p_status=>'waiting'); if (a->>'total_count')::int<>30 then raise exception 'watch status failed'; end if;
a:=pg_temp.qa_archive_list('watchlist','영화'); if (a->>'total_count')::int<>40 then raise exception 'localized watch search failed'; end if;
a:=pg_temp.qa_archive_list('watchlist','%'); if (a->>'total_count')::int<>1 then raise exception 'literal watch search failed'; end if;
a:=pg_temp.qa_archive_list('restaurants','한식'); if (a->>'total_count')::int<>20 or jsonb_array_length(a->'items')<>9 then raise exception 'restaurant localized search and null scope failed'; end if;
a:=pg_temp.qa_archive_list('restaurants',p_scope=>'overseas'); if (a->>'total_count')::int<>5 then raise exception 'restaurant overseas scope failed'; end if;
a:=pg_temp.qa_archive_list('restaurants',p_category=>'japanese'); if (a->>'total_count')::int<>0 then raise exception 'empty filter failed'; end if;
end;
$test$;
rollback;
select 'PASS: grouped travel, modern itinerary, invalid itinerary, author/day boundaries, literal and localized search, paging and counts' as result;
