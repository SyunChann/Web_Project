// UI 설정과 별개로 실행 대상을 제한함. 서버의 인증·권한 검사를 대신하지 않음.
export function restrictSwaggerRequest<T extends { url: string; method?: string }>(request: T, origin: string): T & { credentials: "same-origin" } {
  const target = new URL(request.url, origin);
  if (target.origin !== origin || target.username || target.password || target.pathname !== "/api/anilist/releases" || request.method?.toUpperCase() !== "GET") {
    throw new Error("이 문서에서는 현재 사이트의 애니 신작 GET 조회만 실행할 수 있습니다.");
  }
  return { ...request, credentials: "same-origin" };
}
