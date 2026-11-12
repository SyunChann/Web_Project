import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PasswordPage } from "@/components/PasswordPage";
import { PasswordForm } from "@/components/PasswordForm";
import { resetPassword } from "@/app/actions/password";
import { parseRecoveryCredential, passwordCompletionCookieName, recoveryCookieName } from "@/lib/passwordRecovery";

export const metadata: Metadata = { title: "비밀번호 재설정 | 취향보관소", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const cookieStore = await cookies();
  if (!parseRecoveryCredential(cookieStore.get(recoveryCookieName)?.value)) {
    if (cookieStore.get(passwordCompletionCookieName)?.value === "complete") redirect("/password-complete");
    redirect("/forgot-password?error=expired");
  }
  const { error } = await searchParams;
  return <PasswordPage title="비밀번호 재설정" description="새 비밀번호를 입력해 주세요. 저장하면 로그인 세션이 종료되며 새 비밀번호로 다시 로그인해야 합니다." error={error}>
    <PasswordForm action={resetPassword} />
  </PasswordPage>;
}
