import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/config";

// Validate both the reference and Storage metadata; never fetch a user-supplied URL.
export async function readUploadedThumbnail(client: SupabaseClient, data: FormData, ownerId: string): Promise<string | null> {
  const reference = data.get("uploaded_thumbnail");
  if (reference === null) return null;
  if (typeof reference !== "string" || !supabaseUrl) throw Error("사진 정보를 확인해 주세요.");
  const base = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/review-thumbnails/${ownerId}/`;
  if (!reference.startsWith(base)) throw Error("본인이 업로드한 사진만 첨부할 수 있습니다.");
  const name = reference.slice(base.length);
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name)) throw Error("사진 경로를 확인해 주세요.");
  const { data: files, error } = await client.storage.from("review-thumbnails").list(ownerId, { search: name, limit: 2 });
  const file = files?.find((item) => item.name === name);
  const size = Number(file?.metadata?.size);
  if (error || !file || !Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024
    || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.metadata?.mimetype ?? "")) throw Error("업로드한 사진을 확인하지 못했습니다.");
  return reference;
}
