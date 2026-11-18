"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim(), password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=config");
  const captchaToken = String(formData.get("captcha_token") ?? "");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) redirect("/login?error=captcha");
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
  if (error) redirect(`/login?error=${error.code === "email_not_confirmed" ? "confirm_email" : error.status === 429 ? "limited" : "invalid"}`);
  (await cookies()).delete("pending_invite_code");
  redirect("/?status=login");
}
