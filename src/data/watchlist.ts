import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type WatchItem = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  status: "waiting" | "watching" | "paused";
  releaseLabel: string;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  reason: string;
  youtubeUrl?: string;
};

type WatchItemRow = {
  id: string;
  title: string;
  type: WatchItem["type"];
  genre: string[] | null;
  status: WatchItem["status"];
  release_label: string;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  reason: string;
  youtube_url: string | null;
};

const watchItemSelect =
  "id,title,type,genre,status,release_label,created_at,updated_at,thumbnail,thumbnail_alt,reason,youtube_url";

function mapWatchItemRow(row: WatchItemRow): WatchItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    genre: row.genre ?? [],
    status: row.status,
    releaseLabel: row.release_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnail: row.thumbnail ?? "/thumbnails/frieren.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.title} 기대작 썸네일`,
    reason: row.reason,
    youtubeUrl: row.youtube_url ?? undefined,
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

  if (error || !data) {
    return [];
  }

  return (data as WatchItemRow[]).map(mapWatchItemRow);
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

  if (error || !data) {
    return undefined;
  }

  return mapWatchItemRow(data as WatchItemRow);
}

export const getWatchItems = unstable_cache(
  getWatchItemsFromSupabase,
  ["watchlist-items"],
  {
    tags: ["watchlist"],
    revalidate: 60,
  },
);

export const getWatchItem = unstable_cache(
  getWatchItemFromSupabase,
  ["watchlist-item"],
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
    waiting: "bg-[#fff0d9] text-[#9a5a13]",
    watching: "bg-[#e5f4ed] text-[#247053]",
    paused: "bg-[#eef0f3] text-[#52616b]",
  };

  return themes[status];
}
