"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPendingInviteCookieOptions,
  normalizeInviteCode,
  pendingInviteCookieName,
} from "@/lib/pendingInvite";

function signupRedirect(error: string, inviteCode?: string): never {
  const params = new URLSearchParams({ error });

  if (inviteCode) {
    params.set("invite", inviteCode);
  }

  redirect(`/signup?${params.toString()}`);
}

function getSignupErrorCode(errorMessage: string) {
  const message = errorMessage.toLowerCase();

  if (
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already")
  ) {
    return "email_exists";
  }

  if (
    message.includes("rate limit") ||
    message.includes("security purposes") ||
    message.includes("after")
  ) {
    return "signup_limited";
  }

  return "signup_failed";
}

export async function signUpWithInvite(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = normalizeInviteCode(
    String(formData.get("invite_code") ?? ""),
  );

  if (!displayName || !email || !password || !inviteCode) {
    signupRedirect("missing", inviteCode);
  }

  if (displayName.length > 10) {
    signupRedirect("name_too_long", inviteCode);
  }

  if (password.length < 6) {
    signupRedirect("weak_password", inviteCode);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    signupRedirect("config", inviteCode);
  }

  const { data: isValidInvite, error: validateError } = await supabase.rpc(
    "validate_invite_code",
    {
      invite_code: inviteCode,
    },
  );

  if (validateError || !isValidInvite) {
    signupRedirect("invalid_invite", inviteCode);
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (signUpError) {
    console.error("[signup] failed", signUpError.message);
    signupRedirect(getSignupErrorCode(signUpError.message), inviteCode);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    const cookieStore = await cookies();

    cookieStore.set(
      pendingInviteCookieName,
      inviteCode,
      getPendingInviteCookieOptions(),
    );

    redirect(`/signup?status=confirm_email&invite=${inviteCode}`);
  }

  const { error: claimError } = await supabase.rpc("claim_invite_code", {
    invite_code: inviteCode,
  });

  if (claimError) {
    signupRedirect("claim_failed", inviteCode);
  }

  redirect("/reviews");
}
