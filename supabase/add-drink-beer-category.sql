-- 기존 술 게시판의 허용 종류에 맥주를 추가합니다. 기존 기록과 권한 정책은 유지합니다.
begin;
alter table public.drink_posts drop constraint drink_posts_category_check;
alter table public.drink_posts add constraint drink_posts_category_check
  check (category in ('whisky','sake','traditional','beer','other'));
commit;
