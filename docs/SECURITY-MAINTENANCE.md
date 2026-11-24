# 보안 점검 · 2026-11-19

## 반영한 내용

- Next.js와 ESLint 설정을 `16.4.6`으로 업데이트함.
- Swagger는 `5.35.0`을 유지하고 `@swagger-api/apidom-reference`의 `minimatch`만 `11.0.1`로 고정함. 상위 패키지가 수정 버전을 지원하면 override 제거를 검토함.
- 실제 Swagger 리졸버의 ESM·CommonJS 허용 목록 동작을 테스트함.
- Node.js 최소 버전을 `.nvmrc`·CI와 같은 `24.22.2`로 맞춤. Vercel의 실제 패치 버전은 배포 런타임에서 별도 확인해야 함.
- CI에서 중간 등급 이상의 운영 의존성 경고를 차단하고 기존 회귀 테스트도 실행함. 일반 버전 업데이트 PR 중지 설정은 유지함.
- `supabase/harden-security.sql`을 운영 DB에 적용함. 기존 관리자 판정·실행 권한을 유지하면서 `is_admin()`을 `SECURITY INVOKER`로 변경하고 빈 `search_path`를 지정함.
- 종료된 오목의 트리거·함수를 제거함. 이후 [미사용 테이블 정리](./DATABASE-CLEANUP.md)에서 대국 기록 5건을 비공개 스냅샷에 보관하고 테이블도 제거함.

DB 검증은 `supabase/test-security-hardening.sql`로 실행함. 세션 안에서만 테스트용 JWT를 설정하고 롤백하며 실제 계정·게시글은 변경하지 않음.
운영 의존성 감사는 경고 0건이며 회귀 테스트 164개와 DB 권한 검증이 통과함. Supabase 재점검에서도 오목 함수의 `search_path`와 관리자 함수의 `SECURITY DEFINER` 경고가 해소됨.
타입 검사와 린트, DB 미설정 모드의 프로덕션 빌드도 통과함. 린트에는 기존 경고 7개가 남아 있음. 데이터 연동 빌드는 이 실행 환경의 Supabase REST 연결 타임아웃으로 완료하지 못했으며, 실제 DB 권한은 MCP에서 별도로 검증함. 로컬 빌드 확인을 위해서만 Supabase 환경변수를 비운 명령을 사용했으며 저장소·Vercel의 환경변수는 변경하지 않음.

## Supabase 확인 결과

### PostgreSQL 패치

사용자가 **Project Settings → General → Upgrade project**에서 업그레이드를 완료함. SQL과 프로젝트 상태에서 PostgreSQL `17.12`, Supabase 빌드 `17.12.0.000`, `ACTIVE_HEALTHY`를 확인함. 관리자·일반 회원·익명 권한 검증과 공개 리뷰 조회도 통과함. [Supabase 업그레이드 안내](https://supabase.com/docs/guides/platform/upgrading) · [PostgreSQL 보안 공지](https://www.postgresql.org/support/security/CVE-2026-6460/).

### 유출 비밀번호 차단

Supabase의 **Leaked Password Protection**은 Pro 이상에서 제공됨. 현재 무료 요금제를 유지하므로 미설정 경고는 그대로 둠. 해당 기능 때문에 유료로 전환하지 않음. [공식 안내](https://supabase.com/docs/guides/auth/password-security).

운영 현황 테이블 2개의 `RLS Enabled No Policy` 알림은 서버 전용 접근을 위한 의도된 구성임. 경고를 없애기 위해 공개 정책을 추가하지 않음.
미사용 테이블 정리 후 비공개 스냅샷 테이블 `retired.object_snapshots`에도 같은 INFO가 표시됨. DB 소유자 외 접근을 차단하기 위한 의도된 구성이며 익명·일반 회원의 실제 조회 거부를 검증함.

## 점검 명령

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
node --test scripts/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

근거: [보호나라 보안 공지](https://www.boho.or.kr/kr/bbs/list.do?menuNo=205020&bbsId=B0000133), [Next.js 캐시 경고 1](https://github.com/advisories/GHSA-mfr8-8qww-v76h), [캐시 경고 2](https://github.com/advisories/GHSA-vc7v-qv4w-wrv8), [minimatch 경고](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## 추가 점검 · 2026-11-24

- 콘텐츠 5개 테이블의 관리자·소유자 허용 정책을 같은 조건으로 통합하고, 사용자·회원 판정을 쿼리당 한 번 평가하도록 변경함. 외래키 `author_id` 인덱스 5개를 추가함. 반복 계산 15건·중복 정책 15건·외래키 인덱스 누락 5건이 해소됨.
- 변경 전후 롤백 검증으로 본인 글 수정·타인 글 수정 차단·미인증 계정 차단·관리자 접근·공개 조회를 확인함.
- 썸네일을 Storage로 직접 전송하고 서버에서 참조를 검증함. 신규 업로드는 본인 폴더로 제한하고 SVG 업로드를 차단함. 기존 공개 URL은 유지함.
- 닉네임 확인 API에 서버 전용 DB 호출 제한과 실제 본문 1KB 제한을 추가함. 원본 IP 대신 서버 키로 만든 HMAC만 보관함. 공개 닉네임 RPC의 실행 권한은 기존 가입 흐름을 위해 유지함.
- 서버 알림을 응답 이후 실행하고 타임아웃·로그 정제를 적용함. 애니 분기 검증과 돋보기 갱신 빈도를 보완함.

서버 전용 호출 제한 테이블의 `RLS Enabled No Policy`는 일반 사용자의 접근을 차단하는 의도된 구성임. 새 인덱스의 미사용 INFO는 충분한 운영 기록을 보고 판단하며, 경고만 보고 삭제하지 않음. 유출 비밀번호 차단은 기존 무료 요금제 정책을 유지함.
