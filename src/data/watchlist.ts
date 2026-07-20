import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type WatchItem = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  status: "waiting" | "watching" | "paused";
  releaseLabel: string;
  releasePrecision: "day" | "month" | "year" | "tba";
  releaseYear?: number;
  releaseMonth?: number;
  releaseDay?: number;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  reason: string;
  youtubeUrl?: string;
  authorId?: string | null;
  authorName?: string | null;
};

type WatchItemRow = {
  id: string;
  title: string;
  type: WatchItem["type"];
  genre: string[] | null;
  status: WatchItem["status"];
  release_label: string;
  release_precision: WatchItem["releasePrecision"] | null;
  release_year: number | null;
  release_month: number | null;
  release_day: number | null;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  reason: string;
  youtube_url: string | null;
  author_id: string | null;
  author_name: string | null;
};

const watchItemSelect =
  "id,title,type,genre,status,release_label,release_precision,release_year,release_month,release_day,created_at,updated_at,thumbnail,thumbnail_alt,reason,youtube_url,author_id,author_name";

const legacyWatchItemSelect =
  "id,title,type,genre,status,release_label,created_at,updated_at,thumbnail,thumbnail_alt,reason,youtube_url,author_id,author_name";

function inferReleaseSchedule(releaseLabel: string) {
  const normalized = releaseLabel.trim();
  const dayMatch = normalized.match(/^(\d{4})[.년\s-]+(\d{1,2})[.월\s-]+(\d{1,2})/);
  if (dayMatch) return { releasePrecision: "day" as const, releaseYear: Number(dayMatch[1]), releaseMonth: Number(dayMatch[2]), releaseDay: Number(dayMatch[3]) };

  const monthMatch = normalized.match(/^(\d{4})[.년\s-]+(\d{1,2})(?:[월.]|\s|$)/);
  if (monthMatch) return { releasePrecision: "month" as const, releaseYear: Number(monthMatch[1]), releaseMonth: Number(monthMatch[2]), releaseDay: undefined };

  const yearMatch = normalized.match(/^(\d{4})/);
  if (yearMatch) return { releasePrecision: "year" as const, releaseYear: Number(yearMatch[1]), releaseMonth: undefined, releaseDay: undefined };

  return { releasePrecision: "tba" as const, releaseYear: undefined, releaseMonth: undefined, releaseDay: undefined };
}

function formatAuthorName(value: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  const displayName = name.includes("@") ? name.split("@")[0] : name;

  return displayName.toLowerCase() === "admin" ? "관리자" : displayName;
}

function mapWatchItemRow(row: WatchItemRow): WatchItem {
  const inferredSchedule = inferReleaseSchedule(row.release_label);
  const useStoredSchedule = Boolean(row.release_precision && (row.release_precision !== "tba" || inferredSchedule.releasePrecision === "tba"));

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    genre: row.genre ?? [],
    status: row.status,
    releaseLabel: row.release_label,
    releasePrecision: useStoredSchedule ? row.release_precision! : inferredSchedule.releasePrecision,
    releaseYear: useStoredSchedule ? row.release_year ?? undefined : inferredSchedule.releaseYear,
    releaseMonth: useStoredSchedule ? row.release_month ?? undefined : inferredSchedule.releaseMonth,
    releaseDay: useStoredSchedule ? row.release_day ?? undefined : inferredSchedule.releaseDay,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnail: row.thumbnail ?? "/thumbnails/frieren.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.title} 기대작 썸네일`,
    reason: row.reason,
    youtubeUrl: row.youtube_url ?? undefined,
    authorId: row.author_id,
    authorName: formatAuthorName(row.author_name),
  };
}

async function getWatchItemsFromSupabase() {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("watchlist_items")
    .select(watchItemSelect)
    .order("created_at", { ascending: false });

  if (!error && data) {
    return (data as WatchItemRow[]).map(mapWatchItemRow);
  }

  // Keep existing watchlist data visible until the optional release-calendar
  // migration has been applied to the connected Supabase project.
  const { data: legacyData, error: legacyError } = await supabase
    .from("watchlist_items")
    .select(legacyWatchItemSelect)
    .order("created_at", { ascending: false });

  if (legacyError || !legacyData) {
    return [];
  }

  return (legacyData as WatchItemRow[]).map(mapWatchItemRow);
}

async function getWatchItemFromSupabase(id: string) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("watchlist_items")
    .select(watchItemSelect)
    .eq("id", id)
    .maybeSingle();

  if (!error && data) {
    return mapWatchItemRow(data as WatchItemRow);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("watchlist_items")
    .select(legacyWatchItemSelect)
    .eq("id", id)
    .maybeSingle();

  if (legacyError || !legacyData) {
    return undefined;
  }

  return mapWatchItemRow(legacyData as WatchItemRow);
}

export const getWatchItems = unstable_cache(
  getWatchItemsFromSupabase,
  ["watchlist-items-v2"],
  {
    tags: ["watchlist"],
    revalidate: 60,
  },
);

export const getWatchItem = unstable_cache(
  getWatchItemFromSupabase,
  ["watchlist-item-v2"],
  {
    tags: ["watchlist"],
    revalidate: 60,
  },
);

export function watchStatusLabel(status: WatchItem["status"]) {
  const labels = {
    waiting: "기대중",
    watching: "보는 중",
    paused: "보류",
  };

  return labels[status];
}

export function watchStatusTheme(status: WatchItem["status"]) {
  const themes = {
    waiting: "bg-[#e4f4f2] text-[#2f7f7a]",
    watching: "bg-[#e9ecff] text-[#4657b8]",
    paused: "bg-[#eef0f3] text-[#52616b]",
  };

  return themes[status];
}
