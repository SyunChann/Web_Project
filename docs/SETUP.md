# 설정 가이드

[README로 돌아가기](../README.md)

## 환경변수

[.env.example](../.env.example)을 `.env.local`로 복사하고 필요한 항목을 입력합니다.
배포 환경에서는 Vercel의 Environment Variables에 등록합니다.

| 기능 | 환경변수 |
| --- | --- |
| 로그인·DB·사진 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| 사이트 주소 | `NEXT_PUBLIC_SITE_URL` |
| 관리자 | `ADMIN_EMAILS` — 이메일을 쉼표로 구분 |
| 관리자 API 운영 기록 | `SUPABASE_SERVICE_ROLE_KEY` — 서버 전용, 브라우저에 공개 금지 |
| 지도·장소 검색 | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` |
| 공식 환율 | `KOREAEXIM_API_KEY` — 미설정·오류 시 ECB 기준 데이터 사용 |
| 항공편 | `DATA_GO_KR_API_KEY` |
| 출국장 혼잡도 | `ICN_CONGESTION_T1_API_KEY`, `ICN_CONGESTION_T2_API_KEY` — 미설정 시 공통 키 사용 |
| 추천 상품 | `TOSS_PROXY_BASE_URL`, `TOSS_PROXY_API_KEY` |
| 상품 이미지 차단 | `TOSS_IMAGE_BLOCKED_IDS` — 상품 ID를 쉼표로 구분 |
| 네이버 상품 검색 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |
| 앱 알림 | `DISCORD_MONITORING_WEBHOOK_URL` |

`.env.local`은 커밋하지 않습니다. 서버 인증키에는 `NEXT_PUBLIC_`을 붙이지 않습니다.
Google Maps 키는 운영·로컬 도메인으로 HTTP 리퍼러를 제한합니다.

## Supabase

새 프로젝트는 SQL Editor에서 아래 순서로 실행합니다.

1. [schema.sql](../supabase/schema.sql)
2. [admin-policies.example.sql](../supabase/admin-policies.example.sql) — 예시 이메일을 실제 관리자 이메일로 변경.
3. 필요한 기능의 추가 SQL 실행.

| 기능 | 추가 SQL |
| --- | --- |
| 공개 일정 | [add-watchlist-release-schedule.sql](../supabase/add-watchlist-release-schedule.sql) |
| 여행 방문시간·동선 | [add-travel-visited-time.sql](../supabase/add-travel-visited-time.sql) |
| 술 게시판·사진 저장소 | [add-drinks.sql](../supabase/add-drinks.sql) |
| 가격 관심 목록 | [add-price-watchlists.sql](../supabase/add-price-watchlists.sql) |
| 외부 API 운영 현황 | [add-api-monitoring.sql](../supabase/add-api-monitoring.sql) |

기존 프로젝트 보완용 SQL:

- [맥주 종류 추가](../supabase/add-drink-beer-category.sql)
- [기본 술 작성자명 보정](../supabase/fix-drink-author-names.sql)
- [미니게임 접근·실시간 연동 종료](../supabase/retire-mini-games.sql) — 기존 대국 기록은 보관.

관리자 이메일은 앱의 `ADMIN_EMAILS`와 DB 권한 정책에 동일하게 지정합니다.
글과 사진은 공개 조회가 가능하며, 술 글은 관리자도 본인 글만 수정·삭제할 수 있습니다.
술 사진은 최대 5장, 장당 5MB를 지원합니다.

관리자의 **외부 API 운영 현황**은 서비스 이용 중 관측한 최근 상태·성공·오류·조회 소요를 표시합니다. 관리자 화면을 열거나 새로고침해도 외부 API를 추가 호출하지 않습니다. 조회 소요에는 캐시·파싱·재시도가 포함되며, 제공 업체의 순수 응답 시간이나 호출량을 뜻하지 않습니다.
운영 기록은 응답 후 저장하고, 같은 상태는 서버 인스턴스별 1분 간격으로 제한합니다. 서비스별 최신 한 행만 유지하며 URL·검색어·사용자 정보·응답 본문은 저장하지 않습니다. 오래 조회하지 않은 연동은 장애 대신 ‘최근 조회 없음’으로 표시합니다. 브라우저에서 사용하는 지도는 기록 대상에서 제외합니다.
기록 테이블과 저장 함수는 일반 회원·비로그인 접근을 차단합니다. 서버에서 관리자 권한을 확인한 뒤 조회하며, 키 누락·저장 장애는 기존 콘텐츠 조회를 중단하지 않습니다. [회귀 검증 SQL](../supabase/test-api-monitoring.sql)은 임시 자료로 검증한 뒤 롤백합니다.

## 로그인·비밀번호

- 가입: 관리자가 발급한 초대 링크를 사용합니다.
- 비밀번호 찾기: `/forgot-password`에서 메일을 요청합니다.
- 비밀번호 변경: 로그인 후 `/change-password`를 사용합니다.

Supabase Authentication 설정:

1. **Site URL**과 Vercel의 `NEXT_PUBLIC_SITE_URL`을 `https://syun-archive.vercel.app`으로 설정합니다.
2. **Redirect URLs**에 `https://syun-archive.vercel.app/auth/recovery`를 등록합니다. 로컬 개발은 `NEXT_PUBLIC_SITE_URL=http://localhost:4281`로 바꾸고 `http://localhost:4281/auth/recovery`도 등록합니다.
3. 다른 기기에서도 재설정 링크를 열려면 Reset Password 메일에 아래 링크를 사용합니다.

```html
<a href="{{ .SiteURL }}/auth/recovery?token_hash={{ .TokenHash }}&amp;type=recovery">새 비밀번호 설정</a>
```

기본 `{{ .ConfirmationURL }}` 방식은 요청한 브라우저에서 열어야 합니다.
운영 메일은 SMTP와 발송 제한을 확인합니다.

## 공항·추천 상품

- 공항 API는 항공편·T1 혼잡도·T2 혼잡도별 활용 승인이 필요합니다. 인증키는 서버에서만 사용합니다.
- 혼잡도 자료가 10분 넘게 오래되면 대기 수치를 숨깁니다. 미운영 표시는 안내 운영시간 기준입니다.
- 첫 조회가 오래된 혼잡도 캐시이면 캐시를 우회해 한 번 더 확인합니다. 추가 확인은 서버 인스턴스 내에서 2분간 공유하며, 원본도 오래됐으면 갱신 지연 안내를 유지합니다.
- 항공편은 오늘 남은 일본행을 표시하고, 없으면 내일 오전 9시까지 표시합니다. 모든 시각은 KST입니다.
- 토스 이미지는 공식 응답의 원본 썸네일을 사용합니다. 가공하지 않으며 사용 금지·삭제 요청 상품은 차단합니다.
- `/admin/toss-images`는 조회용입니다. 차단 목록은 Vercel 환경변수에서 변경하고 재배포합니다.

## 검사·배포

기본 공유 이미지는 `/share/home-v3`에서 사이트의 실제 WOFF 폰트로 생성합니다. Open Graph 설정은 `src/app/layout.tsx`에서 관리합니다.
개별 글은 글 제목·설명·대표 사진을 공유하며, 사진이 없으면 기본 이미지를 사용합니다.
배포 후 이전 미리보기가 남으면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 초기화합니다.
네이버 소유 확인 태그도 루트 레이아웃에서 관리합니다.
홈의 검색 제목·설명과 WebSite 구조화 데이터는 `src/lib/siteIdentity.ts`에서 관리합니다. 이전 기본 도메인은 새 주소로 308 이동하도록 설정했습니다. Google Search Console에서 새 홈 URL의 색인 생성과 사이트맵 제출을 요청할 수 있으며, 실제 검색 표시는 Google 재수집 후 결정됩니다.

술 기록은 글 정보와 사진 파일을 IndexedDB에 나누어 저장합니다. 글자 수정 시 사진을 다시 저장하지 않으며, 기존 임시 기록도 복구할 수 있습니다. 30일이 지난 기록과 사진은 저장소를 열 때 정리하고, 등록에 성공하면 삭제합니다.

새 DB에는 `supabase/optimize-content-lists.sql`도 실행합니다. 기존 RLS를 따르는 읽기 전용 RPC로 기대작·맛집·여행을 9개씩 조회하며, 여행 묶음은 페이지를 나누기 전에 계산합니다. `supabase/test-content-list-pages.sql`은 임시 테이블로 검색·묶음·페이지를 검증한 뒤 롤백합니다.
메인 카드는 최신 제목·날짜만 조회합니다. 술 사진은 Next.js 이미지 최적화로 화면 크기에 맞게 제공하며 GIF는 원본을 유지합니다.

목록에서 글을 열면 필터·페이지 주소와 선택한 카드 위치를 탭별로 24시간 기억합니다. 글의 목록 버튼과 브라우저 뒤로가기로 복원하며, 공유 URL에는 복원 정보를 붙이지 않습니다. 저장소가 차단되면 현재 탭의 메모리로 동작합니다.

```bash
node --test scripts/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

main 푸시 후 Vercel 자동 배포를 사용합니다.
GitHub Actions의 빌드 검사는 `.github/workflows/build-check.yml`에서 관리합니다.
빌드 알림을 사용하면 Repository Secret에 `DISCORD_BUILD_WEBHOOK_URL`도 등록합니다.
