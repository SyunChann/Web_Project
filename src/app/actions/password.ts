"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/siteUrl";
import { parseRecoveryCredential, recoveryCookieName, validateNewPassword } from "@/lib/passwordRecovery";

export async function requestPasswordReset(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) redirect("/forgot-password?error=email");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/forgot-password?error=config");
  let failure: string | null = null;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/recovery`,
    });
    if (error) {
      // Do not disclose whether an address belongs to an account.
      if (error.status === 429) failure = "limited";
      else if (error.code !== "user_not_found") failure = "send";
    }
  } catch {
    failure = "send";
  }
  if (failure) redirect(`/forgot-password?error=${failure}`);
  redirect("/forgot-password?status=sent");
}

export async function resetPassword(form: FormData) {
  const password = String(form.get("password") ?? "");
  const invalid = validateNewPassword(password, String(form.get("confirm_password") ?? ""));
  if (invalid) redirect(`/reset-password?error=${invalid}`);
  const cookieStore = await cookies();
  const credential = parseRecoveryCredential(cookieStore.get(recoveryCookieName)?.value);
  if (!credential) redirect("/forgot-password?error=expired");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/reset-password?error=config");

  let failure: string | null = null;
  try {
    const verified = credential.type === "token_hash"
      ? await supabase.auth.verifyOtp({ token_hash: credential.value, type: "recovery" })
      : await supabase.auth.exchangeCodeForSession(credential.value);
    if (verified.error || !verified.data.session) failure = "expired";
    else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) failure = error.code === "same_password" ? "same" : "save";
      // End recovery authentication even if the password policy rejects the update.
      await supabase.auth.signOut({ scope: error ? "local" : "global" });
    }
  } catch {
    failure = "save";
  }
  cookieStore.delete(recoveryCookieName);
  if (failure) redirect(`/forgot-password?error=${failure}`);
  redirect("/login?status=password_reset");
}

export async function changePassword(form: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/change-password?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const current = String(form.get("current_password") ?? "");
  const password = String(form.get("password") ?? "");
  const invalid = validateNewPassword(password, String(form.get("confirm_password") ?? ""));
  if (invalid) redirect(`/change-password?error=${invalid}`);
  if (!current) redirect("/change-password?error=current");
  if (password === current) redirect("/change-password?error=same");
  if (!supabaseUrl || !supabaseKey) redirect("/change-password?error=config");

  let failure: string | null = null;
  try {
    // Verify separately so a failed check cannot replace the current browser session.
    const verifier = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
    if (error || data.user?.id !== user.id) failure = error?.status === 429 ? "limited" : "current";
    else {
      await verifier.auth.signOut({ scope: "local" });
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) failure = updateError.code === "same_password" ? "same" : "save";
      else await supabase.auth.signOut({ scope: "global" });
    }
  } catch {
    failure = "save";
  }
  if (failure) redirect(`/change-password?error=${failure}`);
  (await cookies()).delete(recoveryCookieName);
  redirect("/login?status=password_changed");
}
