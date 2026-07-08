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

type RestaurantReviewPayload = {
  scope: "domestic" | "overseas";
  title: string;
  store_name: string;
  category: "korean" | "japanese" | "chinese" | "western" | "asian" | "cafe" | "other";
  companion: "solo" | "date" | "friends" | "family" | "business" | "other";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  map_url: string | null;
  will_revisit: string;
  has_parking: string | null;
  rating: number;
  visited_at: string;
  thumbnail: string | null;
  thumbnail_alt: string | null;
  summary: string;
  review: string;
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

function readRestaurantReviewPayload(formData: FormData): RestaurantReviewPayload {
  const scope = String(formData.get("scope") ?? "domestic") as RestaurantReviewPayload["scope"];
  const isOverseasScope = scope === "overseas";
  const title = String(formData.get("title") ?? "").trim();
  const storeName = String(formData.get("storeName") ?? "").trim();
  const category = String(
    formData.get("category") ?? (isOverseasScope ? "other" : ""),
  ) as RestaurantReviewPayload["category"];
  const companion = String(
    formData.get("companion") ?? (isOverseasScope ? "other" : ""),
  ) as RestaurantReviewPayload["companion"];
  const address = String(formData.get("address") ?? "");
  const latitude = Number(formData.get("latitude") ?? 0);
  const longitude = Number(formData.get("longitude") ?? 0);
  const placeId = String(formData.get("placeId") ?? "");
  const mapUrl = String(formData.get("mapUrl") ?? "");
  const willRevisit = String(
    formData.get("willRevisit") ?? (isOverseasScope ? "false" : ""),
  );
  const hasParking = String(
    formData.get("hasParking") ?? (isOverseasScope ? "false" : ""),
  );
  const rating = Number(formData.get("rating") ?? 0);
  const visitedAt =
    String(formData.get("visitedAt") ?? "").trim() ||
    (isOverseasScope ? new Date().toISOString().slice(0, 10) : "");
  const thumbnail = String(formData.get("thumbnail") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const review = String(formData.get("review") ?? "").trim();

  if (!title || !summary || !review) {
    throw new Error("필수 리뷰 정보를 입력해 주세요.");
  }

  if (!["domestic", "overseas"].includes(scope)) {
    throw new Error("올바른 맛집리뷰 유형을 선택해 주세요.");
  }

  if (!["korean", "japanese", "chinese", "western", "asian", "cafe", "other"].includes(category)) {
    throw new Error("올바른 카테고리를 선택해 주세요.");
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("별점은 0부터 5 사이로 입력해 주세요.");
  }

  return {
    scope,
    title,
    store_name: storeName,
    category,
    companion,
    address,
    latitude,
    longitude,
    place_id: placeId,
    map_url: mapUrl,
    will_revisit: willRevisit,
    has_parking: hasParking,
    rating,
    visited_at: visitedAt,
    thumbnail: thumbnail || null,
    thumbnail_alt: `${title} 리뷰 썸네일`,
    summary,
    review,
  };
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
    .from("restaurant_reviews")
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

function revalidateRestaurantReviewPaths() {
  updateTag("restaurants");
  revalidatePath("/");
  revalidatePath("/restaurants");
  revalidatePath("/restaurants/items");
  revalidatePath("/restaurants/map");
}

function isMissingScopeColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.toLowerCase().includes("scope") &&
      error.message.toLowerCase().includes("column"),
  );
}

function withoutScope(payload: RestaurantReviewPayload) {
  const legacyPayload = { ...payload };
  delete (legacyPayload as Partial<RestaurantReviewPayload>).scope;

  return legacyPayload as Omit<RestaurantReviewPayload, "scope">;
}

export async function createRestaurantReview(formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  const payload = readRestaurantReviewPayload(formData);
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

  const { error } = await supabase.from("restaurant_reviews").insert(insertPayload);

  if (error && payload.scope === "domestic" && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase.from("restaurant_reviews").insert({
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
    title: "맛집 리뷰 작성",
    description: "새 리뷰가 작성되었습니다.",
  });

  revalidateRestaurantReviewPaths();
  redirect(`/restaurants/${id}`);
}

export async function updateRestaurantReview(id: string, formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);
  const payload = readRestaurantReviewPayload(formData);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const updatePayload = {
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("restaurant_reviews")
    .update(updatePayload)
    .eq("id", id);

  if (error && payload.scope === "domestic" && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase
      .from("restaurant_reviews")
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

  await notifyDiscord({
    title: "맛집리뷰 수정",
    description: "리뷰가 수정되었습니다.",
    color: 0x52616b,
  });

  revalidateRestaurantReviewPaths();
  revalidatePath(`/restaurants/${id}`);
  redirect(`/restaurants/${id}`);
}

export async function deleteRestaurantReview(id: string) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);

  const { error } = await supabase.from("restaurant_reviews").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "리뷰 삭제",
    description: "리뷰가 삭제되었습니다.",
    color: 0xa73735,
  });

  revalidateRestaurantReviewPaths();
  redirect("/restaurants");
}
