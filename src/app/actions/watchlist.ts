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

type WatchlistPayload = {
  title: string;
  type: "movie" | "anime" | "game" | "drama";
  genre: string[];
  status: "waiting" | "watching" | "paused";
  release_label: string;
  release_precision: "day" | "month" | "year" | "tba";
  release_year: number | null;
  release_month: number | null;
  release_day: number | null;
  thumbnail: string | null;
  thumbnail_alt: string;
  reason: string;
  youtube_url: string;
};

function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `watchlist-${Date.now()}`;
}

function normalizeFileName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase() || "png";
  const cleanExtension = extension.replace(/[^a-z0-9]/g, "") || "png";

  return `${randomUUID()}.${cleanExtension}`;
}

function readWatchlistPayload(formData: FormData): WatchlistPayload {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "movie") as WatchlistPayload["type"];
  const genre = String(formData.get("genre") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const status = String(formData.get("status") ?? "waiting") as WatchlistPayload["status"];
  const releasePrecision = String(formData.get("releasePrecision") ?? "tba") as WatchlistPayload["release_precision"];
  const releaseYear = Number(formData.get("releaseYear"));
  const releaseMonth = Number(formData.get("releaseMonth"));
  const releaseDay = Number(formData.get("releaseDay"));
  const thumbnail = String(formData.get("thumbnail") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();

  if (!title || !reason) {
    throw new Error("필수 기대작 정보를 입력해 주세요.");
  }

  if (!["movie", "anime", "game", "drama"].includes(type)) {
    throw new Error("올바른 카테고리를 선택해 주세요.");
  }

  if (!["waiting", "watching", "paused"].includes(status)) {
    throw new Error("올바른 기대 상태를 선택해 주세요.");
  }

  if (!["day", "month", "year", "tba"].includes(releasePrecision)) {
    throw new Error("공개 일정 정확도를 확인해 주세요.");
  }

  const hasYear = Number.isInteger(releaseYear) && releaseYear >= 1900 && releaseYear <= 2100;
  const hasMonth = Number.isInteger(releaseMonth) && releaseMonth >= 1 && releaseMonth <= 12;
  const hasDay = Number.isInteger(releaseDay) && releaseDay >= 1 && releaseDay <= 31;
  if ((releasePrecision === "day" && (!hasYear || !hasMonth || !hasDay)) || (releasePrecision === "month" && (!hasYear || !hasMonth)) || (releasePrecision === "year" && !hasYear)) {
    throw new Error("선택한 공개 일정에 맞는 날짜를 입력해 주세요.");
  }

  const releaseLabel = releasePrecision === "day" ? `${releaseYear}. ${releaseMonth}. ${releaseDay}. 공개` : releasePrecision === "month" ? `${releaseYear}년 ${releaseMonth}월 예정` : releasePrecision === "year" ? `${releaseYear}년 예정` : "공개일 미정";

  return {
    title,
    type,
    genre,
    status,
    release_label: releaseLabel,
    release_precision: releasePrecision,
    release_year: hasYear ? releaseYear : null,
    release_month: releasePrecision === "day" || releasePrecision === "month" ? releaseMonth : null,
    release_day: releasePrecision === "day" ? releaseDay : null,
    thumbnail: thumbnail || null,
    thumbnail_alt: `${title} 기대작 썸네일`,
    reason,
    youtube_url: youtubeUrl,
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

async function assertCanManageWatchlistItem(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  user: User,
  id: string,
) {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("author_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("기대작을 찾을 수 없습니다.");
  }

  if (!canManageContent(user, data.author_id)) {
    throw new Error("이 기대작을 수정하거나 삭제할 권한이 없습니다.");
  }
}

async function uploadThumbnail(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  itemId: string,
  formData: FormData,
) {
  const file = readThumbnailFile(formData);

  if (!file) {
    return null;
  }

  const path = `${itemId}/${normalizeFileName(file.name)}`;
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

export async function createWatchlistItem(formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  const payload = readWatchlistPayload(formData);
  const requestedId = String(formData.get("id") ?? "").trim();
  const id = normalizeSlug(requestedId || payload.title);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const { error } = await supabase.from("watchlist_items").insert({
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    author_id: user.id,
    author_name: getAuthorName(user),
    id,
  });

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "기대작 작성",
    description: "새 기대작이 작성되었습니다.",
    color: 0x2a9d90,
  });

  updateTag("watchlist");
  revalidatePath("/");
  revalidatePath("/watchlist");
  revalidatePath("/watchlist/items");
  redirect(`/watchlist/${id}`);
}

export async function updateWatchlistItem(id: string, formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageWatchlistItem(supabase, user, id);
  const payload = readWatchlistPayload(formData);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const { error } = await supabase
    .from("watchlist_items")
    .update({
      ...payload,
      thumbnail: uploadedThumbnail ?? payload.thumbnail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "기대작 수정",
    description: "기대작이 수정되었습니다.",
    color: 0x52616b,
  });

  updateTag("watchlist");
  revalidatePath("/");
  revalidatePath("/watchlist");
  revalidatePath("/watchlist/items");
  revalidatePath(`/watchlist/${id}`);
  redirect(`/watchlist/${id}`);
}

export async function deleteWatchlistItem(id: string) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageWatchlistItem(supabase, user, id);

  const { error } = await supabase.from("watchlist_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "기대작 삭제",
    description: "기대작이 삭제되었습니다.",
    color: 0xa73735,
  });

  updateTag("watchlist");
  revalidatePath("/");
  revalidatePath("/watchlist");
  revalidatePath("/watchlist/items");
  redirect("/watchlist/items");
}
