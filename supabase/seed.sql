insert into public.reviews (
  id,
  title,
  type,
  genre,
  rating,
  watched_at,
  thumbnail,
  thumbnail_alt,
  summary,
  review
) values
  (
    'your-name',
    '너의 이름은.',
    'movie',
    array['로맨스', '판타지'],
    4.5,
    '2026-06-20',
    '/thumbnails/your-name.svg',
    '노을과 별을 모티프로 한 너의 이름은 리뷰 썸네일',
    '영상미와 감정선이 오래 남는 판타지 로맨스.',
    '처음에는 아름다운 작화가 눈에 들어오지만, 뒤로 갈수록 감정과 시간의 엇갈림이 더 크게 남는다. 다시 보고 싶은 장면이 많은 작품.'
  ),
  (
    'frieren',
    '장송의 프리렌',
    'anime',
    array['판타지', '모험'],
    5.0,
    '2026-06-10',
    '/thumbnails/frieren.svg',
    '숲과 마법 지팡이를 모티프로 한 장송의 프리렌 리뷰 썸네일',
    '모험이 끝난 뒤의 시간을 천천히 바라보는 애니.',
    '전투보다 여운과 관계에 집중하는 점이 좋았다. 조용한 장면에서도 캐릭터가 깊어지고, 시간이 쌓인다는 감각이 편안하게 몰입된다.'
  ),
  (
    'zelda-tears',
    '젤다의 전설: 티어스 오브 더 킹덤',
    'game',
    array['어드벤처', '오픈월드'],
    4.8,
    '2026-05-28',
    '/thumbnails/zelda-tears.svg',
    '삼각 문양과 초록 대지를 모티프로 한 젤다 리뷰 썸네일',
    '탐험과 실험의 재미가 강한 오픈월드 게임.',
    '정답을 강요하지 않고 플레이어가 직접 길을 만들게 하는 매력이 강하다. 사소한 아이디어가 플레이로 이어지는 순간들이 많아 오래 붙잡게 된다.'
  )
on conflict (id) do update set
  title = excluded.title,
  type = excluded.type,
  genre = excluded.genre,
  rating = excluded.rating,
  watched_at = excluded.watched_at,
  thumbnail = excluded.thumbnail,
  thumbnail_alt = excluded.thumbnail_alt,
  summary = excluded.summary,
  review = excluded.review,
  updated_at = now();
