"use server";

import { randomUUID } from "crypto";
import type { User } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { canManageContent } from "@/lib/contentPermissions";
import { notifyDiscord } from "@/lib/discord";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const thumbnailBucket = "review-thumbnails";
const maxThumbnailSize = 5 * 1024 * 1024;

type TravelPayload = {
  scope: "domestic" | "overseas";
  trip_title: string | null;
  title: string;
  store_name: string;
  category: "korea" | "japan" | "china" | "other";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  map_url: string | null;
  has_parking: string | null;
  rating: number;
  visited_at: string;
  visited_time: string | null;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
};

type ItineraryPlaceInput = {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  mapUrl: string;
  photoUrl?: string;
  visitedAt: string;
  visitedTime: string;
};

function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `review-${Date.now()}`;
}

function normalizeFileName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase() || "png";
  const cleanExtension = extension.replace(/[^a-z0-9]/g, "") || "png";

  return `${randomUUID()}.${cleanExtension}`;
}

function readTravelPayload(formData: FormData): TravelPayload {
  const scope = String(formData.get("scope") ?? "domestic") as TravelPayload["scope"];
  const isOverseasScope = scope === "overseas";
  const title = String(formData.get("title") ?? "").trim();
  const tripTitle = String(formData.get("tripTitle") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const category = String(
    formData.get("category") ?? (isOverseasScope ? "other" : ""),
  ) as TravelPayload["category"];
  const address = String(formData.get("address") ?? "");
  const latitude = Number(formData.get("latitude") ?? 0);
  const longitude = Number(formData.get("longitude") ?? 0);
  const placeId = String(formData.get("placeId") ?? "");
  const mapUrl = String(formData.get("mapUrl") ?? "");
  const hasParking = String(
    formData.get("hasParking") ?? (isOverseasScope ? "false" : ""),
  );
  const rating = Number(formData.get("rating") ?? 0);
  const visitedAt =
    String(formData.get("visitedAt") ?? "").trim() ||
    (isOverseasScope ? new Date().toISOString().slice(0, 10) : "");
  const visitedTime = String(formData.get("visitedTime") ?? "").trim();
  const thumbnail = String(formData.get("thumbnail") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const review = String(formData.get("review") ?? "").trim();

  if (!title || !summary || !review) {
    throw new Error("필수 리뷰 정보를 입력해 주세요.");
  }

  if (!["domestic", "overseas"].includes(scope)) {
    throw new Error("올바른 여행리뷰 유형을 선택해 주세요.");
  }

  if (!["korea", "japan", "china", "other"].includes(category)) {
    throw new Error("올바른 카테고리를 선택해 주세요.");
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("별점은 0부터 5 사이로 입력해 주세요.");
  }

  if (isOverseasScope && formData.has("itinerary") && !tripTitle) {
    throw new Error("여행 제목을 입력해 주세요.");
  }

  if (visitedTime && !/^\d{2}:\d{2}$/.test(visitedTime)) {
    throw new Error("방문 시간 형식이 올바르지 않습니다.");
  }

  return {
    scope,
    trip_title: tripTitle || null,
    title,
    store_name: storeName,
    category,
    address,
    latitude,
    longitude,
    place_id: placeId,
    map_url: mapUrl,
    has_parking: hasParking,
    rating,
    visited_at: visitedAt,
    visited_time: visitedTime || null,
    thumbnail: thumbnail || null,
    thumbnail_alt: `${title} 리뷰 썸네일`,
    summary,
    review,
  };
}

function readItineraryPlaces(formData: FormData) {
  const value = String(formData.get("itinerary") ?? "").trim();

  if (!value) {
    return [];
  }

  let places: unknown;

  try {
    places = JSON.parse(value);
  } catch {
    throw new Error("여행 동선 정보를 읽지 못했습니다.");
  }

  if (!Array.isArray(places) || places.length === 0) {
    throw new Error("여행 장소를 하나 이상 추가해 주세요.");
  }

  const itinerary = places.map((place, index) => {
    const item = place as Partial<ItineraryPlaceInput>;
    const storeName = String(item.storeName ?? "").trim();
    const visitedAt = String(item.visitedAt ?? "").trim();
    const visitedTime = String(item.visitedTime ?? "").trim();

    if (!storeName || !visitedAt) {
      throw new Error(`${index + 1}번째 장소의 이름과 방문일을 확인해 주세요.`);
    }

    if (visitedTime && !/^\d{2}:\d{2}$/.test(visitedTime)) {
      throw new Error(`${index + 1}번째 장소의 방문 시간 형식이 올바르지 않습니다.`);
    }

    return {
      storeName,
      address: String(item.address ?? "").trim(),
      latitude: Number(item.latitude ?? 0),
      longitude: Number(item.longitude ?? 0),
      placeId: String(item.placeId ?? "").trim(),
      mapUrl: String(item.mapUrl ?? "").trim(),
      photoUrl: typeof item.photoUrl === "string" ? item.photoUrl.trim() : "",
      visitedAt,
      visitedTime,
    };
  });

  return itinerary.sort((left, right) => {
    const leftKey = `${left.visitedAt}T${left.visitedTime || "23:59"}`;
    const rightKey = `${right.visitedAt}T${right.visitedTime || "23:59"}`;

    return leftKey.localeCompare(rightKey, "en");
  });
}

function readLegacyTravelIds(formData: FormData) {
  const value = String(formData.get("legacyTravelIds") ?? "").trim();

  if (!value) {
    return [];
  }

  try {
    const ids = JSON.parse(value);

    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function readThumbnailFile(formData: FormData) {
  const file = formData.get("thumbnail_file");

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("썸네일은 이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > maxThumbnailSize) {
    throw new Error("썸네일 이미지는 5MB 이하로 업로드해 주세요.");
  }

  return file;
}

async function requireSupabaseUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function getAuthorName(user: User) {
  const displayName =
    user.user_metadata?.display_name ??
    user.user_metadata?.name ??
    user.user_metadata?.full_name;

  return typeof displayName === "string" && displayName.trim()
    ? displayName.trim()
    : user.email?.split("@")[0] ?? "Unknown";
}

async function assertCanManageReview(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  user: User,
  id: string,
) {
  const { data, error } = await supabase
    .from("travel")
    .select("author_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("리뷰를 찾을 수 없습니다.");
  }

  if (!canManageContent(user, data.author_id)) {
    throw new Error("이 리뷰를 수정하거나 삭제할 권한이 없습니다.");
  }
}

async function uploadThumbnail(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  reviewId: string,
  formData: FormData,
) {
  const file = readThumbnailFile(formData);

  if (!file) {
    return null;
  }

  const path = `${reviewId}/${normalizeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(thumbnailBucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    if (error.message.toLowerCase().includes("bucket not found")) {
      throw new Error(
        "Supabase Storage bucket 'review-thumbnails'가 없습니다. supabase/schema.sql을 다시 실행해 주세요.",
      );
    }

    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(thumbnailBucket).getPublicUrl(path);

  return publicUrl;
}

function revalidateTravelPaths() {
  updateTag("travel");
  revalidatePath("/");
  revalidatePath("/travel");
  revalidatePath("/travel/items");
  revalidatePath("/travel/map");
}

function isMissingScopeColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.toLowerCase().includes("scope") &&
      error.message.toLowerCase().includes("column"),
  );
}

function withoutScope(payload: TravelPayload) {
  const legacyPayload = { ...payload };
  delete (legacyPayload as Partial<TravelPayload>).scope;

  return legacyPayload as Omit<TravelPayload, "scope">;
}

export async function createTravel(formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  const payload = readTravelPayload(formData);
  const itineraryPlaces = payload.scope === "overseas" ? readItineraryPlaces(formData) : [];

  if (itineraryPlaces.length) {
    const firstPlace = itineraryPlaces[0];
    const id = `travel-${Date.now()}`;
    const insertPayload = {
      ...payload,
      id,
      title: payload.trip_title ?? firstPlace.storeName,
      store_name: firstPlace.storeName,
      address: firstPlace.address || null,
      latitude: Number.isFinite(firstPlace.latitude) ? firstPlace.latitude : null,
      longitude: Number.isFinite(firstPlace.longitude) ? firstPlace.longitude : null,
      place_id: firstPlace.placeId || null,
      map_url: firstPlace.mapUrl || null,
      visited_at: firstPlace.visitedAt,
      visited_time: firstPlace.visitedTime || null,
      thumbnail: firstPlace.photoUrl || payload.thumbnail,
      thumbnail_alt: `${payload.trip_title} 여행 사진`,
      itinerary: itineraryPlaces,
      author_id: user.id,
      author_name: getAuthorName(user),
    };
    const { error } = await supabase.from("travel").insert(insertPayload);

    if (error) {
      if (error.message.includes("Could not find the table 'public.travel'")) {
        throw new Error("Supabase SQL Editor에서 add-travel-visited-time.sql을 먼저 실행해 주세요.");
      }

      if (error.message.includes("visited_time")) {
        throw new Error("Supabase SQL Editor에서 add-travel-visited-time.sql을 먼저 실행해 주세요.");
      }

      throw new Error(error.message);
    }

    await notifyDiscord({
      title: "여행 동선 작성",
      description: `${itineraryPlaces.length}개 장소가 여행 기록에 추가되었습니다.`,
    });
    revalidateTravelPaths();
    redirect(`/travel/${id}`);
  }

  if (payload.scope === "overseas") {
    throw new Error("여행 장소를 하나 이상 추가해 주세요.");
  }

  const requestedId = String(formData.get("id") ?? "").trim();
  const id = normalizeSlug(requestedId || payload.title);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const insertPayload = {
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    author_id: user.id,
    author_name: getAuthorName(user),
    id,
  };

  const { error } = await supabase.from("travel").insert(insertPayload);

  if (error && payload.scope === "domestic" && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase.from("travel").insert({
      ...withoutScope(payload),
      thumbnail: uploadedThumbnail ?? payload.thumbnail,
      author_id: user.id,
      author_name: getAuthorName(user),
      id,
    });

    if (legacyError) {
      throw new Error(legacyError.message);
    }
  } else if (error) {
    throw new Error(error.message);
  }


  await notifyDiscord({
    title: "여행리뷰 작성",
    description: "새 리뷰가 작성되었습니다.",
  });

  revalidateTravelPaths();
  redirect(`/travel/${id}`);
}

export async function updateTravel(id: string, formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);
  const payload = readTravelPayload(formData);
  const itineraryPlaces = payload.scope === "overseas" ? readItineraryPlaces(formData) : [];
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const updatePayload = itineraryPlaces.length ? {
    ...payload,
    title: payload.trip_title ?? itineraryPlaces[0].storeName,
    store_name: itineraryPlaces[0].storeName,
    address: itineraryPlaces[0].address || null,
    latitude: Number.isFinite(itineraryPlaces[0].latitude) ? itineraryPlaces[0].latitude : null,
    longitude: Number.isFinite(itineraryPlaces[0].longitude) ? itineraryPlaces[0].longitude : null,
    place_id: itineraryPlaces[0].placeId || null,
    map_url: itineraryPlaces[0].mapUrl || null,
    visited_at: itineraryPlaces[0].visitedAt,
    visited_time: itineraryPlaces[0].visitedTime || null,
    thumbnail: uploadedThumbnail ?? payload.thumbnail ?? itineraryPlaces[0].photoUrl,
    thumbnail_alt: `${payload.trip_title ?? itineraryPlaces[0].storeName} 여행 사진`,
    itinerary: itineraryPlaces,
    updated_at: new Date().toISOString(),
  } : {
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("travel")
    .update(updatePayload)
    .eq("id", id);

  if (error && payload.scope === "domestic" && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase
      .from("travel")
      .update({
        ...withoutScope(payload),
        thumbnail: uploadedThumbnail ?? payload.thumbnail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (legacyError) {
      throw new Error(legacyError.message);
    }
  } else if (error) {
    throw new Error(error.message);
  }

  const legacyTravelIds = readLegacyTravelIds(formData).filter((legacyId) => legacyId !== id);

  if (itineraryPlaces.length && legacyTravelIds.length) {
    const { error: deleteError } = await supabase
      .from("travel")
      .delete()
      .in("id", legacyTravelIds)
      .eq("author_id", user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  await notifyDiscord({
    title: "여행리뷰 수정",
    description: "리뷰가 수정되었습니다.",
    color: 0x52616b,
  });

  revalidateTravelPaths();
  revalidatePath(`/travel/${id}`);
  redirect(`/travel/${id}`);
}

export async function deleteTravel(id: string) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);

  const { error } = await supabase.from("travel").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "리뷰 삭제",
    description: "리뷰가 삭제되었습니다.",
    color: 0xa73735,
  });

  revalidateTravelPaths();
  redirect("/travel");
}
