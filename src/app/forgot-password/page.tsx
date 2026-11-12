import type { Metadata } from "next";
import { PasswordPage } from "@/components/PasswordPage";
import { PasswordSubmit } from "@/components/PasswordForm";
import { requestPasswordReset } from "@/app/actions/password";

export const metadata: Metadata = { title: "비밀번호 찾기 | 취향보관소", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;
  return <PasswordPage title="비밀번호 찾기" description="가입할 때 사용한 이메일을 입력해 주세요. 새 비밀번호를 설정할 수 있는 링크를 보내드립니다." error={error}>
    {status === "sent" ? <p role="status" className="mt-5 rounded-md bg-[#e4f4f2] p-4 text-sm leading-6 text-[#276a66]">등록된 이메일이면 재설정 링크가 발송됩니다. 스팸함도 확인해 주세요. 기본 이메일 링크는 요청한 기기의 같은 브라우저에서 열어 주세요.</p> : null}
    <form action={requestPasswordReset} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-bold">가입 이메일
        <input className="w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none focus:border-[#be4b49]" type="email" name="email" autoComplete="email" maxLength={254} required />
      </label>
      <PasswordSubmit label="재설정 메일 보내기" />
    </form>
  </PasswordPage>;
}
