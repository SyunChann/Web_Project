import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://open-api.bser.io";
const MAX_NICKNAME_LENGTH = 24;

type ApiEnvelope = Record<string, unknown> & { code?: number; message?: string };

function apiError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

async function requestEternalReturn(path: string, apiKey: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope;

  if (!response.ok || (body.code && body.code !== 200)) {
    throw new EternalReturnApiError(body.message || "이터널 리턴 전적을 불러오지 못했습니다.", response.status || 502);
  }
  return body;
}

class EternalReturnApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeMatch(raw: Record<string, unknown>) {
  return {
    gameId: readNumber(raw.gameId) ?? readNumber(raw.id),
    characterCode: readNumber(raw.characterNum) ?? readNumber(raw.characterCode),
    rank: readNumber(raw.gameRank) ?? readNumber(raw.rank),
    kills: readNumber(raw.playerKill) ?? readNumber(raw.kills) ?? 0,
    assists: readNumber(raw.playerAssistant) ?? readNumber(raw.assists) ?? 0,
    mode: readNumber(raw.matchingMode),
    teamMode: readNumber(raw.matchingTeamMode),
    startedAt: readNumber(raw.startDtm) ?? readNumber(raw.startAt) ?? readNumber(raw.createdAt),
  };
}

function selectSeasonStats(payloads: ApiEnvelope[]) {
  const records = payloads.flatMap((payload) => Array.isArray(payload.userStats) ? payload.userStats : []);
  const stats = records.filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object").sort((left, right) => (readNumber(right.totalGames) ?? 0) - (readNumber(left.totalGames) ?? 0))[0];
  if (!stats) return null;
  return { totalGames: readNumber(stats.totalGames) ?? 0, totalWins: readNumber(stats.totalWins) ?? 0, averageRank: readNumber(stats.averageRank), averageKills: readNumber(stats.averageKills), mmr: readNumber(stats.mmr) };
}

export async function GET(request: NextRequest) {
  const nickname = request.nextUrl.searchParams.get("nickname")?.trim();
  const apiKey = process.env.ETERNAL_RETURN_API_KEY?.trim();
  if (!nickname) return apiError("닉네임을 입력해 주세요.", 400);
  if (nickname.length > MAX_NICKNAME_LENGTH) return apiError("닉네임은 24자 이내로 입력해 주세요.", 400);
  if (!apiKey) return apiError("이터널 리턴 API 키가 아직 설정되지 않았습니다.", 503);

  try {
    const userPayload = await requestEternalReturn(`/v1/user/nickname?query=${encodeURIComponent(nickname)}`, apiKey);
    const user = userPayload.user as Record<string, unknown> | undefined;
    const uid = typeof user?.uid === "string" ? user.uid : null;
    const resolvedNickname = typeof user?.nickname === "string" ? user.nickname : nickname;
    if (!uid) return apiError("해당 닉네임의 플레이어를 찾지 못했습니다.", 404);

    const gamesRequest = requestEternalReturn(`/v1/user/games/uid/${encodeURIComponent(uid)}`, apiKey);
    const seasonId = Number(process.env.ETERNAL_RETURN_CURRENT_SEASON_ID);
    const statsRequests = Number.isInteger(seasonId) && seasonId > 0 ? [2, 3].map((mode) => requestEternalReturn(`/v2/user/stats/uid/${encodeURIComponent(uid)}/${seasonId}/${mode}`, apiKey).catch(() => null)) : [];
    const [gamesPayload, ...statsPayloads] = await Promise.all([gamesRequest, ...statsRequests]);
    const games = Array.isArray(gamesPayload.userGames) ? gamesPayload.userGames : [];

    return NextResponse.json({ player: { nickname: resolvedNickname }, stats: selectSeasonStats(statsPayloads.filter((payload): payload is ApiEnvelope => payload !== null)), matches: games.filter((game): game is Record<string, unknown> => Boolean(game) && typeof game === "object").slice(0, 20).map(normalizeMatch) });
  } catch (error) {
    if (error instanceof EternalReturnApiError) {
      const status = error.status === 404 ? 404 : error.status === 403 || error.status === 429 ? error.status : 502;
      return apiError(status === 404 ? "해당 닉네임의 플레이어를 찾지 못했습니다." : error.message, status);
    }
    return apiError("전적 조회 중 네트워크 오류가 발생했습니다.", 502);
  }
}
