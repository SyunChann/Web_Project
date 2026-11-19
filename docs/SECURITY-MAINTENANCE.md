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
