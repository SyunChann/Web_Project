"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getPendingInviteCodeFromMetadata,
  pendingInviteCookieName,
  pendingInviteMetadataKey,
} from "@/lib/pendingInvite";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=config");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const pendingInviteCode =
    cookieStore.get(pendingInviteCookieName)?.value ||
    getPendingInviteCodeFromMetadata(user?.user_metadata);

  if (pendingInviteCode) {
    const { error: claimError } = await supabase.rpc("claim_invite_code", {
      invite_code: pendingInviteCode,
    });

    if (!claimError) {
      cookieStore.delete(pendingInviteCookieName);
      await supabase.auth.updateUser({
        data: {
          [pendingInviteMetadataKey]: null,
        },
      });
    }
  }

  redirect("/?status=login");
}
