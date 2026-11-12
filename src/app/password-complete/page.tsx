import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { passwordCompletionCookieName } from "@/lib/passwordRecovery";

export const metadata: Metadata = { title: "비밀번호 변경 완료 | 취향보관소", robots: { index: false, follow: false } };

export default async function PasswordCompletePage() {
  if ((await cookies()).get(passwordCompletionCookieName)?.value !== "complete") redirect("/login");
  return <main className="min-h-screen px-6 py-8 sm:px-10">
    <section className="mx-auto w-full max-w-md rounded-lg border border-[#ddd6cc] bg-white p-6 text-center shadow-sm sm:p-8">
      <CircleCheck className="mx-auto text-[#2f7f7a]" size={48} aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-bold">비밀번호가 변경되었습니다</h1>
      <p role="status" className="mt-4 leading-7 text-[#52616b]">새 비밀번호가 정상적으로 저장되었습니다.<br />이제 새 비밀번호로 로그인해 주세요.</p>
      <Link href="/login?status=password_changed" className="mt-6 flex min-h-12 items-center justify-center rounded-md bg-[#be4b49] px-5 py-3 font-bold text-white hover:bg-[#a83f3d]">확인 · 로그인하기</Link>
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#52616b]">홈으로</Link>
    </section>
  </main>;
}
