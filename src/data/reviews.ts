export type Review = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  rating: number;
  watchedAt: string;
  summary: string;
  review: string;
};

export const reviews: Review[] = [
  {
    id: "your-name",
    title: "너의 이름은.",
    type: "movie",
    genre: ["로맨스", "판타지"],
    rating: 4.5,
    watchedAt: "2026-06-20",
    summary: "영상미와 감정선이 오래 남는 판타지 로맨스.",
    review:
      "처음에는 아름다운 작화가 눈에 들어오지만, 뒤로 갈수록 인물의 감정과 시간의 엇갈림이 더 크게 남는다. 다시 보고 싶은 장면이 많은 작품.",
  },
  {
    id: "frieren",
    title: "장송의 프리렌",
    type: "anime",
    genre: ["판타지", "모험"],
    rating: 5,
    watchedAt: "2026-06-10",
    summary: "모험이 끝난 뒤의 시간을 천천히 바라보는 애니.",
    review:
      "전투보다 여운과 관계에 집중하는 점이 좋았다. 조용한 장면에서도 캐릭터가 쌓아온 시간이 느껴져서 편안하게 몰입할 수 있었다.",
  },
  {
    id: "zelda-tears",
    title: "젤다의 전설: 티어스 오브 더 킹덤",
    type: "game",
    genre: ["어드벤처", "오픈월드"],
    rating: 4.8,
    watchedAt: "2026-05-28",
    summary: "탐험과 실험의 재미가 강한 오픈월드 게임.",
    review:
      "정답을 강요하지 않고 플레이어가 직접 길을 만드는 느낌이 강하다. 사소한 아이디어가 플레이로 이어지는 순간들이 많아 오래 붙잡게 된다.",
  },
];

export function getReview(id: string) {
  return reviews.find((review) => review.id === id);
}

export function typeLabel(type: Review["type"]) {
  const labels = {
    movie: "영화",
    anime: "애니",
    game: "게임",
    drama: "드라마",
  };

  return labels[type];
}
