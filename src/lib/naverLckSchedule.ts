import type { LckMatch } from "@/data/lck";

const NAVER_LCK_SCHEDULE_URL = "https://game.naver.com/esports/League_of_Legends/schedule/lck";

// Naver occasionally returns the schedule page without its hydrated state.
// Keep the latest confirmed schedule visible until the next successful refresh.
const fallbackMatches: LckMatch[] = [
  { id: "2026-08-19-gen-kt", date: "2026-08-19", time: "17:00", home: "GEN", away: "KT", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-19-bro-dns", date: "2026-08-19", time: "19:00", home: "BRO", away: "DNS", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-20-dk-hle", date: "2026-08-20", time: "17:00", home: "DK", away: "HLE", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-20-ns-krx", date: "2026-08-20", time: "19:00", home: "NS", away: "KRX", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-21-bro-bfx", date: "2026-08-21", time: "17:00", home: "BRO", away: "BFX", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-21-kt-t1", date: "2026-08-21", time: "19:00", home: "KT", away: "T1", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-22-dk-gen", date: "2026-08-22", time: "17:00", home: "DK", away: "GEN", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-22-dns-krx", date: "2026-08-22", time: "19:00", home: "DNS", away: "KRX", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-23-hle-t1", date: "2026-08-23", time: "17:00", home: "HLE", away: "T1", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-23-bfx-ns", date: "2026-08-23", time: "19:00", home: "BFX", away: "NS", format: "Bo3", stage: "정규시즌 4R" },
  { id: "2026-08-26-playin-1", date: "2026-08-26", time: "17:00", home: "KT", away: "BRO", format: "Bo5", stage: "플레이-인 1R" },
  { id: "2026-08-27-playin-2", date: "2026-08-27", time: "17:00", home: "NS", away: "BFX", format: "Bo5", stage: "플레이-인 2R" },
  { id: "2026-08-28-playin-final", date: "2026-08-28", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "플레이-인 최종전" },
  { id: "2026-08-29-playoff-1", date: "2026-08-29", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "플레이오프 1R" },
  { id: "2026-08-30-playoff-2", date: "2026-08-30", time: "17:00", home: "TBD", away: "TBD", format: "Bo5", stage: "플레이오프 1R" },
];

type NaverTeam = {
  nameEngAcronym?: string | null;
};

type NaverSchedule = {
  gameId?: string;
  topLeagueId?: string;
  startDate?: number;
  title?: string;
  maxMatchCount?: number;
  homeTeam?: NaverTeam | null;
  awayTeam?: NaverTeam | null;
};

type NaverScheduleGroup = {
  schedules?: NaverSchedule[];
};

type NaverPageData = {
  props?: {
    initialProps?: {
      initialState?: {
        schedule?: {
          monthSchedule?: NaverScheduleGroup[];
        };
      };
    };
  };
};

function getKstDateParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

function getFormat(maxMatchCount?: number): LckMatch["format"] {
  return maxMatchCount === 5 ? "Bo5" : "Bo3";
}

export async function getNaverLckMatches(): Promise<LckMatch[]> {
  try {
    const response = await fetch(NAVER_LCK_SCHEDULE_URL, {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) throw new Error(`Naver schedule request failed: ${response.status}`);

    const html = await response.text();
    const payload = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
    if (!payload) throw new Error("Naver schedule data was not found");

    const data = JSON.parse(payload) as NaverPageData;
    const schedules = data.props?.initialProps?.initialState?.schedule?.monthSchedule ?? [];

    const matches = schedules
      .flatMap((group) => group.schedules ?? [])
      .filter((schedule) => schedule.topLeagueId === "lck" && schedule.gameId && schedule.startDate)
      .map((schedule) => {
        const { date, time } = getKstDateParts(schedule.startDate!);

        return {
          id: schedule.gameId!,
          date,
          time,
          home: schedule.homeTeam?.nameEngAcronym || "TBD",
          away: schedule.awayTeam?.nameEngAcronym || "TBD",
          format: getFormat(schedule.maxMatchCount),
          stage: schedule.title || "LCK",
        };
      });

    return matches.length ? matches : fallbackMatches;
  } catch (error) {
    console.error("Failed to load the Naver LCK schedule", error);
    return fallbackMatches;
  }
}
