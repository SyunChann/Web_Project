import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { confirmEmail } from "./actions";
export const metadata: Metadata = { title: "이메일 인증 | 취향보관소", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ConfirmEmailPage() {
  const ready = Boolean((await cookies()).get("signup_confirmation")?.value);
  return <main className="mx-auto min-h-screen max-w-md px-4 py-12"><div className="rounded-lg border border-[#ddd6cc] bg-white p-6"><h1 className="text-2xl font-bold">이메일 인증</h1><p className="mt-4 text-sm leading-7">{ready ? "아래 버튼을 누르면 이메일 인증이 완료됩니다. 인증 후 로그인해 주세요." : "인증을 이미 완료했다면 로그인해 주세요. 링크가 만료되었다면 인증 메일을 다시 요청할 수 있습니다."}</p>{ready ? <form action={confirmEmail}><button className="mt-5 min-h-11 rounded-md bg-[#be4b49] px-4 py-3 font-bold text-white">인증 완료하기</button></form> : null}<div className="mt-4 flex gap-5 text-sm font-bold text-[#be4b49]"><Link href="/login" className="min-h-11 py-3">로그인</Link><Link href="/signup" className="min-h-11 py-3">인증 메일 다시 받기</Link></div></div></main>;
}
