import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpWithInvite } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    invite?: string;
  }>;
};

const errorMessages = {
  missing: "이름, 이메일, 비밀번호, 초대 코드를 모두 입력해 주세요.",
  weak_password: "비밀번호는 6자 이상으로 입력해 주세요.",
  config: "Supabase 환경변수가 설정되지 않았습니다.",
  invalid_invite: "초대 코드가 없거나 만료되었습니다.",
  signup_failed: "회원가입 중 문제가 발생했습니다. 이미 가입된 이메일인지 확인해 주세요.",
  claim_failed: "초대 코드 사용 처리에 실패했습니다. 관리자에게 문의해 주세요.",
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/reviews");
  }

  const { error, invite } = await searchParams;
  const message = error
    ? errorMessages[error as keyof typeof errorMessages] ??
      "회원가입 중 문제가 발생했습니다."
    : null;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10">
      <section className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Link
          href="/login"
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#be4b49]"
        >
          <ArrowLeft size={17} />
          로그인으로
        </Link>

        <div className="rounded-lg border border-[#ddd6cc] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#be4b49]">Invite</p>
          <h1 className="mt-3 text-3xl font-bold">초대 회원가입</h1>
          <p className="mt-4 leading-7 text-[#52616b]">
            초대 코드를 받은 사용자만 가입하고 글을 작성할 수 있습니다.
          </p>

          {message ? (
            <p className="mt-5 rounded-md bg-[#fde8e7] px-4 py-3 text-sm font-bold text-[#a73735]">
              {message}
            </p>
          ) : null}

          <form action={signUpWithInvite} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              이름
              <input
                name="display_name"
                type="text"
                autoComplete="name"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

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
                autoComplete="new-password"
                minLength={6}
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              초대 코드
              <input
                name="invite_code"
                type="text"
                defaultValue={invite ?? ""}
                autoComplete="off"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal uppercase outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
            >
              가입하기
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
