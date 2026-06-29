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
          <p className="text-sm font-semibold text-[#be4b49]">Admin</p>
          <h1 className="mt-3 text-3xl font-bold">로그인</h1>
          <p className="mt-4 leading-7 text-[#52616b]">
            리뷰 작성과 관리는 로그인한 관리자에게만 열어둘 예정입니다.
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
        </div>
      </section>
    </main>
  );
}
