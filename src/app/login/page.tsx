import { safeReturnTo } from "@/lib/returnTo";
import { SubmitButton } from "@/components/SubmitButton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { Captcha } from "@/components/auth/Captcha";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    status?: string;
  }>;
};

const errorMessages = {
  missing: "이메일과 비밀번호를 모두 입력해 주세요.",
  config: "Supabase 환경변수가 설정되지 않았습니다.",
  invalid: "이메일 또는 비밀번호가 올바르지 않습니다.",
  confirm_email:
    "이메일 인증을 완료한 뒤 로그인해 주세요. 회원가입 화면에서 인증 메일을 다시 요청할 수 있습니다.",
  limited: "로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  captcha: "자동 가입 방지 인증을 다시 완료해 주세요.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, status, next: requested } = await searchParams;
  const next = safeReturnTo(requested);
  const { user } = await getSupabaseServerSession();

  if (user) {
    redirect(next);
  }

  const message = error
    ? errorMessages[error as keyof typeof errorMessages] ??
      "로그인 중 문제가 발생했습니다."
    : null;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />
          홈으로
        </Link>

        <div className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#be4b49]">Login</p>
          <h1 className="mt-3 text-3xl font-bold">로그인</h1>
          <p className="mt-4 leading-7 text-[#52616b]">
            로그인하고 나만의 취향을 기록해 보세요.
          </p>

          {message ? (
            <p className="mt-5 rounded-md bg-[#fde8e7] px-4 py-3 text-sm font-bold text-[#a73735]">
              {message}
            </p>
          ) : null}

          {status === "confirmed" ? <p role="status" className="mt-5 rounded-md bg-[#e4f4f2] p-4 text-sm leading-7 text-[#276a66]">이메일 인증이 완료되었습니다. 이메일과 비밀번호로 로그인해 주세요.</p> : null}
          {status === "withdrawn" ? <p role="status" className="mt-5 rounded-md bg-[#e4f4f2] p-4 text-sm leading-7 text-[#276a66]">회원 탈퇴가 완료되었습니다.</p> : null}

          {status === "password_reset" || status === "password_changed" ? (
            <p role="status" className="mt-5 rounded-md bg-[#e4f4f2] px-4 py-3 text-sm font-bold text-[#276a66]">비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.</p>
          ) : null}

          <form action={signIn} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              이메일
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              비밀번호
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <Captcha siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
            <SubmitButton pendingLabel="로그인 중…"
              className="mt-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              로그인
            </SubmitButton>
          </form>

          <Link href="/forgot-password" className="mt-4 flex min-h-11 items-center text-sm font-bold text-[#52616b] underline-offset-4 hover:underline">
            비밀번호를 잊으셨나요?
          </Link>

          <Link
            href="/signup"
            className="mt-5 inline-flex text-sm font-bold text-[#be4b49] underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}
