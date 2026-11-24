import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";

export const thumbnailBucket = "review-thumbnails";
export const maxThumbnailBytes = 5 * 1024 * 1024;
export const thumbnailTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

// Files go to Storage, never through the Server Action request body.
export async function uploadFormThumbnail(data: FormData): Promise<FormData> {
  const file = data.get("thumbnail_file");
  if (!(file instanceof File) || file.size === 0) { data.delete("thumbnail_file"); return data; }
  const extension = Object.hasOwn(thumbnailTypes, file.type) ? thumbnailTypes[file.type] : null;
  if (!extension || file.size > maxThumbnailBytes) throw Error("썸네일은 5MB 이하의 JPG/PNG/WebP/GIF로 선택해 주세요.");
  if (!supabaseUrl || !supabaseKey) throw Error("업로드 설정을 확인해 주세요.");
  const client = createBrowserClient(supabaseUrl, supabaseKey);
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw Error("로그인 후 다시 시도해 주세요.");
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(thumbnailBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw Error("사진을 업로드하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  data.set("uploaded_thumbnail", client.storage.from(thumbnailBucket).getPublicUrl(path).data.publicUrl);
  data.delete("thumbnail_file");
  return data;
}
