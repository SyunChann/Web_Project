import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export type Travel = {
  id: string;
  scope: "domestic" | "overseas";
  tripTitle?: string;
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
  visitedTime?: string;
  itinerary: TravelStop[];
  thumbnail: string;
  thumbnailAlt: string;
  summary: string;
  review: string;
  authorId?: string | null;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TravelStop = {
  storeName: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  mapUrl?: string;
  photoUrl?: string;
  visitedAt: string;
  visitedTime?: string;
};

export type TravelPost = {
  travel: Travel;
  placeCount: number;
};

export function travelToStop(travel: Travel): TravelStop {
  return {
    storeName: travel.storeName,
    address: travel.address,
    latitude: travel.latitude,
    longitude: travel.longitude,
    placeId: travel.placeId,
    mapUrl: travel.mapUrl,
    photoUrl: travel.thumbnail,
    visitedAt: travel.visitedAt,
    visitedTime: travel.visitedTime,
  };
}

export function sortTravelStops(stops: TravelStop[]) {
  return [...stops].sort((left, right) => {
    const leftKey = `${left.visitedAt || "9999-12-31"}T${left.visitedTime?.slice(0, 5) || "23:59"}`;
    const rightKey = `${right.visitedAt || "9999-12-31"}T${right.visitedTime?.slice(0, 5) || "23:59"}`;

    return leftKey.localeCompare(rightKey, "en");
  });
}

export type ReviewSort = "created-desc" | "rating-desc";

type TravelRow = {
  id: string;
  scope: Travel["scope"] | null;
  trip_title: string | null;
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
  visited_time: string | null;
  itinerary: unknown;
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
  "id,scope,trip_title,title,store_name,category,address,latitude,longitude,place_id,map_url,rating,visited_at,visited_time,itinerary,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";
const travelSelectWithoutItinerary =
  "id,scope,trip_title,title,store_name,category,address,latitude,longitude,place_id,map_url,rating,visited_at,visited_time,thumbnail,thumbnail_alt,summary,review,author_id,author_name,created_at,updated_at";
const travelSelectWithoutItineraryColumns =
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
    scope: row.scope ?? "overseas",
    tripTitle: row.trip_title ?? undefined,
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
    visitedTime: row.visited_time ?? undefined,
    itinerary: parseItinerary(row.itinerary),
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

function parseItinerary(value: unknown): TravelStop[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((stop) => {
    if (!stop || typeof stop !== "object") return [];

    const item = stop as Partial<TravelStop>;
    const storeName = typeof item.storeName === "string" ? item.storeName.trim() : "";
    const visitedAt = typeof item.visitedAt === "string" ? item.visitedAt : "";

    if (!storeName || !visitedAt) return [];

    return [{
      storeName,
      address: typeof item.address === "string" ? item.address : undefined,
      latitude: typeof item.latitude === "number" ? item.latitude : undefined,
      longitude: typeof item.longitude === "number" ? item.longitude : undefined,
      placeId: typeof item.placeId === "string" ? item.placeId : undefined,
      mapUrl: typeof item.mapUrl === "string" ? item.mapUrl : undefined,
      photoUrl: typeof item.photoUrl === "string" ? item.photoUrl : undefined,
      visitedAt,
      visitedTime: typeof item.visitedTime === "string" ? item.visitedTime : undefined,
    }];
  });
}

export type TravelScope = Travel["scope"];

async function getTravelsFromSupabase(
  scope: TravelScope = "overseas",
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

  const { data: rowsWithoutItinerary, error: rowsWithoutItineraryError } =
    await supabase
      .from("travel")
      .select(travelSelectWithoutItinerary)
      .eq("scope", scope)
      .order("created_at", { ascending: false });

  if (!rowsWithoutItineraryError && rowsWithoutItinerary) {
    return (rowsWithoutItinerary as TravelRow[]).map(mapTravelRow);
  }

  const { data: rowsWithoutVisitedTime, error: rowsWithoutVisitedTimeError } =
    await supabase
      .from("travel")
      .select(travelSelectWithoutItineraryColumns)
      .eq("scope", scope)
      .order("created_at", { ascending: false });

  if (!rowsWithoutVisitedTimeError && rowsWithoutVisitedTime) {
    return (rowsWithoutVisitedTime as TravelRow[]).map(mapTravelRow);
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

  const { data: rowWithoutItinerary, error: rowWithoutItineraryError } =
    await supabase
      .from("travel")
      .select(travelSelectWithoutItinerary)
      .eq("id", id)
      .maybeSingle();

  if (!rowWithoutItineraryError && rowWithoutItinerary) {
    return mapTravelRow(rowWithoutItinerary as TravelRow);
  }

  const { data: rowWithoutVisitedTime, error: rowWithoutVisitedTimeError } =
    await supabase
      .from("travel")
      .select(travelSelectWithoutItineraryColumns)
      .eq("id", id)
      .maybeSingle();

  if (!rowWithoutVisitedTimeError && rowWithoutVisitedTime) {
    return mapTravelRow(rowWithoutVisitedTime as TravelRow);
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

export function groupTravelPosts(items: Travel[]): TravelPost[] {
  const posts = new Map<string, TravelPost>();

  for (const item of items) {
    const key = item.itinerary.length
      ? item.id
      : item.tripTitle
        ? `${item.authorId ?? ""}:${item.tripTitle}:${item.createdAt.slice(0, 10)}`
        : item.id;
    const existing = posts.get(key);

    if (existing) {
      existing.placeCount += 1;
      continue;
    }

    posts.set(key, {
      travel: item,
      placeCount: item.itinerary.length || 1,
    });
  }

  return Array.from(posts.values());
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
