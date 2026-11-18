"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { drinkAuthorName, drinkBucket, readDrinkPayload, type DrinkSaveResult } from "@/lib/drinks";

export async function saveDrinkPost(id: string | null, data: FormData): Promise<DrinkSaveResult> {
  const client = await createSupabaseServerClient();
  if (!client) return { error: "로그인 설정을 확인해 주세요." };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "로그인 후 다시 작성해 주세요." };
  let payload;
  try { payload = readDrinkPayload(data, user.id); }
  catch (error) { return { error: error instanceof Error ? error.message : "입력 내용을 확인해 주세요." }; }
  const postId = id ?? randomUUID();
  let oldImages: string[] = [];
  if (id) {
    const { data: old, error } = await client.from("drink_posts").select("images,author_id").eq("id", id).maybeSingle();
    if (error || !old || old.author_id !== user.id) return { error: "본인이 작성한 글만 수정할 수 있습니다." };
    oldImages = old.images;
  }
  const authorName = drinkAuthorName(user);
  const result = id
    ? await client.from("drink_posts").update({ ...payload, author_name: authorName, updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", user.id).select("id").maybeSingle()
    : await client.from("drink_posts").insert({ ...payload, id: postId, author_id: user.id, author_name: authorName }).select("id").single();
  if (result.error || !result.data) return { error: "글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  updateTag("drinks");
  const removed = oldImages.filter((path) => !payload.images.includes(path));
  if (removed.length) { try { await client.storage.from(drinkBucket).remove(removed); } catch { /* The post is saved; photo cleanup must not report a failed save. */ } }
  revalidatePath("/drinks"); revalidatePath(`/drinks/${postId}`); revalidatePath("/");
  return { id: postId };
}
export async function deleteDrinkPost(id: string): Promise<DrinkSaveResult> {
  const client = await createSupabaseServerClient();
  if (!client) return { error: "로그인이 필요합니다." };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  const { data: post, error } = await client.from("drink_posts").delete().eq("id", id).eq("author_id", user.id).select("images").maybeSingle();
  if (error || !post) return { error: "글을 삭제하지 못했습니다. 본인 글인지 확인해 주세요." };
  updateTag("drinks");
  if (post.images.length) { try { await client.storage.from(drinkBucket).remove(post.images); } catch { /* Deletion has already succeeded. */ } }
  revalidatePath("/drinks"); revalidatePath(`/drinks/${id}`); revalidatePath("/");
  return { id };
}
