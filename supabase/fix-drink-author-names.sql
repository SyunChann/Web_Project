-- 기존 기본 작성자명만 보정합니다. 직접 지정된 이름과 탈퇴 계정의 글은 변경하지 않습니다.
update public.drink_posts as post
set author_name = left(coalesce(
  case when jsonb_typeof(account.raw_user_meta_data->'display_name') = 'string' then nullif(btrim(account.raw_user_meta_data->>'display_name'), '') end,
  case when jsonb_typeof(account.raw_user_meta_data->'name') = 'string' then nullif(btrim(account.raw_user_meta_data->>'name'), '') end,
  case when jsonb_typeof(account.raw_user_meta_data->'full_name') = 'string' then nullif(btrim(account.raw_user_meta_data->>'full_name'), '') end,
  nullif(btrim(split_part(account.email, '@', 1)), ''),
  '사용자 ' || left(account.id::text, 8)
), 60)
from auth.users as account
where post.author_id = account.id
  and (post.author_name = '술 친구' or btrim(post.author_name) = '');
