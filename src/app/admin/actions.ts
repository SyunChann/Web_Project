"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { notifyDiscord } from "@/lib/discord";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const maxInviteUses = 50;
const maxInviteDays = 90;
const inviteCodePattern = /^[A-Z0-9_-]{4,32}$/;

function generateInviteCode() {
  const value = randomBytes(4).toString("hex").toUpperCase();

  return `INV-${value.slice(0, 4)}-${value.slice(4)}`;
}

function clampNumber(value: FormDataEntryValue | null, fallback: number, max: number) {
  const numberValue = Number(value ?? fallback);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(1, Math.floor(numberValue)));
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
  const maxUses = clampNumber(formData.get("max_uses"), 1, maxInviteUses);
  const expiresInDays = clampNumber(
    formData.get("expires_in_days"),
    7,
    maxInviteDays,
  );
  const code = requestedCode || generateInviteCode();

  if (!inviteCodePattern.test(code)) {
    throw new Error("초대 코드는 영문 대문자, 숫자, -, _ 조합으로 4~32자만 사용할 수 있습니다.");
  }

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

  await notifyDiscord({
    title: "초대 코드 생성",
    description: "관리자 페이지에서 새 초대 코드가 생성되었습니다.",
  });

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

  await notifyDiscord({
    title: "초대 코드 폐기",
    description: "관리자 페이지에서 초대 코드가 폐기되었습니다.",
    color: 0x52616b,
  });

  revalidatePath("/admin");
}
