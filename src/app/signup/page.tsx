import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpWithInvite } from "./actions";
import { SignupSubmitButton } from "@/components/SignupSubmitButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    invite?: string;
    status?: string;
  }>;
};

const errorMessages = {
  missing: "이름, 이메일, 비밀번호, 초대 코드를 모두 입력해 주세요.",
  name_too_long: "이름은 10자 이내로 입력해 주세요.",
  weak_password: "비밀번호는 6자 이상으로 입력해 주세요.",
  config: "Supabase 환경변수가 설정되지 않았습니다.",
  invalid_invite: "초대 코드가 없거나 만료되었습니다.",
  email_exists: "이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요.",
  signup_limited:
    "가입 요청이 너무 잦습니다. 잠시 후 같은 초대 링크로 다시 시도해 주세요.",
  signup_failed:
    "회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  claim_failed:
    "초대 코드 사용 처리에 실패했습니다. 관리자에게 문의해 주세요.",
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/reviews");
  }

  const { error, invite, status } = await searchParams;
  const message = error
    ? errorMessages[error as keyof typeof errorMessages] ??
      "회원가입 중 문제가 발생했습니다."
    : null;
  const shouldConfirmEmail = status === "confirm_email";

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

          {shouldConfirmEmail ? (
            <div className="mt-5 rounded-lg border border-[#b8ded8] bg-[#eefaf8] p-4 text-sm text-[#235f58]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-white p-2 text-[#2a9d90]">
                  <MailCheck size={18} />
                </span>
                <div>
                  <p className="font-black">인증 메일을 보냈습니다.</p>
                  <p className="mt-2 leading-6">
                    메일에서 인증을 완료한 뒤 로그인하면 초대 코드가 자동으로
                    사용 처리됩니다.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="mt-5 rounded-md bg-[#fde8e7] px-4 py-3 text-sm font-bold text-[#a73735]">
              {message}
            </p>
          ) : null}

          <form action={signUpWithInvite} className="mt-6 flex flex-col gap-4">
            <p className="rounded-md bg-[#fbf8f3] px-4 py-3 text-xs font-bold text-[#6b7280]">
              모든 항목은 필수입니다.
            </p>

            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              이름 *
              <input
                name="display_name"
                type="text"
                autoComplete="name"
                maxLength={10}
                placeholder="이름은 10자 이내로 입력해 주세요."
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              이메일 *
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-bold text-[#1f2933]">
              비밀번호 *
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
              초대 코드 *
              <input
                name="invite_code"
                type="text"
                defaultValue={invite ?? ""}
                autoComplete="off"
                required
                className="rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal uppercase outline-none transition focus:border-[#be4b49] focus:bg-white"
              />
            </label>

            <SignupSubmitButton />
          </form>
        </div>
      </section>
    </main>
  );
}
