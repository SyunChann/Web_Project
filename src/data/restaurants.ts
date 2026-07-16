import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type RestaurantsReview = {
  id: string;
  scope: "domestic" | "overseas";
  title: string;
  storeName: string;
  category: "korean" | "japanese" | "chinese" | "western" | "asian" | "cafe" | "other";
  companion: "solo" | "date" | "friends" | "family" | "business" | "other";
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  mapUrl?: string;
  willRevisit: string;
  hasParking?: string;
  rating: number;
  visitedAt: string;
  thumbnail: string;
  thumbnailAlt: string;
  summary: string;
  review: string;
  authorId?: string | null;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewSort = "created-desc" | "rating-desc";

type RestaurantsReviewRow = {
  id: string;
  scope: RestaurantsReview["scope"] | null;
  title: string;
  store_name: string;
  category: RestaurantsReview["category"];
  companion: RestaurantsReview["companion"];
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  map_url: string | null;
  will_revisit: string;
  has_parking: string;
  rating: number;
  visited_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

const restaurantsReviewSelect =
  "id,scope,title,store_name,category,address,latitude,longitude,place_id,map_url,companion,will_revisit,has_parking,rating,visited_at,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";
const legacyRestaurantsReviewSelect =
  "id,title,store_name,category,address,latitude,longitude,place_id,map_url,companion,will_revisit,has_parking,rating,visited_at,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";

function formatAuthorName(value: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  const displayName = name.includes("@") ? name.split("@")[0] : name;

  return displayName.toLowerCase() === "admin" ? "관리자" : displayName;
}

function mapRestaurantsReviewRow(row: RestaurantsReviewRow): RestaurantsReview {
  return {
    id: row.id,
    scope: row.scope ?? "domestic",
    title: row.title,
    storeName: row.store_name,
    category: row.category,
    companion: row.companion ?? [],
    address: row.address ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    placeId: row.place_id ?? undefined,
    mapUrl: row.map_url ?? undefined,
    willRevisit: row.will_revisit,
    hasParking: row.has_parking ?? undefined,
    rating: Number(row.rating),
    visitedAt: row.visited_at,
    thumbnail: row.thumbnail ?? "/thumbnails/default-food.svg",
    thumbnailAlt: row.thumbnail_alt ?? `${row.store_name} 리뷰 썸네일`,
    summary: row.summary,
    review: row.review,
    authorId: row.author_id,
    authorName: formatAuthorName(row.author_name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type RestaurantsReviewScope = RestaurantsReview["scope"];

async function getRestaurantsReviewsFromSupabase(
  scope: RestaurantsReviewScope = "domestic",
) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const query = supabase
    .from("restaurant_reviews")
    .select(restaurantsReviewSelect);
  const scopedQuery =
    scope === "domestic"
      ? query.or("scope.eq.domestic,scope.is.null")
      : query.eq("scope", scope);
  const { data, error } = await scopedQuery.order("created_at", {
    ascending: false,
  });

  if (!error && data) {
    return (data as RestaurantsReviewRow[]).map(mapRestaurantsReviewRow);
  }

  if (scope === "overseas") {
    return [];
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("restaurant_reviews")
    .select(legacyRestaurantsReviewSelect)
    .order("created_at", { ascending: false });

  if (legacyError || !legacyData) {
    return [];
  }

  return (legacyData as RestaurantsReviewRow[]).map(mapRestaurantsReviewRow);
}

async function getRestaurantsReviewFromSupabase(id: string) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("restaurant_reviews")
    .select(restaurantsReviewSelect)
    .eq("id", id)
    .maybeSingle();

  if (!error && data) {
    return mapRestaurantsReviewRow(data as RestaurantsReviewRow);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("restaurant_reviews")
    .select(legacyRestaurantsReviewSelect)
    .eq("id", id)
    .maybeSingle();

  if (legacyError || !legacyData) {
    return undefined;
  }

  return mapRestaurantsReviewRow(legacyData as RestaurantsReviewRow);
}

export async function getRestaurantsReviews(
  scope: RestaurantsReviewScope = "domestic",
) {
  return getRestaurantsReviewsFromSupabase(scope);
}

export const getRestaurantsReview = unstable_cache(
  getRestaurantsReviewFromSupabase,
  ["restaurant-reviews"],
  {
    tags: ["restaurant-reviews"],
    revalidate: 60,
  },
);

function sortByCreatedAtDesc(a: RestaurantsReview, b: RestaurantsReview) {
  return (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    new Date(b.rating).getTime() - new Date(a.rating).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByRatingDesc(a: RestaurantsReview, b: RestaurantsReview) {
  return (
    b.rating - a.rating ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

export function sortRestaurantsReviews(reviews: RestaurantsReview[], sort: ReviewSort) {
  const sortedReviews = [...reviews];

  if (sort === "rating-desc") {
    return sortedReviews.sort(sortByRatingDesc);
  }

  return sortedReviews.sort(sortByCreatedAtDesc);
}

export function categoryLabel(type: RestaurantsReview["category"]) {
  const labels = {
    korean: "한식",
    japanese: "일식",
    western: "양식",
    chinese: "중식",
    asian: "아시아",
    cafe: "카페",
    other: "기타",
  };

  return labels[type];
}

export function categoryTheme(type: RestaurantsReview["category"]) {
  const category = {
    korean: {
      badge: "bg-[#fde8e7] text-[#a73735]",
      border: "border-l-[#d24b47]",
      text: "text-[#be4b49]",
    },
    japanese: {
      badge: "bg-[#e9ecff] text-[#4657b8]",
      border: "border-l-[#6574d8]",
      text: "text-[#5967c7]",
    },
    western: {
      badge: "bg-[#e5f4ed] text-[#247053]",
      border: "border-l-[#2f9d72]",
      text: "text-[#2f7f61]",
    },
    chinese: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
    asian: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
    cafe: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
    other: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
  };

  return category[type];
}
