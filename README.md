# 취향 보관소

영화, 애니, 게임, 드라마, 기대작, 국내·해외 맛집과 해외여행을 기록하는 개인 취향 아카이브입니다.
Supabase 기반 인증/데이터/스토리지와 Next.js App Router를 사용하며, 초대 코드로 가입한 사용자만 글을 작성할 수 있습니다.

## 배포 주소

```txt
https://web-project-omega-ruby-60.vercel.app
```

## 주요 기능

- 통합 홈: 리뷰, 기대작, 맛집리뷰, 해외여행의 최신 기록과 수를 한눈에 확인
- 콘텐츠: 영화, 애니, 게임, 드라마 리뷰와 기대작을 탭으로 전환
- 맛집리뷰: 국내·해외 목록과 지도를 하나의 탭 흐름으로 제공
- 해외여행: Google Maps 장소 검색 기반 여행 기록, 목록, 상세, 지도 보기
- 해외여행 동선: 방문일·시간 기준으로 장소를 날짜별 타임라인으로 정리
- 초대 코드 회원가입: 관리자 발급 링크로만 가입 가능
- 권한 관리: 작성자는 본인 글만 수정/삭제, 관리자는 전체 관리
- 관리자 페이지: 초대 코드 생성, 복사, 폐기, 사용 현황 요약
- 이미지 업로드: Supabase Storage에 WebP 변환 후 저장
- YouTube 미리보기: 리뷰/기대작 작성 시 URL 인식 및 상세 페이지 임베드
- 검색, 정렬, 페이지네이션
- 로그인/로그아웃 상태 토스트
- Discord Webhook 기반 앱 내부 이벤트 알림
- GitHub Actions 빌드 체크 및 Discord 빌드 알림
- Vercel Analytics, Speed Insights 적용

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Database, Storage
- Google Maps JavaScript API, Places API (New)
- Discord Webhook
- GitHub Actions
- Vercel
- lucide-react

## 시작하기

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run dev
```

로컬 접속:

```txt
http://localhost:4281
```

빌드 확인:

```bash
npm run build
```

린트 확인:

```bash
npm run lint
```

## 환경변수

`.env.example`을 참고해 `.env.local`을 생성합니다.

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
ADMIN_EMAILS=
DISCORD_MONITORING_WEBHOOK_URL=
```

`ADMIN_EMAILS`는 관리자 이메일을 쉼표로 구분해 입력합니다.

```txt
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

주의:

- `.env.local`은 Git에 커밋하지 않습니다.
- Google Maps API Key와 Discord Webhook URL은 실제 비밀값입니다.
- Vercel 배포 시 Project Settings > Environment Variables에 같은 값을 등록합니다.

해외여행 기록과 동선 기능을 사용하려면 Supabase SQL Editor에서
`supabase/add-travel-visited-time.sql`을 한 번 실행합니다. 이 파일은
`public.travel` 테이블과 방문시간 컬럼을 함께 생성합니다.

## Google Maps 설정

해외 맛집리뷰·해외여행 지도와 장소 검색을 사용하려면 Google Cloud에서 아래 항목이 필요합니다.

- Maps JavaScript API 활성화
- Places API (New) 활성화
- API Key 생성
- Map ID 생성
- API Key 애플리케이션 제한에 도메인 추가

로컬 개발용 HTTP 리퍼러 예시:

```txt
http://localhost:4281/*
```

배포 환경용 HTTP 리퍼러 예시:

```txt
https://your-domain.vercel.app/*
```

비용 안전장치로 Google Cloud Billing에서 월 예산과 알림을 설정하고, API별 일일/분당 할당량을 낮게 잡아두는 것을 권장합니다.

## Supabase 설정

Supabase 프로젝트 생성 후 SQL Editor에서 아래 순서로 실행합니다.

1. `supabase/schema.sql`
2. `supabase/admin-policies.example.sql`

`admin-policies.example.sql` 실행 전 아래 값을 실제 관리자 이메일로 바꿉니다.

```sql
'your-email@example.com'
```

예시:

```sql
'admin@example.com'
```

`schema.sql`에는 다음 항목이 포함됩니다.

- `reviews`
- `watchlist_items`
- `restaurant_reviews`
- `invite_codes`
- `invite_code_uses`
- 초대 코드 검증/사용 RPC
- 공개 조회 RLS 정책
- `review-thumbnails` Storage bucket

`admin-policies.example.sql`에는 다음 권한 정책이 포함됩니다.

- 관리자: 전체 글 작성/수정/삭제, 초대 코드 관리
- 초대 가입 사용자: 글 작성 가능
- 작성자: 본인 글 수정/삭제 가능
- Storage: 초대 가입 사용자와 관리자만 이미지 업로드 가능

## 초대 회원가입 흐름

1. 관리자가 `/admin`에서 초대 코드를 생성합니다.
2. 생성된 `/signup?invite=...` 링크를 사용자에게 공유합니다.
3. 사용자는 이름, 이메일, 비밀번호를 입력하고 가입합니다.
4. 이메일 인증이 필요한 경우 인증 메일 확인 후 로그인합니다.
5. 로그인 시 초대 코드 사용 내역이 `invite_code_uses`에 기록됩니다.
6. 초대 사용 내역이 있는 사용자만 글 작성 권한을 얻습니다.

초대 코드 사용 기록 확인 예시:

```sql
select *
from public.invite_code_uses
where user_id = (
  select id
  from auth.users
  where email = 'user@example.com'
);
```

## 콘텐츠 권한

- 비로그인 사용자: 목록/상세 조회 가능
- 초대 가입 사용자: 리뷰, 기대작, 맛집리뷰 작성 가능
- 작성자 본인: 본인 글 수정/삭제 가능
- 관리자: 모든 글 수정/삭제 및 초대 코드 관리 가능

관리자 여부는 `ADMIN_EMAILS` 기준으로 판단합니다.

## 주요 페이지

```txt
/
통합 홈 대시보드

/reviews
콘텐츠 > 리뷰 목록

/reviews/[id]
리뷰 상세

/watchlist
기대작 목록으로 이동

/watchlist/items
콘텐츠 > 기대작 목록

/watchlist/[id]
기대작 상세

/restaurants
국내 맛집리뷰 목록으로 이동

/restaurants/items
맛집리뷰 > 국내 목록

/restaurants/items?scope=overseas
맛집리뷰 > 해외 목록

/restaurants/map
맛집리뷰 > 해외 지도

/restaurants/[id]
맛집리뷰 상세

/travel
해외여행 목록으로 이동

/travel/items
해외여행 목록

/travel/map
해외여행 지도

/travel/[id]
해외여행 상세

/new
글 작성 유형 선택

/new?type=restaurants
국내 맛집리뷰 작성

/new?type=overseas-restaurants
해외 맛집리뷰 작성

/login
로그인

/signup
초대 회원가입

/admin
관리자 페이지
```

## 맛집리뷰 구분

맛집리뷰는 하나의 섹션에서 `국내 · 해외 · 지도` 탭으로 이동하며, 데이터는 `restaurant_reviews.scope`로 구분합니다.

- `domestic`: 기존 국내 맛집리뷰
- `overseas`: Google Maps 장소 검색 기반 해외 맛집리뷰

국내 맛집리뷰는 기존처럼 카테고리, 방문 유형, 주차 여부, 재방문 의사, 방문일 등을 기록합니다.  
해외 맛집리뷰는 지도 표시를 중심으로 식당명, 주소, 좌표, Google Maps URL, 별점, 요약, 리뷰를 기록합니다. 모바일에서는 이 탭이 고정되어 목록과 지도를 바로 전환할 수 있습니다.

## 이미지와 썸네일

일반 리뷰/기대작/국내 맛집리뷰는 이미지 파일 업로드를 지원합니다.

- 브라우저에서 WebP로 변환
- Supabase Storage `review-thumbnails` bucket에 저장
- 저장 경로: `review-thumbnails/{contentId}/{fileName}`

해외 맛집리뷰는 Google Places 장소 사진이 있으면 해당 URL을 썸네일로 사용합니다.

## Discord 알림

앱 내부 이벤트는 `DISCORD_MONITORING_WEBHOOK_URL`로 전송할 수 있습니다.

현재 용도:

- 초대 코드 생성
- 리뷰 작성
- 기대작 작성
- 맛집리뷰 작성

GitHub Actions 빌드 알림은 GitHub Repository Secret의 `DISCORD_BUILD_WEBHOOK_URL`을 사용합니다.

## GitHub Actions

`.github/workflows/build-check.yml`에서 빌드 체크를 수행합니다.

필요한 Repository Secrets:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ADMIN_EMAILS
DISCORD_BUILD_WEBHOOK_URL
```

빌드 성공/실패 결과는 Discord로 알림을 보낼 수 있습니다.

## 프로젝트 구조

```txt
src/app
Next.js App Router 페이지와 서버 액션

src/app/actions
리뷰, 기대작, 맛집, 인증 관련 서버 액션

src/app/admin
초대 코드 관리자 페이지

src/components
공통 UI와 기능 컴포넌트

src/components/common
공통으로 재사용하는 UI 컴포넌트

src/components/reviews
리뷰 전용 컴포넌트

src/components/restaurants
맛집리뷰 전용 컴포넌트와 지도

src/components/travel
해외여행 전용 컴포넌트와 지도

src/components/watchlist
기대작 전용 컴포넌트

src/data
Supabase 조회 로직과 데이터 변환

src/lib
권한, 초대 코드, Discord, Google Maps 등 보조 로직

src/lib/supabase
Supabase 클라이언트와 세션 갱신 로직

supabase
스키마, RLS 정책 SQL

.github/workflows
GitHub Actions 워크플로
```

## 배포 체크리스트

- `.env.local`이 커밋되지 않았는지 확인
- Vercel 환경변수 등록
- Supabase SQL 실행
- 관리자 정책 SQL의 이메일 치환 확인
- Google Maps API Key 리퍼러 제한 확인
- Google Maps Map ID 등록
- Discord Webhook URL 등록
- `npm run lint` 통과 확인
- `npm run build` 통과 확인

## 개발 방향

개인 취향 기록 프로젝트에서 출발했지만, 초대 기반 소규모 커뮤니티 기록 도구로 확장 중입니다.  
통합 홈을 중심으로 콘텐츠, 맛집리뷰, 해외여행을 빠르게 오가면서도 각 영역의 작성 경험과 조회 화면은 독립적으로 유지하는 것이 현재 방향입니다.
