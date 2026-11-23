"use server";
import { redirect } from "next/navigation";
import { loginHref, safeReturnTo } from "@/lib/returnTo";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function signIn(formData: FormData) {
  const next = safeReturnTo(formData.get("next"));
  const fail = (error: string): never => redirect(`${loginHref(next)}&error=${error}`);
  const email = String(formData.get("email") ?? "").trim(), password = String(formData.get("password") ?? "");
  if (!email || !password) fail("missing");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("config");
  const captchaToken = String(formData.get("captcha_token") ?? "");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) fail("captcha");
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
  if (error) fail(error.code === "email_not_confirmed" ? "confirm_email" : error.status === 429 ? "limited" : "invalid");
  (await cookies()).delete("pending_invite_code");
  redirect(next === "/" ? "/?status=login" : next);
}
