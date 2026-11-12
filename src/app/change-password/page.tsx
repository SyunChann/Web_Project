import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { passwordCompletionCookieName } from "@/lib/passwordRecovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordPage } from "@/components/PasswordPage";
import { PasswordForm } from "@/components/PasswordForm";
import { changePassword } from "@/app/actions/password";

export const metadata: Metadata = { title: "비밀번호 변경 | 취향보관소", robots: { index: false, follow: false } };

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    if ((await cookies()).get(passwordCompletionCookieName)?.value === "complete") redirect("/password-complete");
    redirect("/login");
  }
  const { error } = await searchParams;
  return <PasswordPage title="비밀번호 변경" description="현재 비밀번호를 확인한 뒤 변경합니다. 저장 후 로그인 세션이 종료되므로 새 비밀번호로 다시 로그인해 주세요." error={error}>
    <PasswordForm action={changePassword} currentRequired />
    <Link href="/forgot-password" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#be4b49]">현재 비밀번호를 잊으셨나요?</Link>
  </PasswordPage>;
}
