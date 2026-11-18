"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/siteUrl";
import { validEmail, validNickname, signupError, consentVersion } from "@/lib/membership";
async function cooldown() {
  const store = await cookies();
  if (Date.now() - Number(store.get("signup_mail_requested")?.value ?? 0) < 60000) return false;
  store.set("signup_mail_requested", String(Date.now()), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 });
  return true;
}
export async function signUp(form: FormData) {
  const nickname = String(form.get("nickname") ?? "").trim(), email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!validNickname(nickname)) redirect("/signup?error=nickname");
  if (!validEmail(email)) redirect("/signup?error=email");
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) redirect("/signup?error=password");
  if (password !== String(form.get("confirm_password") ?? "")) redirect("/signup?error=mismatch");
  if (form.get("terms") !== "on" || form.get("privacy") !== "on") redirect("/signup?error=consent");
  const captchaToken = String(form.get("captcha_token") ?? "");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) redirect("/signup?error=captcha");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/signup?error=config");
  const available = await supabase.rpc("nickname_available_v1", { p_nickname: nickname });
  if (available.error) redirect("/signup?error=unavailable");
  if (!available.data) redirect("/signup?error=taken");
  if (!await cooldown()) redirect("/signup?error=limited");
  let failure: string | null = null;
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`, captchaToken: captchaToken || undefined,
      data: { nickname, display_name: nickname, terms_version: consentVersion, privacy_version: consentVersion },
    } });
    if (error) failure = signupError(error);
    if (data.session) await supabase.auth.signOut({ scope: "local" });
  } catch { failure = "send"; }
  if (failure) redirect(`/signup?error=${failure}`);
  redirect("/signup?status=confirm_email");
}
export async function resendSignupEmail(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  if (!validEmail(email)) redirect("/signup?error=email");
  const captchaToken = String(form.get("captcha_token") ?? "");
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) redirect("/signup?error=captcha");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/signup?error=config");
  if (!await cooldown()) redirect("/signup?error=limited");
  let failure: string | null = null;
  try {
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm`, captchaToken: captchaToken || undefined } });
    if (error && !["user_not_found", "email_exists"].includes(error.code ?? "")) failure = signupError(error);
  } catch { failure = "send"; }
  if (failure) redirect(`/signup?error=${failure}`);
  redirect("/signup?status=resent");
}
