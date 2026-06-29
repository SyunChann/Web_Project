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

const watchItems: WatchItem[] = [
  {
    id: "chainsaw-man-reze",
    title: "체인소 맨: 레제편",
    type: "anime",
    genre: ["액션", "다크 판타지"],
    status: "waiting",
    releaseLabel: "개봉 예정",
    thumbnail: "/thumbnails/frieren.svg",
    thumbnailAlt: "체인소 맨 레제편 기대작 썸네일",
    reason: "원작에서 분위기가 크게 바뀌는 구간이라 영상화 톤이 궁금함.",
  },
  {
    id: "gta-6",
    title: "Grand Theft Auto VI",
    type: "game",
    genre: ["오픈월드", "액션"],
    status: "waiting",
    releaseLabel: "출시 예정",
    thumbnail: "/thumbnails/zelda-tears.svg",
    thumbnailAlt: "GTA 6 기대작 썸네일",
    reason: "오픈월드 밀도와 도시 연출이 어디까지 올라갈지 기대됨.",
  },
  {
    id: "dune-part-three",
    title: "듄: 메시아",
    type: "movie",
    genre: ["SF", "드라마"],
    status: "paused",
    releaseLabel: "제작 예정",
    thumbnail: "/thumbnails/your-name.svg",
    thumbnailAlt: "듄 메시아 기대작 썸네일",
    reason: "전작의 스케일 이후 이야기를 어떤 결로 이어갈지 보고 싶음.",
  },
];

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
