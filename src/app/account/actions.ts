"use server";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseUrl, supabaseKey } from "@/lib/supabase/config";
import { validNickname } from "@/lib/membership";
import { isAdminUser } from "@/lib/admin";
export async function changeNickname(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user) redirect("/login");
  const nickname = String(form.get("nickname") ?? "").trim();
  if (!validNickname(nickname, isAdminUser(user))) redirect("/account?error=nickname");
  const { error } = await supabase.rpc("change_nickname_v1", { p_nickname: nickname });
  if (error) redirect(`/account?error=${error.code === "23505" ? "taken" : "save"}`);
  updateTag("drinks");
  // Refresh metadata for forms that also use the Auth display name.
  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  redirect("/account?status=saved");
}
export async function withdrawAccount(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!supabase || !user?.email) redirect("/login");
  if (isAdminUser(user)) redirect("/account?error=admin");
  if (form.get("withdraw_confirm") !== "탈퇴" || !form.get("current_password")) redirect("/account?error=confirm");
  if (!supabaseUrl || !supabaseKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) redirect("/account?error=config");
  let failure: string | null = null;
  try {
    const verifier = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password: String(form.get("current_password")), options: { captchaToken: String(form.get("captcha_token") ?? "") || undefined } });
    if (error || data.user?.id !== user.id) failure = error?.status === 429 ? "limited" : "current";
    else {
      await verifier.auth.signOut({ scope: "local" });
      const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000), cache: "no-store" }) } });
      // Preserve photos attached to public posts; remove unused uploads only.
      const used = new Set<string>();
      for (let start = 0; ; start += 500) {
        const { data: posts, error: postsError } = await admin.from("drink_posts").select("images").eq("author_id", user.id).order("id").range(start, start + 499);
        if (postsError || !posts) throw Error("posts unavailable");
        posts.forEach(post => (post.images as string[]).forEach(path => used.add(path)));
        if (posts.length < 500) break;
      }
      let offset = 0;
      while (true) {
        const { data: files, error: listError } = await admin.storage.from("drink-photos").list(user.id, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
        if (listError || !files) throw Error("photos unavailable");
        const unused = files.map(file => `${user.id}/${file.name}`).filter(path => !used.has(path));
        if (unused.length) { const { error: removeError } = await admin.storage.from("drink-photos").remove(unused); if (removeError) throw Error("photos unavailable"); }
        offset += files.length - unused.length;
        if (files.length < 100) break;
      }
      const { error: profilePhotoError } = await admin.storage.from("profile-photos").remove([`${user.id}/avatar.webp`]);
      if (profilePhotoError) throw Error("profile photo unavailable");
      const { error: closeError } = await admin.rpc("close_member_account_v1", { p_user_id: user.id });
      if (closeError) throw Error("withdraw failed");
      try { await supabase.auth.signOut({ scope: "global" }); } catch { /* Auth user and sessions were already removed. */ }
    }
  } catch { failure = "save"; }
  if (failure) redirect(`/account?error=${failure}`);
  updateTag("drinks");
  revalidatePath("/", "layout");
  redirect("/login?status=withdrawn");
}
