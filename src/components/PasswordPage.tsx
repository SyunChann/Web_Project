import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const messages: Record<string, string> = {
  email: "올바른 이메일 주소를 입력해 주세요.",
  config: "인증 서비스 설정을 확인해 주세요. 잠시 후 다시 시도해 주세요.",
  limited: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  send: "메일 발송 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  expired: "링크가 만료되었거나 이미 사용되었습니다. 재설정 메일을 다시 요청해 주세요.",
  weak: "새 비밀번호는 8자 이상으로 입력해 주세요.",
  long: "비밀번호가 너무 깁니다. 영문·숫자는 72자, 한글은 24자 이내로 줄여 주세요.",
  mismatch: "새 비밀번호와 확인 값이 일치하지 않습니다.",
  current: "현재 비밀번호를 확인해 주세요.",
  same: "이전과 다른 비밀번호를 사용해 주세요. 이메일로 재설정 중이었다면 새 링크를 요청해 주세요.",
  save: "비밀번호를 저장하지 못했습니다. 보안 요구 사항을 확인한 뒤 다시 시도해 주세요. 이메일 재설정은 새 링크를 요청해 주세요.",
};

export function PasswordPage({ title, description, error, children }: {
  title: string; description: string; error?: string; children: ReactNode;
}) {
  return <main className="min-h-screen px-6 py-8 sm:px-10">
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Link href="/login" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-[#be4b49]"><ArrowLeft size={17} />로그인으로</Link>
      <div className="rounded-lg border border-[#ddd6cc] bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-4 leading-7 text-[#52616b]">{description}</p>
        {error ? <p role="alert" className="mt-5 rounded-md bg-[#fde8e7] px-4 py-3 text-sm font-bold text-[#a73735]">{messages[error] ?? "처리 중 문제가 발생했습니다. 다시 시도해 주세요."}</p> : null}
        {children}
      </div>
      <Link href="/" className="text-sm font-bold text-[#52616b]">홈으로</Link>
    </section>
  </main>;
}
