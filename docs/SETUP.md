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

기존 프로젝트 보완용 SQL:

- [맥주 종류 추가](../supabase/add-drink-beer-category.sql)
- [기본 술 작성자명 보정](../supabase/fix-drink-author-names.sql)
- [미니게임 접근·실시간 연동 종료](../supabase/retire-mini-games.sql) — 기존 대국 기록은 보관.

관리자 이메일은 앱의 `ADMIN_EMAILS`와 DB 권한 정책에 동일하게 지정합니다.
글과 사진은 공개 조회가 가능하며, 술 글은 관리자도 본인 글만 수정·삭제할 수 있습니다.
술 사진은 최대 5장, 장당 5MB를 지원합니다.

## 로그인·비밀번호

- 가입: 관리자가 발급한 초대 링크를 사용합니다.
- 비밀번호 찾기: `/forgot-password`에서 메일을 요청합니다.
- 비밀번호 변경: 로그인 후 `/change-password`를 사용합니다.

Supabase Authentication 설정:

1. **Site URL**을 운영 주소로 설정하고 `NEXT_PUBLIC_SITE_URL`과 맞춥니다.
2. **Redirect URLs**에 `https://운영도메인/auth/recovery`를 등록합니다.
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

```bash
node --test scripts/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

main 푸시 후 Vercel 자동 배포를 사용합니다.
GitHub Actions의 빌드 검사는 `.github/workflows/build-check.yml`에서 관리합니다.
빌드 알림을 사용하면 Repository Secret에 `DISCORD_BUILD_WEBHOOK_URL`도 등록합니다.
