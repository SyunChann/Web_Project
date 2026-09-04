import type { EsportsSeasonEvent, LckMatch } from "@/data/lck";

const LOL_ESPORTS_PAGES = [
  "https://lolesports.com/ko-KR/leagues/lck",
  "https://lolesports.com/ko-KR/leagues/worlds",
] as const;

type LolEsportsTeam = { code?: string | null; name?: string | null };

type LolEsportsEvent = {
  id?: string;
  blockName?: string;
  startTime?: string;
  state?: string;
  league?: { name?: string; slug?: string };
  tournament?: { name?: string };
  matchTeams?: LolEsportsTeam[];
  match?: { strategy?: { count?: number } };
};

type LolEsportsSeasonEvent = {
  seasonDateStart?: string;
  seasonDateEnd?: string;
  seasonEyebrow?: string;
  seasonTitle?: string;
};

type NaverMatch = {
  gameId?: string;
  startDate?: number;
  title?: string;
  matchStatus?: string;
  maxMatchCount?: number;
  homeTeam?: LolEsportsTeam & { nameEngAcronym?: string | null };
  awayTeam?: LolEsportsTeam & { nameEngAcronym?: string | null };
};

type NaverScheduleResponse = {
  content?: { matches?: NaverMatch[] };
};

export type LolEsportsSchedule = {
  matches: LckMatch[];
  seasonEvents: EsportsSeasonEvent[];
  sourceAvailable: boolean;
};

function extractJsonObjects<T>(html: string, typename: string): T[] {
  const needle = `{"__typename":"${typename}"`;
  const objects: T[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf(needle, cursor);
    if (start === -1) break;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < html.length; index += 1) {
      const character = html[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }

      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            objects.push(JSON.parse(html.slice(start, index + 1)) as T);
          } catch {
            // 다음 동기화 때 다시 시도할 수 있도록 손상된 항목만 건너뜁니다.
          }
          cursor = index + 1;
          break;
        }
      }
    }

    if (cursor <= start) cursor = start + needle.length;
  }

  return objects;
}

function getKstDateParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

function getFormat(count?: number): LckMatch["format"] {
  if (count === 5) return "Bo5";
  if (count === 3) return "Bo3";
  return "Bo1";
}

function normalizeLeague(slug?: string, name?: string): LckMatch["league"] | null {
  const value = `${slug ?? ""} ${name ?? ""}`.toLowerCase();
  if (value.includes("world")) return "Worlds";
  if (value.includes("lck")) return "LCK";
  return null;
}

function toMatches(htmlPages: string[]): LckMatch[] {
  const unique = new Map<string, LckMatch>();
  for (const html of htmlPages) {
    for (const event of extractJsonObjects<LolEsportsEvent>(html, "EventMatch")) {
      if (!event.id || !event.startTime) continue;
      const league = normalizeLeague(event.league?.slug, event.league?.name);
      if (!league) continue;

      const [home, away] = event.matchTeams ?? [];
      const { date, time } = getKstDateParts(event.startTime);
      unique.set(event.id, {
        id: event.id,
        date,
        time,
        home: home?.code || home?.name || "TBD",
        away: away?.code || away?.name || "TBD",
        format: getFormat(event.match?.strategy?.count),
        stage: event.blockName || event.tournament?.name || league,
        league,
        state: event.state === "completed" ? "completed" : event.state === "inProgress" ? "live" : "scheduled",
      });
    }
  }
  return [...unique.values()].sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`));
}

function getNaverMonthUrls() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts();
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return [-1, 0, 1].map((offset) => {
    const target = new Date(Date.UTC(year, month - 1 + offset, 1));
    const value = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`;
    return `https://esports-api.game.naver.com/service/v2/schedule/month?month=${value}&topLeagueId=lck&relay=false`;
  });
}

function toNaverMatches(responses: NaverScheduleResponse[]): LckMatch[] {
  const unique = new Map<string, LckMatch>();
  for (const response of responses) {
    for (const match of response.content?.matches ?? []) {
      if (!match.gameId || !match.startDate) continue;
      const { date, time } = getKstDateParts(new Date(match.startDate).toISOString());
      unique.set(match.gameId, {
        id: match.gameId,
        date,
        time,
        home: match.homeTeam?.nameEngAcronym || match.homeTeam?.code || match.homeTeam?.name || "TBD",
        away: match.awayTeam?.nameEngAcronym || match.awayTeam?.code || match.awayTeam?.name || "TBD",
        format: getFormat(match.maxMatchCount),
        stage: match.title || "LCK",
        league: "LCK",
        state: match.matchStatus === "STARTED" ? "live" : ["RESULT", "ENDED"].includes(match.matchStatus ?? "") ? "completed" : "scheduled",
      });
    }
  }
  return [...unique.values()];
}

function mergeMatches(lolEsportsMatches: LckMatch[], naverMatches: LckMatch[]) {
  const matchKey = (match: LckMatch) => `${match.league}|${match.date}|${[match.home, match.away].sort().join("|")}`;
  const merged = new Map(lolEsportsMatches.map((match) => [matchKey(match), match]));
  for (const match of naverMatches) merged.set(matchKey(match), match);
  return [...merged.values()].sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`));
}

function toSeasonEvents(htmlPages: string[]): EsportsSeasonEvent[] {
  const unique = new Map<string, EsportsSeasonEvent>();
  for (const html of htmlPages) {
    for (const event of extractJsonObjects<LolEsportsSeasonEvent>(html, "EsportsSeasonEvent")) {
      if (!event.seasonTitle || !event.seasonDateStart || !event.seasonDateEnd) continue;
      const searchable = `${event.seasonTitle} ${event.seasonEyebrow ?? ""}`.toLowerCase();
      if (!searchable.includes("월드") && !searchable.includes("world")) continue;
      const id = `${event.seasonDateStart}-${event.seasonTitle}`;
      unique.set(id, {
        id,
        title: event.seasonTitle,
        category: event.seasonEyebrow || "국제 대회",
        startDate: event.seasonDateStart,
        endDate: event.seasonDateEnd,
      });
    }
  }
  return [...unique.values()].sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export async function getLolEsportsSchedule(): Promise<LolEsportsSchedule> {
  const [pageResponses, naverResponses] = await Promise.all([
    Promise.allSettled(
    LOL_ESPORTS_PAGES.map(async (url) => {
      const response = await fetch(url, {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`LoL Esports schedule request failed: ${response.status}`);
      return response.text();
    }),
    ),
    Promise.allSettled(
      getNaverMonthUrls().map(async (url) => {
        const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`Naver schedule request failed: ${response.status}`);
        return response.json() as Promise<NaverScheduleResponse>;
      }),
    ),
  ]);
  const htmlPages = pageResponses.flatMap((response) => response.status === "fulfilled" ? [response.value] : []);
  const naverSchedules = naverResponses.flatMap((response) => response.status === "fulfilled" ? [response.value] : []);
  return {
    matches: mergeMatches(toMatches(htmlPages), toNaverMatches(naverSchedules)),
    seasonEvents: toSeasonEvents(htmlPages),
    sourceAvailable: htmlPages.length > 0 || naverSchedules.length > 0,
  };
}
