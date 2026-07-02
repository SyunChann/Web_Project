"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function signupRedirect(error: string, inviteCode?: string): never {
  const params = new URLSearchParams({ error });

  if (inviteCode) {
    params.set("invite", inviteCode);
  }

  redirect(`/signup?${params.toString()}`);
}

export async function signUpWithInvite(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "")
    .trim()
    .toUpperCase();

  if (!displayName || !email || !password || !inviteCode) {
    signupRedirect("missing", inviteCode);
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
    signupRedirect("signup_failed", inviteCode);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect("/login?error=confirm_email");
  }

  const { error: claimError } = await supabase.rpc("claim_invite_code", {
    invite_code: inviteCode,
  });

  if (claimError) {
    signupRedirect("claim_failed", inviteCode);
  }

  redirect("/reviews");
}
