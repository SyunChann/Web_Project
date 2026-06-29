export type WatchItem = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  status: "waiting" | "watching" | "paused";
  releaseLabel: string;
  thumbnail: string;
  thumbnailAlt: string;
  reason: string;
};

const watchItems: WatchItem[] = [];

export function getWatchItems() {
  return watchItems;
}

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
