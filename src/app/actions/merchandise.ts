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

type MerchandiseReviewPayload = {
  title: string;
  category: "electronics" | "fashion" | "cosmetics" | "supplements" | "lifestyle" | "sports" | "other";
  tags: string[];
  rating: number;
  purchased_at: string;
  thumbnail: string | null;
  thumbnail_alt: string;
  summary: string;
  review: string;
  product_id?: string | null;
  product_name?: string | null;
  current_lowest_price?: number | null;
  purchase_url?: string | null;
  author_id?: string | null;
  author_name?: string | null;
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

function readMerchandiseReviewPayload(formData: FormData): MerchandiseReviewPayload {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") as MerchandiseReviewPayload["category"];
  const tags = String(formData.get("tags") ?? "")  
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const rating = Number(formData.get("rating") ?? 0);
  const purchasedAtRaw = String(formData.get("purchased_at") ?? "").trim();
  if (!purchasedAtRaw) {
    throw new Error("구매일(혹은 사용 시작일)을 반드시 입력해 주세요.");
  }
  const purchasedAt = new Date(purchasedAtRaw).toISOString();
  const thumbnail = String(formData.get("thumbnail") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const review = String(formData.get("review") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim();
  const productName = String(formData.get("productName") ?? "").trim();
  const currentLowestPrice = Number(formData.get("currentLowestPrice") ?? 0);
  const purchaseUrl = String(formData.get("purchaseUrl") ?? "").trim();
  
  if (!title || !summary || !review) {
    throw new Error("필수 리뷰 정보를 입력해 주세요.");
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error("별점은 0부터 5 사이로 입력해 주세요.");
  }

  return {
    title,
    category,
    tags,
    rating,
    purchased_at: purchasedAt,
    thumbnail: thumbnail || null,
    thumbnail_alt: `${title} 리뷰 썸네일`,
    summary,
    review,
    product_id: productId,
    product_name: productName,
    current_lowest_price: currentLowestPrice,
    purchase_url: purchaseUrl
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
    .from("merchandise_reviews")
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

function revalidateMerchandiseReviewPaths() {
  updateTag("merchandise");
  revalidatePath("/");
  revalidatePath("/merchandise");
}

function isMissingScopeColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.toLowerCase().includes("scope") &&
      error.message.toLowerCase().includes("column"),
  );
}

export async function createMerchandiseReview(formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  const payload = readMerchandiseReviewPayload(formData);
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

  const { error } = await supabase.from("merchandise_reviews").insert(insertPayload);

  if (error && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase.from("merchandise_reviews").insert({
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
    title: "상품 리뷰 작성",
    description: "새 리뷰가 작성되었습니다.",
  });

  revalidateMerchandiseReviewPaths();
  redirect(`/merchandise/${id}`);
}

export async function updateMerchandiseReview(id: string, formData: FormData) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);
  const payload = readMerchandiseReviewPayload(formData);
  const uploadedThumbnail = await uploadThumbnail(supabase, id, formData);

  const updatePayload = {
    ...payload,
    thumbnail: uploadedThumbnail ?? payload.thumbnail,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("merchandise_reviews")
    .update(updatePayload)
    .eq("id", id);

  if (error && isMissingScopeColumnError(error)) {
    const { error: legacyError } = await supabase
      .from("merchandise_reviews")
      .update({
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
    title: "상품리뷰 수정",
    description: "리뷰가 수정되었습니다.",
    color: 0x52616b,
  });

  revalidateMerchandiseReviewPaths();
  revalidatePath(`/merchandise/${id}`);
  redirect(`/merchandise/${id}`);
}

export async function deleteMerchandiseReview(id: string) {
  const { supabase, user } = await requireSupabaseUser();
  await assertCanManageReview(supabase, user, id);

  const { error } = await supabase.from("merchandise_reviews").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await notifyDiscord({
    title: "리뷰 삭제",
    description: "리뷰가 삭제되었습니다.",
    color: 0xa73735,
  });

  revalidateMerchandiseReviewPaths();
  redirect("/merchandise");
}
