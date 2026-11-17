-- Additive, read-only list RPC. Invoker permissions and existing table RLS apply.
create or replace function public.archive_list_page_v1(
  p_section text, p_query text default '', p_scope text default null,
  p_category text default 'all', p_status text default 'all',
  p_sort text default 'created-desc', p_page integer default 1
) returns jsonb language plpgsql stable security invoker set search_path = '' as $function$
declare
  source_sql text;
  result jsonb;
begin
  if p_section = 'watchlist' then
    source_sql := $sql$
      select id,title,type,genre,status,release_label,release_precision,release_year,release_month,release_day,
        created_at,updated_at,thumbnail,thumbnail_alt,left(reason,600) as reason,author_id,author_name
      from public.watchlist_items w
      where ($4 = 'all' or status = $4)
        and strpos(lower(concat_ws(' ',title,
          case type when 'movie' then '영화' when 'anime' then '애니' when 'game' then '게임' when 'drama' then '드라마' end,
          case status when 'waiting' then '기대중' when 'watching' then '보는 중' when 'paused' then '보류' end,
          release_label,reason,array_to_string(genre,' '))),lower($1)) > 0
    $sql$;
  elsif p_section = 'restaurants' then
    source_sql := $sql$
      select id,scope,title,store_name,category,companion,address,place_id,thumbnail,thumbnail_alt,
        rating,visited_at,left(summary,600) as summary,author_id,author_name,created_at,updated_at
      from public.restaurant_reviews r
      where coalesce(scope,'domestic') = $2 and ($3 = 'all' or category = $3)
        and strpos(lower(concat_ws(' ',nullif(title,''),nullif(store_name,''),
          case category when 'korean' then '한식' when 'japanese' then '일식' when 'chinese' then '중식'
            when 'western' then '양식' when 'asian' then '아시아' when 'cafe' then '카페' else '기타' end,
          nullif(address,''),nullif(summary,''),nullif(review,''),nullif(companion,''))),lower($1)) > 0
    $sql$;
  elsif p_section = 'travel' then
    source_sql := $sql$
      with matched as (
        select t.*, stops.total as itinerary_count,
          case when stops.total > 0 or coalesce(trip_title,'') = '' then jsonb_build_array('single',id)
            else jsonb_build_array('legacy',coalesce(author_id::text,''),trip_title,to_char(created_at at time zone 'UTC','YYYY-MM-DD')) end as group_key
        from public.travel t
        cross join lateral (
          select count(*)::int as total from jsonb_array_elements(case when jsonb_typeof(itinerary) = 'array' then itinerary else '[]'::jsonb end) e
          where jsonb_typeof(e) = 'object' and jsonb_typeof(e->'storeName') = 'string' and btrim(e->>'storeName') <> ''
            and jsonb_typeof(e->'visitedAt') = 'string' and e->>'visitedAt' <> ''
        ) stops
        where coalesce(scope,'overseas') = $2 and ($3 = 'all' or category = $3)
          and strpos(lower(concat_ws(' ',nullif(title,''),nullif(store_name,''),nullif(trip_title,''),
            case category when 'korea' then '한국' when 'japan' then '일본' when 'china' then '중국' else '기타' end,
            nullif(address,''),nullif(summary,''),nullif(review,''))),lower($1)) > 0
      ), grouped as (
        select *,row_number() over (partition by group_key order by case when $5 = 'rating-desc' then rating end desc nulls last,created_at desc,title,id) as member_rank,
          case when itinerary_count > 0 then itinerary_count else count(*) over (partition by group_key)::int end as place_count
        from matched
      )
      select id,scope,title,trip_title,store_name,category,city,address,place_id,rating,visited_at,visited_time,
        thumbnail,thumbnail_alt,left(summary,600) as summary,author_id,author_name,created_at,updated_at,place_count
      from grouped where member_rank = 1
    $sql$;
  else
    raise exception 'Unknown list section' using errcode = '22023';
  end if;

  -- Count and page use one snapshot; travel groups are formed before pagination.
  execute 'with filtered as (' || source_sql || '),
    numbered as (select *, row_number() over (order by ' ||
      case when p_section = 'watchlist' then 'created_at desc,id' else 'case when $5 = ''rating-desc'' then rating end desc nulls last,created_at desc,title,id' end || ') as row_num from filtered),
    stats as (select count(*)::int as total from filtered),
    bounds as (select total,least(greatest(1,$6),greatest(1,(total+8)/9)) as page from stats)
    select jsonb_build_object(''total_count'',b.total,''page'',b.page,''items'',
      coalesce((select jsonb_agg(to_jsonb(n)-''row_num'' order by n.row_num) from numbered n where n.row_num > (b.page-1)*9 and n.row_num <= b.page*9),''[]''::jsonb)) from bounds b'
    into result using coalesce(p_query,''),coalesce(p_scope,case when p_section = 'travel' then 'overseas' else 'domestic' end),
      coalesce(p_category,'all'),coalesce(p_status,'all'),coalesce(p_sort,'created-desc'),least(10000,greatest(1,coalesce(p_page,1)));
  return result;
end;
$function$;
revoke all on function public.archive_list_page_v1(text,text,text,text,text,text,integer) from public;
grant execute on function public.archive_list_page_v1(text,text,text,text,text,text,integer) to anon,authenticated,service_role;

create index if not exists watchlist_items_created_id_idx on public.watchlist_items (created_at desc,id);
create index if not exists travel_scope_created_id_idx on public.travel (scope,created_at desc,id);
notify pgrst, 'reload schema';
