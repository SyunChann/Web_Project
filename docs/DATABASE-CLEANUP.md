# 미사용 테이블 정리 · 2026-11-19

현재 코드·RPC·함수 본문·RLS 정책·외래 키를 확인한 뒤 `supabase/retire-unused-tables.sql`을 운영 DB에 적용함.

| 제거한 public 테이블 | 정리 전 기록 | 근거 |
| --- | ---: | --- |
| `price_watchlists` | 0 | 가격 추적 기능 폐기. `/prices`는 릴리즈 캘린더로 이동함. |
| `price_history` | 0 | 가격 추적 이력. 현재 앱에서 조회·저장하지 않음. |
| `invite_codes` | 8 | 이메일 인증 회원가입으로 전환하고 기존 코드도 폐기된 상태임. |
| `invite_code_uses` | 6 | 현재 회원 권한은 `member_profiles`·`private.is_member()`로 확인함. |
| `omok_rooms` | 5 | 미니게임 메뉴·기능·구독·트리거가 이미 제거된 상태임. |

폐기된 `claim_invite_code(text)`, `validate_invite_code(text)`, `is_invited_user()`도 제거함. 현재 회원·콘텐츠·외부 API 운영 이력 및 Supabase의 Auth·Storage 테이블은 유지함.

## 기록 보관

삭제 전 데이터 19건과 열 정의·제약·인덱스·RLS 정책·권한, 폐기 함수 정의를 `retired.object_snapshots`에 보관함. 원본과 스냅샷이 일치하지 않거나 예상하지 못한 의존성이 있으면 트랜잭션 전체가 롤백됨. `CASCADE`는 사용하지 않음.

보관 테이블은 RLS를 활성화하고 `PUBLIC`·`anon`·`authenticated`·`service_role`의 스키마 및 테이블 접근을 차단함. 앱에서 사용하지 않으며 DB 소유자 권한으로만 관리함. 초대 코드·회원 식별자가 포함되므로 실제 스냅샷 내용은 Git·게시글에 올리지 않음.

보관 현황은 SQL Editor에서 다음과 같이 확인함.

```sql
select object_key, object_type, row_count, captured_at
from retired.object_snapshots
order by object_key;
```

`test-retired-tables.sql`은 보관된 열 정의로 임시 테이블을 만들고 모든 행을 복원하여 값까지 일치하는지 검증함. 실제 복구 시에는 저장된 `definition`과 `rows`를 DB 소유자가 검토해 사용함. 폐기된 함수·공개 권한을 다시 적용해 기존 서비스를 재활성화하지 않도록 주의함.

## 검증 및 적용 순서

- `supabase/test-retired-tables.sql`: 테이블·함수 제거, 백업 복원, 접근 차단, 활성 테이블 RLS 확인.
- `supabase/test-open-registration.sql`: 동의·프로필·이메일 확인·작성 권한·닉네임·탈퇴 검증. 실제 계정 변경 없이 롤백함.
- `supabase/test-security-hardening.sql`: 관리자·일반 회원·익명 사용자 권한 검증.

위 SQL 검증과 회귀 테스트 164개, 타입 검사·린트가 통과함. 린트는 기존 경고 7개이며 새 보안 경고는 없음. 앱 코드 변경이 없어 프로덕션 빌드는 재실행하지 않음.

신규 DB는 기존 초기화·기능·공개 회원가입 SQL을 적용한 **마지막에** `retire-unused-tables.sql`을 실행함. 과거 `schema.sql`·`admin-policies.example.sql`에 있는 초대 코드 관련 정의는 이전 설치 순서와의 호환성 때문에 남겨 둔 것임. 운영 DB에서 과거 SQL을 다시 실행해 폐기 테이블을 재생성하지 않음.

Schema Visualizer의 `public` 스키마에는 사용 중인 9개 테이블이 남음. 스냅샷은 별도의 `retired` 스키마에 있으며, 이전 배치가 보이면 새로고침 후 Auto layout을 실행함.
