import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type Review = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  rating: number;
  watchedAt: string;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  summary: string;
  review: string;
  youtubeUrl?: string;
  authorId?: string | null;
  authorName?: string | null;
};

export type ReviewSort = "created-desc" | "watched-desc" | "rating-desc";

type ReviewRow = {
  id: string;
  title: string;
  type: Review["type"];
  genre: string[] | null;
  youtube_url: string | null;
  rating: number;
  watched_at: string;
  created_at: string;
  updated_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
  author_id: string | null;
  author_name: string | null;
};

const reviewSelect =
  "id,title,type,genre,youtube_url,rating,watched_at,created_at,updated_at,thumbnail,thumbnail_alt,summary,review,author_id,author_name";

function formatAuthorName(value: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  const displayName = name.includes("@") ? name.split("@")[0] : name;

  return displayName.toLowerCase() === "admin" ? "관리자" : displayName;
}

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    genre: row.genre ?? [],
    youtubeUrl: row.youtube_url ?? undefined,
    rating: row.rating,
    watchedAt: row.watched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnail: row.thumbnail ?? "/thumbnails/your-name.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.title} 리뷰 썸네일`,
    summary: row.summary,
    review: row.review,
    authorId: row.author_id,
    authorName: formatAuthorName(row.author_name),
  };
}

function sortByCreatedAtDesc(a: Review, b: Review) {
  return (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByWatchedAtDesc(a: Review, b: Review) {
  return (
    new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime() ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByRatingDesc(a: Review, b: Review) {
  return (
    b.rating - a.rating ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

export function sortReviews(reviews: Review[], sort: ReviewSort) {
  const sortedReviews = [...reviews];

  if (sort === "watched-desc") {
    return sortedReviews.sort(sortByWatchedAtDesc);
  }

  if (sort === "rating-desc") {
    return sortedReviews.sort(sortByRatingDesc);
  }

  return sortedReviews.sort(sortByCreatedAtDesc);
}

async function getReviewsFromSupabase() {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(reviewSelect)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return sortReviews((data as ReviewRow[]).map(mapReviewRow), "created-desc");
}

async function getReviewFromSupabase(id: string) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(reviewSelect)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapReviewRow(data as ReviewRow);
}

export const getReviews = unstable_cache(
  getReviewsFromSupabase,
  ["reviews"],
  {
    tags: ["reviews"],
    revalidate: 60,
  },
);

export const getReview = unstable_cache(
  getReviewFromSupabase,
  ["review"],
  {
    tags: ["reviews"],
    revalidate: 60,
  },
);

export function typeLabel(type: Review["type"]) {
  const labels = {
    movie: "영화",
    anime: "애니",
    game: "게임",
    drama: "드라마",
  };

  return labels[type];
}

export function typeTheme(type: Review["type"]) {
  const themes = {
    movie: {
      badge: "bg-[#fde8e7] text-[#a73735]",
      text: "text-[#be4b49]",
    },
    anime: {
      badge: "bg-[#e9ecff] text-[#4657b8]",
      text: "text-[#5967c7]",
    },
    game: {
      badge: "bg-[#e5f4ed] text-[#247053]",
      text: "text-[#2f7f61]",
    },
    drama: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      text: "text-[#b56f1d]",
    },
  };

  return themes[type];
}
