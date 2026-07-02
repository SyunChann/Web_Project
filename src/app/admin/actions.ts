"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function generateInviteCode() {
  const value = randomBytes(4).toString("hex").toUpperCase();

  return `INV-${value.slice(0, 4)}-${value.slice(4)}`;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=config");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/");
  }

  return { supabase, user };
}

export async function createInviteCode(formData: FormData) {
  const { supabase, user } = await requireUser();
  const requestedCode = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const maxUses = Math.max(1, Number(formData.get("max_uses") ?? 1) || 1);
  const expiresInDays = Math.max(
    1,
    Number(formData.get("expires_in_days") ?? 7) || 7,
  );
  const code = requestedCode || generateInviteCode();
  const expiresAt = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("invite_codes").insert({
    code,
    max_uses: maxUses,
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  redirect(`/admin?created=${encodeURIComponent(code)}`);
}

export async function revokeInviteCode(id: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("invite_codes")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
}
