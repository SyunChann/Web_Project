import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type Review = {
  id: string;
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  rating: number;
  watchedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  summary: string;
  review: string;
};

type ReviewRow = {
  id: string;
  title: string;
  type: Review["type"];
  genre: string[] | null;
  rating: number;
  watched_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
};

const reviewSelect =
  "id,title,type,genre,rating,watched_at,thumbnail,thumbnail_alt,summary,review";

function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    genre: row.genre ?? [],
    rating: row.rating,
    watchedAt: row.watched_at,
    thumbnail: row.thumbnail ?? "/thumbnails/your-name.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.title} 리뷰 썸네일`,
    summary: row.summary,
    review: row.review,
  };
}

async function getReviewsFromSupabase() {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(reviewSelect)
    .order("watched_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as ReviewRow[]).map(mapReviewRow);
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
      border: "border-l-[#d24b47]",
      text: "text-[#be4b49]",
    },
    anime: {
      badge: "bg-[#e9ecff] text-[#4657b8]",
      border: "border-l-[#6574d8]",
      text: "text-[#5967c7]",
    },
    game: {
      badge: "bg-[#e5f4ed] text-[#247053]",
      border: "border-l-[#2f9d72]",
      text: "text-[#2f7f61]",
    },
    drama: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
  };

  return themes[type];
}
