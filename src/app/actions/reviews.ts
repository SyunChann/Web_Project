"use server";

import { randomUUID } from "crypto";
import type { User } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const thumbnailBucket = "review-thumbnails";
const maxThumbnailSize = 5 * 1024 * 1024;

type ReviewPayload = {
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  youtube_url: string;
  rating: number;
  watched_at: string;
  thumbnail: string | null;
  thumbnail_alt: string;
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

function readReviewPayload(formData: FormData): ReviewPayload {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "movie") as ReviewPayload["type"];
  const genre = String(formData.get("genre") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const watchedAt = String(formData.get("watched_at") ?? "").trim();
  const thumbnail = String(formData.get("thumbnail") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const review = String(formData.get("review") ?? "").trim();

  if (!title || !watchedAt || !summary || !review) {
    throw new Error("필수 리뷰 정보를 입력해 주세요.");
  }

  if (!["movie", "anime", "game", "drama"].includes(type)) {
    throw new Error("올바른 카테고리를 선택해 주세요.");
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("별점은 0부터 5 사이로 입력해 주세요.");
  }

  return {
    title,
    type,
    genre,
    youtube_url: youtubeUrl,
    rating,
    watched_at: watchedAt,
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

export async function createReview(formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  const payload = readReviewPayload(formData);
  const requestedId = String(formData.get("id") ?? "").trim();
  const id = normalizeSlug(requestedId || payload.title);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const { error } = await supabase.from("reviews").insert({
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    author_id: user.id,
    author_name: getAuthorName(user),
    id,
  });

  if (error) {
    throw new Error(error.message);
  }

  updateTag("reviews");
  revalidatePath("/");
  revalidatePath("/reviews");
  redirect(`/reviews/${id}`);
}

export async function updateReview(id: string, formData: FormData) {
  const { supabase } = await requireSupabaseUser();
  const payload = readReviewPayload(formData);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const { error } = await supabase
    .from("reviews")
    .update({
      ...payload,
      thumbnail: uploadedThumbnail ?? payload.thumbnail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  updateTag("reviews");
  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath(`/reviews/${id}`);
  redirect(`/reviews/${id}`);
}

export async function deleteReview(id: string) {
  const { supabase } = await requireSupabaseUser();

  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  updateTag("reviews");
  revalidatePath("/");
  revalidatePath("/reviews");
  redirect("/reviews");
}
