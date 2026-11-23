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
| 자동 가입 방지 | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — 선택, 비밀키는 Supabase Auth에 등록 |
| 공개 문의 이메일 | `PUBLIC_CONTACT_EMAIL` — 미설정 시 업무용 Gmail 사용 |
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
| 공개 회원가입·닉네임 | [open-registration.sql](../supabase/open-registration.sql) — 기존 기능 SQL 적용 후 실행 |
| 술 목록 미리보기 | [optimize-drink-lists.sql](../supabase/optimize-drink-lists.sql) — 술 게시판 SQL 적용 후 실행 |

기존 프로젝트 보완용 SQL:

- [맥주 종류 추가](../supabase/add-drink-beer-category.sql)
- [기본 술 작성자명 보정](../supabase/fix-drink-author-names.sql)
- [미니게임 접근·실시간 연동 종료](../supabase/retire-mini-games.sql) — 기존 대국 기록은 보관.
- [미사용 테이블 정리](../supabase/retire-unused-tables.sql) — 초기화·기능·공개 회원가입 SQL 적용 후 마지막에 실행. [보관·검증 안내](./DATABASE-CLEANUP.md).

관리자 이메일은 앱의 `ADMIN_EMAILS`와 DB 권한 정책에 동일하게 지정합니다.
추천 상품의 **전체 베스트 / 패션** 메뉴에서 `/recommendations/fashion`으로 이동합니다. 패션은 API의 카테고리 트리와 카테고리별 베스트를 사용하며, 상품명 키워드나 전체 베스트 목록으로 대체하지 않습니다. 분류별 상품 캐시는 전체 베스트와 분리하고 최대 16개를 보관합니다. 전체 베스트는 1시간, 패션 상품은 다음 KST 오전 9시까지, 카테고리 트리는 6시간 캐시하며 장애 시에도 마지막 정상 자료를 24시간 넘겨 사용하지 않습니다.

패션 조회를 위해 기존 토스 프록시에 다음 전달 경로가 필요합니다. 인증·토큰 발급은 기존 방식을 유지하며 응답의 `success.categories`, `success.category`, `success.items`를 그대로 전달해야 합니다.

| 프록시 경로 | 토스 공식 API 경로 |
| --- | --- |
| `GET /v1/categories` | `GET /openapi/categories` |
| `GET /v1/products/best-categories/{categoryId}?size=50` | `GET /openapi/products/best-categories/{categoryId}?size=50` |

카테고리 ID는 API 응답에서 찾으며 문서 예시 번호를 고정하지 않습니다. 지원하지 않으면 패션 페이지는 오류 안내를 표시하며 일반 상품을 대신 노출하지 않습니다. [공식 카테고리 안내](https://sharelink-docs.toss.im/developers/open-api/api/categories) · [카테고리 베스트 안내](https://sharelink-docs.toss.im/developers/open-api/api/products).

선택 목록은 API 트리의 패션·남성패션·여성패션·유아동패션과 각각의 바로 아래 분류로 구성합니다. 독립된 가방·시계 이름만으로 패션에 포함하지 않으며 반려동물 경로의 동명 패션도 제외합니다. 기본 분류는 패션을 우선하고 없으면 남성패션·여성패션·유아동패션 순으로 선택합니다. 하위 분류는 `남성패션 > 가방`처럼 표시해 같은 이름을 구분합니다. 과거의 잘못된 분류 URL은 허용 목록 확인 후 기본 분류로 전환하며, 빈 목록은 해당 분류의 인기 상품 없음으로 안내합니다.

운영 서버에서 공유받은 코드에는 위 두 경로가 없습니다. `scripts/patch-toss-fashion-proxy.cjs`는 확인한 Express 구조에만 두 경로를 추가하는 설치 도구입니다. 서버에서 검토한 파일을 `sudo node patch-toss-fashion-proxy.cjs /opt/toss-sharelink-proxy/server.js`로 실행합니다. 원본을 권한 600으로 백업하고 문법 검사 후 파일을 교체하며 `toss-sharelink-proxy.service`만 재시작합니다. 실패하면 원본을 복구합니다. 기존 인증 미들웨어·토스 요청 함수를 재사용하며 키 값을 출력하지 않습니다.

카테고리 목록은 6시간, 순위는 다음 오전 9시(KST)까지 성공 응답만 캐시합니다. 설치 뒤 로컬 인증 차단과 패션 상품 응답을 확인합니다. 포트·키를 자동으로 찾지 못하면 종료 코드 2로 검증 미완료를 알리므로 실제 사이트에서 확인해야 합니다. 도구의 로컬 테스트 통과와 운영 서버 적용·토스 권한 확인은 별개입니다.

분류별 빈 목록은 서버에서 `sudo node scripts/check-toss-fashion.cjs`로 점검합니다. 사이트와 같은 분류 선택·`size=50`을 사용해 HTTP 상태, 원본 상품 수, 품절 제외 수, 오류 코드와 캐시 여부만 출력합니다. 파일 변경·서비스 재시작·링크 생성은 하지 않습니다. `EMPTY`는 해당 순위 API의 빈 응답을 뜻하며 전체 상품 부재를 뜻하지 않습니다. `HAS_PRODUCTS`인데 사이트가 비어 있으면 상세 조회·품절 필터·링크 발급 경로를 추가 확인합니다. `HIT` 응답은 프록시 캐시임을 구분합니다.

관리자 → 토스 이미지 관리에서도 **패션**과 하위 분류를 조회할 수 있습니다. `TOSS_IMAGE_BLOCKED_IDS`는 두 페이지에 동일하게 적용하고 원본 이미지 URL·광고 표시·발급된 쉐어링크 사용을 유지합니다. 프런트엔드 환경변수나 DB 추가는 없습니다.

글과 사진은 공개 조회가 가능하며, 술 글은 관리자도 본인 글만 수정·삭제할 수 있습니다.
술 사진은 최대 5장, 장당 5MB를 지원합니다.

관리자의 **외부 API 운영 현황**은 서비스 이용 중 관측한 최근 상태·성공·오류·조회 소요를 표시합니다. 관리자 화면을 열거나 새로고침해도 외부 API를 추가 호출하지 않습니다. 조회 소요에는 캐시·파싱·재시도가 포함되며, 제공 업체의 순수 응답 시간이나 호출량을 뜻하지 않습니다.
관리자 홈(`/admin`)은 콘텐츠를 관리하며, 운영 기록은 `/admin/api-status`, 환경변수 등록 상태와 서비스 바로가기는 `/admin/services`에서 확인합니다. 각 페이지는 관리자 인증 후 필요한 정보만 조회합니다.
운영 기록은 응답 후 저장하고, 같은 상태는 서버 인스턴스별 1분 간격으로 제한합니다. 최신 상태는 서비스별 한 행으로 유지하며, 상세 관측은 8일간 보관하고 새 기록 저장 시 만료 자료를 정리합니다. URL·검색어·사용자 정보·응답 본문은 저장하지 않습니다. 오래 조회하지 않은 연동은 장애 대신 ‘최근 조회 없음’으로 표시합니다. 브라우저에서 사용하는 지도는 기록 대상에서 제외합니다.
기록 테이블과 저장 함수는 일반 회원·비로그인 접근을 차단합니다. 서버에서 관리자 권한을 확인한 뒤 조회하며, 키 누락·저장 장애는 기존 콘텐츠 조회를 중단하지 않습니다. [회귀 검증 SQL](../supabase/test-api-monitoring.sql)은 임시 자료로 검증한 뒤 롤백합니다.

최근 7일 운영 통계는 [운영 이력 SQL](../supabase/add-api-operation-history.sql)을 기본 모니터링 SQL 다음에 적용합니다. 새 환경변수는 필요하지 않습니다. KST 기준 오늘과 이전 6일을 집계하며, 기능 적용 전 기록은 만들지 않습니다. 정상·결과 없음만 성공으로 집계하고 일부 실패·오래된 출국장 자료는 제외합니다. 실제 호출 수·가동률이나 순수 네트워크 지연이 아닌 저장된 관측 결과의 통계입니다.
서비스 필터와 일별 표·그래프를 제공하며, 기록이 없는 날은 빈 값입니다. 문제·복구 이력은 연동별 최근 상태 변경 50건까지 반환하고 선택된 화면에 최대 50건을 표시합니다. 복구는 다음 정상 조회가 관측된 시점이며 실제 장애 지속 시간을 추정하지 않습니다. [운영 통계 검증 SQL](../supabase/test-api-operation-history.sql)은 임시 테이블과 함수로 중복 기록·순서 역전·집계·KST 경계·보관 기간·접근 차단을 검사한 뒤 롤백합니다.

## 로그인·비밀번호

- 가입: 이메일·비밀번호·닉네임을 입력하고 이메일 인증을 완료합니다. 초대 코드는 폐기했으며 기존 이력만 DB에 보관합니다.
- 내 계정: `/account`에서 닉네임·비밀번호 변경과 탈퇴를 지원합니다. 닉네임은 대소문자를 구분하지 않고 중복을 막으며 기존 글에도 변경을 반영합니다.
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

Reset Password의 제목은 `[취향보관소] 비밀번호 재설정 안내`, HTML 본문은 [reset-password.html](../supabase/templates/reset-password.html)의 전체 내용으로 설정합니다. 한국어 안내와 버튼이 포함된 표·인라인 스타일 템플릿이며, 기존 `/auth/recovery` 인증 흐름을 유지합니다. 코드 푸시만으로 Supabase의 메일 본문이 바뀌지는 않으므로 대시보드의 Authentication → Email Templates → Reset Password에서 본문을 교체하고 저장합니다.

**회원가입 인증**: Supabase의 이메일 가입과 **Confirm email**을 켭니다. Redirect URLs에 `https://syun-archive.vercel.app/auth/confirm`을 추가합니다. Confirm sign up 메일은 다음 링크를 권장합니다. 로컬 테스트는 `http://localhost:4281/auth/confirm`도 등록합니다.

완성된 메일 본문은 [confirm-signup.html](../supabase/templates/confirm-signup.html)을 사용합니다. SMTP·메일 템플릿·URL 설정은 Supabase 대시보드에서 변경하며 SQL만으로 적용되지 않습니다.
Confirm sign up의 제목은 `[취향보관소] 환영합니다! 이메일을 인증해 주세요`를 권장합니다. 본문은 재설정 메일과 같은 카드형 디자인에 환영 문구와 인증 버튼을 포함합니다.
메일 템플릿은 이메일 앱 호환성을 위해 표와 인라인 스타일을 사용합니다. Confirm sign up의 HTML 본문 전체를 교체하고 저장합니다. 코드 푸시만으로 Supabase에 저장된 메일 본문이 바뀌지는 않으며, 변경 후 새로 발송한 메일로 확인합니다.

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">이메일 인증하기</a>
```

메일 링크를 열면 비밀 토큰을 HttpOnly 쿠키로 옮겨 주소에서 지우고, 화면의 인증 버튼을 누를 때만 사용합니다. 보안 메일 스캐너가 GET으로 링크를 열어도 인증을 소비하지 않습니다. 가입·재발송 실패는 발송 성공으로 안내하지 않습니다. 같은 브라우저는 60초 후 재요청할 수 있고 서버·발송 업체의 한도도 함께 적용됩니다.

**Gmail SMTP**: 별도 서버나 개인 도메인 없이 `smtp.gmail.com`, 포트 `465`, 사용자명·발신 주소는 Gmail 전체 주소, 비밀번호는 Google 2단계 인증 후 발급한 앱 비밀번호를 Supabase SMTP 설정에 직접 입력합니다. Vercel이나 저장소에는 SMTP 비밀번호를 넣지 않습니다. Gmail의 발송 제한과 Supabase Authentication → Rate Limits의 프로젝트 이메일 한도가 함께 적용됩니다. 가입 인증·재발송·비밀번호 찾기는 프로젝트 발송 한도를 공유합니다.

**CAPTCHA 선택 설정**: Cloudflare Turnstile에 운영 도메인을 등록하고 사이트 키를 Vercel의 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`에, 비밀키를 Supabase Auth → Attack Protection의 CAPTCHA 설정에 등록합니다. 두 설정을 함께 완료한 뒤 활성화합니다. 가입·재발송·로그인·비밀번호 찾기·현재 비밀번호 확인에 토큰을 전달합니다. 설정하지 않았다면 CAPTCHA가 적용됐다고 표시하지 않습니다.

공개 회원가입 SQL은 이메일 미인증·익명·탈퇴·차단 계정의 쓰기를 제한하고 기존 작성자 소유권과 관리자 규칙을 유지합니다. [권한 검증 SQL](../supabase/test-open-registration.sql)은 임시 계정으로 확인하고 모두 롤백하며 메일은 보내지 않습니다. 기존 회원에게는 이용 가능한 닉네임을 부여하고 중복만 조정합니다.
관리자 계정은 내 계정에서 운영자 예약 닉네임을 사용할 수 있습니다. 앱의 `ADMIN_EMAILS`와 DB의 `is_admin()`에 모두 등록되어야 하며 중복·형식 제한은 동일합니다. 기존 공개 가입 설치는 [보완 SQL](../supabase/allow-admin-operator-nickname.sql)을 실행합니다. 신규 설치는 `open-registration.sql`에 포함되어 있습니다. 일반 회원과 가입 화면에서는 예약 이름을 계속 제한합니다.
탈퇴는 현재 비밀번호와 ‘탈퇴’ 문구를 확인한 후 서버 전용 키로 처리합니다. 계정·프로필·가격 관심 목록은 삭제하고 공개 글·첨부 사진은 작성자를 ‘탈퇴한 회원’으로 바꿔 유지합니다. 미사용 술 사진은 정리합니다. 삭제를 원하는 글·사진은 탈퇴 전에 직접 정리하도록 안내합니다. 관리자 계정의 셀프 탈퇴는 지원하지 않습니다.

## 공항·추천 상품

메인의 공식 환율은 `https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON`으로 요청하며 `searchdate`는 `YYYYMMDD` 형식입니다. 기존 `www.koreaexim.go.kr` 홈페이지 호스트를 API 호출에 사용하지 않습니다. 키는 서버에서만 사용하고 조회 실패 시 ECB 환율을 유지합니다.

- 공항 API는 항공편·T1 혼잡도·T2 혼잡도별 활용 승인이 필요합니다. 인증키는 서버에서만 사용합니다.
- 혼잡도 자료가 10분 넘게 오래되면 대기 수치를 숨깁니다. 미운영 표시는 안내 운영시간 기준입니다.
- 첫 조회가 오래된 혼잡도 캐시이면 캐시를 우회해 한 번 더 확인합니다. 추가 확인은 서버 인스턴스 내에서 2분간 공유하며, 원본도 오래됐으면 갱신 지연 안내를 유지합니다.
- 항공편은 오늘 남은 일본행을 표시하고, 없으면 내일 오전 9시까지 표시합니다. 모든 시각은 KST입니다.
- 토스 이미지는 공식 응답의 원본 썸네일을 사용합니다. 가공하지 않으며 사용 금지·삭제 요청 상품은 차단합니다.
- `/admin/toss-images`는 조회용입니다. 차단 목록은 Vercel 환경변수에서 변경하고 재배포합니다.

## 검사·배포

테마는 `next-themes`로 관리합니다. 기본은 라이트 모드이며, 우측 상단 버튼으로 전환한 선택을 브라우저의 `archive-theme`에 저장합니다. 별도 환경변수·DB 설정은 없습니다. 공통 색상은 `src/app/globals.css`, 기존 화면의 다크 팔레트는 `src/app/theme.css`에서 관리합니다. 새 UI는 `--surface`·`--foreground`·`--muted`·`--line` 변수를 사용하고, 사진·지도·공유 이미지에는 테마 반전 필터를 적용하지 않습니다.

관리자 → **API 문서**(`/admin/api-docs`)에서 내부 JSON API를 Swagger로 확인합니다. 명세 JSON(`/api/admin/openapi`)도 관리자 세션으로 보호하며 새 환경변수는 필요하지 않습니다. 현재는 애니 신작 GET만 실행할 수 있고 닉네임 POST는 문서만 제공합니다. Server Actions·서버 직접 조회·Storage SDK는 별도 안내하며 문서용 API를 추가하지 않습니다. Swagger는 관리자 문서에서만 로드하고 외부 명세 검증 서버를 사용하지 않습니다.
새 Route Handler를 추가하면 `src/lib/internalOpenApi.ts`도 갱신합니다. `scripts/openapi.test.mjs`가 명세 유효성·경로 누락·권한·실행 범위를 검사합니다. 명세 제공용 `/api/admin/openapi`는 업무 API 목록에서 제외합니다.

기본 공유 이미지는 `/share/home-v3`에서 사이트의 실제 WOFF 폰트로 생성합니다. Open Graph 설정은 `src/app/layout.tsx`에서 관리합니다.
개별 글은 글 제목·설명·대표 사진을 공유하며, 사진이 없으면 기본 이미지를 사용합니다.
배포 후 이전 미리보기가 남으면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 초기화합니다.
네이버 소유 확인 태그도 루트 레이아웃에서 관리합니다.
홈의 검색 제목·설명과 WebSite 구조화 데이터는 `src/lib/siteIdentity.ts`에서 관리합니다. 이전 기본 도메인은 새 주소로 308 이동하도록 설정했습니다. Google Search Console에서 새 홈 URL의 색인 생성과 사이트맵 제출을 요청할 수 있으며, 실제 검색 표시는 Google 재수집 후 결정됩니다.

술 기록은 글 정보와 사진 파일을 IndexedDB에 나누어 저장합니다. 글자 수정 시 사진을 다시 저장하지 않으며, 기존 임시 기록도 복구할 수 있습니다. 30일이 지난 기록과 사진은 저장소를 열 때 정리하고, 등록에 성공하면 삭제합니다.

새 DB에는 `supabase/optimize-content-lists.sql`도 실행합니다. 기존 RLS를 따르는 읽기 전용 RPC로 기대작·맛집·여행을 9개씩 조회하며, 여행 묶음은 페이지를 나누기 전에 계산합니다. `supabase/test-content-list-pages.sql`은 임시 테이블로 검색·묶음·페이지를 검증한 뒤 롤백합니다.
메인 카드는 최신 제목·날짜만 조회합니다. 술 사진은 Next.js 이미지 최적화로 화면 크기에 맞게 제공하며 GIF는 원본을 유지합니다.
술 목록은 읽기 전용 RPC로 본문 180자·대표 사진 한 장·맛 태그 최대 3개만 24개씩 조회합니다. 필터별 공개 결과를 60초 캐시하고 글 작성·수정·삭제, 닉네임 변경과 탈퇴 시 즉시 만료시킵니다. 조회 실패는 캐시하지 않으며 상세 페이지에서는 전체 본문과 사진을 유지합니다. [검증 SQL](../supabase/test-drink-list-previews.sql)은 긴 본문·검색·필터·정렬·페이지 나누기와 호출자 RLS를 확인한 뒤 롤백합니다.
술 페이지의 제목·필터와 목록은 별도 Suspense 영역으로 표시합니다. 목록이나 로그인 조회가 늦어도 제목·필터가 먼저 나타납니다.
서버 화면의 사용자 확인은 React `cache`로 한 렌더 요청 안에서만 공유합니다. 인증 정보는 공용 캐시나 모듈 전역에 저장하지 않으며 Server Actions는 새 클라이언트로 사용자 정보를 확인합니다. `src/proxy.ts`는 세션 쿠키 갱신만 담당하고, 저장된 세션의 사용자 값을 권한 판단에 사용하지 않습니다. 실제 사용자·관리자 권한은 서버의 `getUser()`와 기존 DB RLS로 확인합니다. 쿠키 갱신 응답에는 비공개 캐시 헤더를 전달합니다.

목록에서 글을 열면 필터·페이지 주소와 선택한 카드 위치를 탭별로 24시간 기억합니다. 글의 목록 버튼과 브라우저 뒤로가기로 복원하며, 공유 URL에는 복원 정보를 붙이지 않습니다. 저장소가 차단되면 현재 탭의 메모리로 동작합니다.

```bash
node --test scripts/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

main 푸시 후 Vercel 자동 배포를 사용합니다.
메인 환율 카드는 달러·엔화만 표시하며 클릭하면 `/exchange-rates`에서 제공되는 전체 통화·최근 최대 7회 고시 그래프·양방향 계산기를 확인합니다. 통화 선택·검색·금액 변경은 브라우저에서 처리하며 별도 API 호출이나 DB 변경이 없습니다. 엔화·루피아의 100단위 고시는 계산할 때 1단위로 환산합니다.
한국수출입은행은 기존 날짜별 전체 응답의 6시간 캐시를 재사용합니다. 장애·미설정 시 ECB 제공 자료를 `base=KRW&providers=ecb`로 한 번 조회하고 역환산하며 1시간 캐시합니다. 상세 페이지는 대체 출처와 고시일을 표시하고, 양쪽 조회가 모두 실패하면 계산기 대신 재시도 안내를 표시합니다. 별도 환경변수 추가는 없습니다.
보안 패치·DB 보완 내용과 Supabase에서 확인할 항목은 [보안 점검 안내](./SECURITY-MAINTENANCE.md)를 참고합니다.
GitHub Actions의 빌드 검사는 `.github/workflows/build-check.yml`에서 관리합니다.
빌드 알림을 사용하면 Repository Secret에 `DISCORD_BUILD_WEBHOOK_URL`도 등록합니다.

### 작성 화면과 임시 저장

로그인이 필요한 페이지는 로그인 후 원래 주소로 돌아갑니다. `next`에는 검증한 사이트 내부 경로만 허용합니다.

리뷰·기대작·상품·맛집·여행 작성 화면은 입력 내용과 선택한 사진을 IndexedDB에 자동 저장합니다. 계정·글별로 구분하며, 보관 기간은 30일입니다. 수정 대상이 변경되면 이전 임시 기록은 복구하지 않습니다. 다른 기기와 동기화되지 않으며 브라우저 데이터 삭제 시 사라집니다.

저장 중에는 중복 제출을 막습니다. 서버의 저장 성공 응답을 확인한 후 임시 기록을 삭제하고 상세 페이지로 이동합니다. 저장 실패 시 입력 내용을 유지합니다. 술 사진은 마우스를 올린 지점을 더 넓은 돋보기 영역으로 2배 확대합니다. 모바일은 사진 터치로 확대/해제하며, 키보드는 Enter·Space로 가운데 확대, Escape로 해제합니다. 확인창은 Escape로 닫고 이전 버튼으로 포커스를 돌려줍니다.
