alter table public.watchlist_items
  add column if not exists release_precision text not null default 'tba' check (release_precision in ('day', 'month', 'year', 'tba')),
  add column if not exists release_year integer,
  add column if not exists release_month integer check (release_month between 1 and 12),
  add column if not exists release_day integer check (release_day between 1 and 31);

create index if not exists watchlist_items_release_schedule_idx
  on public.watchlist_items (release_year, release_month, release_day);

-- Migrate existing free-form labels such as "2026.09 예정" or "2026.08.12 예정".
update public.watchlist_items
set
  release_precision = case
    when release_label ~ '^\s*[0-9]{4}[.년[:space:]-]+[0-9]{1,2}[.월[:space:]-]+[0-9]{1,2}' then 'day'
    when release_label ~ '^\s*[0-9]{4}[.년[:space:]-]+[0-9]{1,2}' then 'month'
    when release_label ~ '^\s*[0-9]{4}' then 'year'
    else 'tba'
  end,
  release_year = coalesce(release_year, substring(release_label from '^\s*([0-9]{4})')::integer),
  release_month = coalesce(release_month, substring(release_label from '^\s*[0-9]{4}[.년[:space:]-]+([0-9]{1,2})')::integer),
  release_day = coalesce(release_day, substring(release_label from '^\s*[0-9]{4}[.년[:space:]-]+[0-9]{1,2}[.월[:space:]-]+([0-9]{1,2})')::integer)
where release_precision = 'tba'
  and release_label ~ '^\s*[0-9]{4}';
