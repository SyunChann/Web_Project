import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp, resendSignupEmail } from "./actions";
import { SignupForm } from "@/components/SignupForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { membershipErrors } from "@/lib/membership";
import { cookies } from "next/headers";
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (user) redirect("/account");
  const { error, status } = await searchParams;
  const confirming = status === "confirm_email" || status === "resent" || error === "expired";
  const retrySeconds = Math.max(0, Math.min(60, Math.ceil((Number((await cookies()).get("signup_mail_requested")?.value ?? 0) + 60000 - new Date().getTime()) / 1000)));
  return <main className="min-h-screen px-4 py-8 pb-28"><section className="mx-auto max-w-md">
    <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-bold text-[#be4b49]">← 로그인으로</Link>
    <div className="mt-4 rounded-lg border border-[#ddd6cc] bg-white p-5 shadow-sm sm:p-8">
      <h1 className="text-3xl font-bold">회원가입</h1><p className="mt-3 text-sm leading-7 text-[#52616b]">이메일로 인증하고 취향을 기록해 보세요. 작성자 이름에는 닉네임이 표시됩니다.</p>
      {status === "confirm_email" || status === "resent" ? <div role="status" className="mt-5 rounded-lg bg-[#eefaf8] p-4 text-sm leading-7 text-[#235f58]"><strong>인증 메일을 확인해 주세요.</strong><p>가입 대상 이메일이면 인증 메일이 발송됩니다. 스팸함도 확인해 주세요. 이미 인증했다면 로그인할 수 있습니다.</p><Link href="/login" className="inline-flex min-h-11 items-center font-bold underline">로그인하기</Link></div> : null}
      {error ? <p role="alert" className="mt-5 rounded-md bg-[#fde8e7] p-4 text-sm leading-7 text-[#a73735]">{membershipErrors[error] ?? "요청을 처리하지 못했습니다."}</p> : null}
      {!confirming ? <SignupForm action={signUp} retrySeconds={retrySeconds} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /> : <Link href="/signup" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#64748b]">처음부터 가입하기</Link>}
      <details className="mt-6 border-t border-[#e7dfd6] pt-4" open={status === "confirm_email" || status === "resent" || error === "expired"}><summary className="cursor-pointer text-sm font-bold">인증 메일이 오지 않았나요?</summary><p className="mt-3 text-xs leading-6 text-[#64748b]">가입 이메일로 다시 요청해 주세요. 재요청은 최소 60초 간격이며 서버 발송 한도도 적용됩니다.</p><SignupForm action={resendSignupEmail} resend retrySeconds={retrySeconds} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /></details>
    </div></section></main>;
}
