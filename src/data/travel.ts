import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type Travel = {
  id: string;
  scope: "domestic" | "overseas";
  title: string;
  storeName: string;
  category: "korea" | "japan" | "china" | "other";
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  mapUrl?: string;
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

type TravelRow = {
  id: string;
  scope: Travel["scope"] | null;
  title: string;
  store_name: string;
  category: Travel["category"];
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  map_url: string | null;
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

const travelSelect =
  "id,scope,title,store_name,category,address,latitude,longitude,place_id,map_url,rating,visited_at,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";
const legacyTravelSelect =
  "id,title,store_name,category,address,latitude,longitude,place_id,map_url,rating,visited_at,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";

function formatAuthorName(value: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  const displayName = name.includes("@") ? name.split("@")[0] : name;

  return displayName.toLowerCase() === "admin" ? "관리자" : displayName;
}

function mapTravelRow(row: TravelRow): Travel {
  return {
    id: row.id,
    scope: row.scope ?? "domestic",
    title: row.title,
    storeName: row.store_name,
    category: row.category,
    address: row.address ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    placeId: row.place_id ?? undefined,
    mapUrl: row.map_url ?? undefined,
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

export type TravelScope = Travel["scope"];

async function getTravelsFromSupabase(
  scope: TravelScope = "domestic",
) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("travel")
    .select(travelSelect)
    .eq("scope", scope)
    .order("created_at", { ascending: false });

  if (!error && data) {
    return (data as TravelRow[]).map(mapTravelRow);
  }

  if (scope === "overseas") {
    return [];
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("travel")
    .select(legacyTravelSelect)
    .order("created_at", { ascending: false });

  if (legacyError || !legacyData) {
    return [];
  }

  return (legacyData as TravelRow[]).map(mapTravelRow);
}

async function gettravelFromSupabase(id: string) {
  const supabase = createSupabasePublicClient();

  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase
    .from("travel")
    .select(travelSelect)
    .eq("id", id)
    .maybeSingle();

  if (!error && data) {
    return mapTravelRow(data as TravelRow);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("travel")
    .select(legacyTravelSelect)
    .eq("id", id)
    .maybeSingle();

  if (legacyError || !legacyData) {
    return undefined;
  }

  return mapTravelRow(legacyData as TravelRow);
}

export const getTravels = unstable_cache(
  getTravelsFromSupabase,
  ["travel"],
  {
    tags: ["travel"],
    revalidate: 60,
  },
);

export const getTravel = unstable_cache(
  gettravelFromSupabase,
  ["travel-reviews"],
  {
    tags: ["travel-reviews"],
    revalidate: 60,
  },
);

function sortByCreatedAtDesc(a: Travel, b: Travel) {
  return (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    new Date(b.rating).getTime() - new Date(a.rating).getTime() ||
    a.title.localeCompare(b.title)
  );
}

function sortByRatingDesc(a: Travel, b: Travel) {
  return (
    b.rating - a.rating ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    a.title.localeCompare(b.title)
  );
}

export function sortTravels(reviews: Travel[], sort: ReviewSort) {
  const sortedReviews = [...reviews];

  if (sort === "rating-desc") {
    return sortedReviews.sort(sortByRatingDesc);
  }

  return sortedReviews.sort(sortByCreatedAtDesc);
}

export function categoryLabel(type: Travel["category"]) {
  const labels = {
    korea: "한국",
    japan: "일본",
    china: "중국",
    other: "기타",
  };

  return labels[type];
}

export function categoryTheme(type: Travel["category"]) {
  const category = {
    korea: {
      badge: "bg-[#fde8e7] text-[#a73735]",
      border: "border-l-[#d24b47]",
      text: "text-[#be4b49]",
    },
    japan: {
      badge: "bg-[#e9ecff] text-[#4657b8]",
      border: "border-l-[#6574d8]",
      text: "text-[#5967c7]",
    },
    china: {
      badge: "bg-[#fff0d9] text-[#9a5a13]",
      border: "border-l-[#d9902f]",
      text: "text-[#b56f1d]",
    },
    other: {
      badge: "bg-[#e5f4ed] text-[#247053]",
      border: "border-l-[#2f9d72]",
      text: "text-[#2f7f61]",
    },
  };

  return category[type];
}
