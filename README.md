# 취향보관소

![취향보관소 메인 화면](src/assets/image/image.png)

영화, 애니, 게임, 드라마의 감상 기록과 기대작을 한곳에 모아두는 개인 콘텐츠 아카이브임.

리뷰는 본 작품을 기록하는 공간이고, 기대작은 아직 보지 않은 작품을 따로 묶어두는 공간임. Supabase로 인증, 데이터베이스, 썸네일 저장소를 관리하고 Vercel로 배포함.

## 배포 주소

```txt
https://web-project-omega-ruby-60.vercel.app
```

## 주요 기능

- 리뷰 홈, 리뷰 목록, 리뷰 상세 페이지 제공
- 기대작 홈, 기대작 목록, 기대작 상세 페이지 제공
- 영화, 애니, 게임, 드라마 카테고리 분류
- 제목, 장르, 별점, 감상일, 요약, 감상평 기록
- 기대 상태, 공개/출시 라벨, 기대 이유 기록
- Supabase Database 기반 콘텐츠 조회
- Supabase Storage 기반 썸네일 업로드
- 업로드 이미지 압축 후 저장
- YouTube URL 입력 시 영상 인식 미리보기 제공
- 리뷰/기대작 상세에서 관련 영상 임베드
- 검색, 정렬, 이전/다음 글 이동 지원
- 초대 코드 기반 회원가입
- 관리자 전용 초대 코드 생성/폐기
- 작성자 본인 또는 관리자만 수정/삭제 가능
- 삭제/로그아웃 확인 모달 제공
- Vercel Analytics, Speed Insights 적용
- 로컬 WOFF 폰트 전체 적용

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth
- Supabase Database
- Supabase Storage
- Vercel
- Vercel Analytics
- Vercel Speed Insights
- lucide-react

## 시작하기

의존성 설치.

```bash
npm install
```

개발 서버 실행.

```bash
npm run dev
```

브라우저 접속.

```txt
http://localhost:3000
```

프로덕션 빌드 확인.

```bash
npm run build
```

린트 확인.

```bash
npm run lint
```

## 환경 변수

`.env.example`을 참고해서 `.env.local` 생성 필요.

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
ADMIN_EMAILS=
```

`ADMIN_EMAILS`에는 관리자 이메일을 쉼표로 구분해서 넣으면 됨.

```txt
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

Vercel 배포 시에도 같은 값을 Project Settings의 Environment Variables에 추가해야 함.

```txt
Vercel > Project Settings > Environment Variables
```

## Supabase 설정

Supabase 프로젝트 생성 후 SQL Editor에서 아래 순서로 실행하면 됨.

1. `supabase/schema.sql`
2. `supabase/admin-policies.example.sql`
3. `supabase/seed.sql`, 샘플 데이터가 필요할 때만 실행

`admin-policies.example.sql`의 아래 값은 실제 관리자 이메일로 바꿔서 실행해야 함.

```sql
'your-email@example.com'
```

예시.

```sql
'admin@example.com'
```

## SQL 쿼리 관리

Supabase SQL Editor에서는 이렇게 나눠두면 관리하기 편함.

```txt
Shared
- Setup Review App Schema
```

`supabase/schema.sql` 내용. 테이블, 컬럼, Storage bucket, 공개 조회 정책, 초대 코드 함수가 들어있음.

```txt
Private
- Admin Review Policies
```

`supabase/admin-policies.example.sql` 내용. 관리자 이메일을 실제 값으로 바꾼 뒤 저장하는 용도임.

```txt
Private, optional
- Seed Sample Data
```

`supabase/seed.sql` 내용. 샘플 리뷰가 필요할 때만 실행하면 됨.

## 인증과 권한

기본 구조는 초대 기반 회원가입임.

관리자는 `/admin`에서 초대 코드를 만들 수 있음. 초대받은 사용자는 `/signup?invite=초대코드` 형태의 링크로 가입함.

회원가입 후 이메일 인증을 완료하면 로그인 가능함. 초대 코드 사용 기록은 `invite_code_uses` 테이블에 저장됨.

권한 기준은 다음과 같음.

- 비로그인 사용자: 리뷰/기대작 조회 가능
- 초대 가입 사용자: 리뷰/기대작 작성 가능
- 작성자 본인: 본인 글 수정/삭제 가능
- 관리자: 모든 글 수정/삭제 가능, 초대 코드 관리 가능

작성 권한이 이상하면 먼저 아래 테이블 확인하면 됨.

```sql
select *
from public.invite_code_uses
where user_id = (
  select id
  from auth.users
  where email = 'user@example.com'
);
```

row가 없으면 초대 사용자로 연결되지 않은 상태임.

## 주요 페이지

```txt
/
리뷰 홈

/reviews
전체 리뷰 목록

/reviews/[id]
리뷰 상세

/watchlist
기대작 홈

/watchlist/items
전체 기대작 목록

/watchlist/[id]
기대작 상세

/new
리뷰/기대작 작성 유형 선택

/login
로그인

/signup
초대 회원가입

/admin
초대 코드 관리
```

## 썸네일 업로드

리뷰와 기대작 작성/수정 화면에서 이미지 파일 업로드 가능함.

업로드한 파일은 브라우저에서 WebP로 압축 후 Supabase Storage의 `review-thumbnails` bucket에 저장됨.

저장 경로 형식.

```txt
review-thumbnails/{contentId}/{fileName}
```

업로드 후 public URL이 각 콘텐츠의 `thumbnail` 컬럼에 저장됨. `thumbnail_alt`는 제목 기반으로 자동 생성됨.

## YouTube 영상

리뷰와 기대작 모두 YouTube URL 입력 가능함.

지원 형태.

```txt
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
```

입력 시 영상 ID를 인식하면 미리보기 썸네일과 안내 문구가 표시됨. 상세 페이지에서는 iframe으로 영상이 표시됨.

## 프로젝트 구조

```txt
src/app
Next.js App Router 페이지와 서버 액션

src/app/actions
리뷰, 기대작, 인증 관련 서버 액션

src/app/admin
초대 코드 관리 페이지와 관리자 액션

src/components
공통 UI, 내비게이션, 폼, 확인 모달

src/components/reviews
리뷰 전용 폼과 삭제 버튼

src/data
Supabase 조회 로직과 타입 변환

src/lib
관리자 판별, 콘텐츠 권한, 초대 코드 보조 로직

src/lib/supabase
Supabase 클라이언트, 세션 갱신, URL 유틸

src/assets/fonts
로컬 폰트 파일

src/assets/image
README와 메인 미리보기 이미지

supabase
스키마, 정책, 샘플 데이터 SQL
```

## 배포 메모

GitHub 저장소와 Vercel 프로젝트가 연결되어 있으면 `main` 브랜치 push 시 자동 배포됨.

배포 전 확인할 것.

- `.env.local`은 Git에 올리지 않음
- Vercel 환경 변수에 Supabase URL, publishable key, 관리자 이메일 추가 필요
- Supabase SQL Editor에서 `schema.sql` 실행 필요
- 관리자 정책 SQL은 실제 관리자 이메일로 바꿔 실행 필요
- `review-thumbnails` bucket 생성 여부 확인 필요
- `npm run build` 통과 확인 필요

## 현재 방향

1인 블로그 느낌에서 출발했지만, 초대받은 사람도 글을 작성할 수 있는 작은 콘텐츠 보관소 형태로 확장 중임. 리뷰와 기대작 외에도 나중에 다른 취향 기록 주제를 붙일 수 있도록 홈, 내비게이션, 권한 구조를 분리해둔 상태임.
