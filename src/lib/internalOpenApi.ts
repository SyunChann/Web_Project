import "server-only";

const json = (schema: object, example?: object) => ({ "application/json": { schema, ...(example ? { example } : {}) } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

// 실제 Route Handler만 기재함. Server Actions와 서버 직접 조회는 관리자 페이지에서 별도 안내함.
export const internalOpenApi = {
  openapi: "3.0.3",
  info: {
    title: "취향 보관소 내부 API",
    version: "1.0.0",
    description: "현재 앱의 JSON Route Handler 명세입니다. 문서 열람은 관리자 전용이며, 아래 두 API 자체는 공개 조회입니다. GET만 직접 실행할 수 있습니다. 외부 API의 장애·응답시간 기록은 ‘외부 API 현황’에서 확인하세요.",
  },
  servers: [{ url: "/", description: "현재 접속한 사이트" }],
  tags: [{ name: "애니 신작", description: "AniList 연동 일정 조회" }, { name: "회원가입", description: "닉네임 사용 가능 여부 확인" }],
  paths: {
    "/api/anilist/releases": {
      get: {
        tags: ["애니 신작"], operationId: "getAnimeReleases", summary: "연도·분기별 애니 신작 조회", security: [],
        description: "로그인 없이 조회합니다. 서버에서 AniList GraphQL을 호출하며 정상 결과는 최대 6시간 캐시합니다. year 생략·범위 오류는 현재 연도, quarter 생략·범위 오류는 현재 분기로 처리합니다. quarter는 1~4 정수로 요청하세요. 현재 구현은 소수 분기도 허용하지만 빈 목록이 반환될 수 있습니다. 외부 조회 실패도 HTTP 200의 빈 items로 반환하므로 일정 없음과 장애를 이 응답만으로 구분할 수 없습니다.",
        parameters: [
          { name: "year", in: "query", required: false, description: "조회 연도. 생략 시 서버의 현재 연도.", schema: { type: "integer", minimum: 2000, maximum: 2100 }, example: 2026 },
          { name: "quarter", in: "query", required: false, description: "1: 1~3월, 2: 4~6월, 3: 7~9월, 4: 10~12월. 생략 시 현재 분기.", schema: { type: "integer", enum: [1, 2, 3, 4] }, example: 4 },
        ],
        responses: {
          "200": { description: "조회 결과. 일정 없음·외부 조회 실패 시 items는 빈 배열.", content: json(ref("AnimeReleases"), { year: 2026, quarter: 4, items: [{ id: 12345, title: "샘플 애니메이션", genres: ["Drama"], coverImage: null, releaseYear: 2026, releaseMonth: 10, releaseDay: null, siteUrl: null }] }) },
        },
        "x-upstream": "AniList GraphQL (운영 현황 서비스 ID: anilist)",
      },
    },
    "/api/account/nickname": {
      post: {
        tags: ["회원가입"], operationId: "checkNicknameAvailability", summary: "닉네임 사용 가능 여부 확인", security: [],
        description: "로그인 없이 Supabase DB의 nickname_available_v1을 조회합니다. 데이터는 변경하지 않으며 닉네임을 예약하지 않습니다. 가입 완료 시 최종 확정됩니다. 앞뒤 공백은 자동 제거하지 않습니다. admin·administrator·관리자·운영자·탈퇴한회원은 대소문자와 관계없이 사용할 수 없습니다. 문서에서는 POST 실행을 제공하지 않습니다. 모든 응답은 Cache-Control: no-store입니다.",
        requestBody: { required: true, content: json(ref("NicknameRequest"), { nickname: "술친구_01" }) },
        responses: {
          "200": { description: "사용 가능 여부. 이미 사용 중인 경우에도 HTTP 200이며 available은 false.", content: json(ref("NicknameAvailability"), { available: true, message: "사용할 수 있습니다. 가입 완료 시 최종 확정됩니다." }) },
          "400": { description: "형식·예약 이름 오류 또는 Content-Length가 1024바이트 초과. 크기 초과 응답에는 available이 없습니다.", content: json(ref("NicknameValidationError"), { available: false, message: "한글·영문·숫자·_·- 조합으로 2~16자 입력해 주세요. 운영자 이름은 사용할 수 없습니다." }) },
          "503": { description: "DB 연결·설정 오류. 현재 구현은 잘못된 JSON도 이 응답으로 처리합니다.", content: json(ref("MessageError"), { message: "중복 확인을 완료하지 못했습니다. 잠시 후 시도해 주세요." }) },
        },
        "x-upstream": "Supabase PostgreSQL RPC (외부 HTTP API 운영 통계와 별도)",
      },
    },
  },
  components: { schemas: {
    AnimeReleases: { type: "object", required: ["year", "quarter", "items"], properties: {
      year: { type: "integer" }, quarter: { type: "number", minimum: 1, maximum: 4, description: "정상 요청은 정수 분기. 기존 핸들러는 소수 입력도 그대로 반환할 수 있음." }, items: { type: "array", items: ref("AnimeRelease") },
    } },
    AnimeRelease: { type: "object", required: ["id", "title", "genres", "coverImage", "releaseYear", "releaseMonth", "releaseDay", "siteUrl"], properties: {
      id: { type: "integer" }, title: { type: "string" }, genres: { type: "array", items: { type: "string" } },
      coverImage: { type: "string", nullable: true }, releaseYear: { type: "integer" }, releaseMonth: { type: "integer", minimum: 1, maximum: 12 },
      releaseDay: { type: "integer", nullable: true, minimum: 1, maximum: 31 }, siteUrl: { type: "string", nullable: true },
    } },
    NicknameRequest: { type: "object", required: ["nickname"], properties: { nickname: { type: "string", minLength: 2, maxLength: 16, pattern: "^[가-힣A-Za-z0-9_-]{2,16}$", description: "예약 이름 제외. 공백 불가." } } },
    NicknameAvailability: { type: "object", required: ["available", "message"], properties: { available: { type: "boolean" }, message: { type: "string" } } },
    NicknameValidationError: { type: "object", required: ["message"], properties: { available: { type: "boolean", enum: [false] }, message: { type: "string" } } },
    MessageError: { type: "object", required: ["message"], properties: { message: { type: "string" } } },
  } },
};
