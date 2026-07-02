import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages = {
  missing: "이메일과 비밀번호를 모두 입력해 주세요.",
  config: "Supabase 환경변수가 설정되지 않았습니다.",
  invalid: "이메일 또는 비밀번호가 올바르지 않습니다.",
  confirm_email:
    "이메일 인증 후 다시 로그인해 주세요. 로그인하면 초대 코드가 사용 처리됩니다.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/reviews");
  }

  const { error } = await searchParams;
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
            초대받은 사용자는 로그인 후 리뷰와 기대작을 작성할 수 있습니다.
          </p>

          {message ? (
            <p className="mt-5 rounded-md bg-[#fde8e7] px-4 py-3 text-sm font-bold text-[#a73735]">
              {message}
            </p>
          ) : null}

          <form action={signIn} className="mt-6 flex flex-col gap-4">
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

            <button
              type="submit"
              className="mt-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              로그인
            </button>
          </form>

          <Link
            href="/signup"
            className="mt-5 inline-flex text-sm font-bold text-[#be4b49] underline-offset-4 hover:underline"
          >
            초대 코드로 회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}
