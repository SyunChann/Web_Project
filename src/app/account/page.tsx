import { loginHref } from "@/lib/returnTo";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getSupabaseServerSession } from "@/lib/supabase/session";
import { isAdminUser } from "@/lib/admin";
import { membershipErrors } from "@/lib/membership";
import { Captcha } from "@/components/auth/Captcha";
import { changeNickname, withdrawAccount } from "./actions";
export const metadata: Metadata = { title: "마이페이지 | 취향보관소", robots: { index: false, follow: false } };
const field = "w-full rounded-md border border-[#d8cfc2] bg-white px-3 py-3 text-base";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { supabase, user } = await getSupabaseServerSession();
  if (!supabase || !user) redirect(loginHref("/account"));
  const { data: profile, error: profileError } = await supabase.from("member_profiles").select("nickname").eq("user_id", user.id).maybeSingle();
  const { error, status } = await searchParams;
  const errors: Record<string, string> = { ...membershipErrors, nickname: isAdminUser(user) ? "닉네임은 한글·영문·숫자·_·- 조합으로 2~16자 입력해 주세요. 탈퇴 전용 이름은 사용할 수 없습니다." : membershipErrors.nickname, save: "계정 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", current: "현재 비밀번호를 확인해 주세요.", admin: "관리자 계정은 여기서 탈퇴할 수 없습니다.", confirm: "현재 비밀번호와 확인 문구 ‘탈퇴’를 입력해 주세요." };
  return <main className="min-h-screen px-4 py-6 pb-28 sm:px-10"><div className="mx-auto max-w-6xl"><AppNav /><section className="mx-auto mt-8 grid max-w-lg gap-5"><h1 className="text-3xl font-bold">마이페이지</h1><p className="break-all text-sm text-[#64748b]">{user.email}</p>
    {error ? <p role="alert" className="rounded-md bg-[#fde8e7] p-4 text-sm leading-7 text-[#a73735]">{errors[error] ?? errors.save}</p> : null}
    {status === "saved" ? <p role="status" className="rounded-md bg-[#e4f4f2] p-4 text-sm text-[#276a66]">닉네임을 변경했습니다. 기존 글의 작성자 표시에도 반영됩니다.</p> : null}
    {profileError || !profile ? <p role="status" className="rounded-md bg-[#fff4da] p-4 text-sm leading-7">프로필을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p> : <form action={changeNickname} className="grid gap-3 rounded-lg border border-[#ddd6cc] bg-white p-5"><label className="grid gap-2 text-sm font-bold">닉네임<input name="nickname" defaultValue={profile.nickname} minLength={2} maxLength={16} required className={field} /></label><p className="text-xs leading-6 text-[#64748b]">한글·영문·숫자·_·- / 2~16자. 저장할 때 중복을 확인합니다.</p><button className="min-h-11 rounded-md bg-[#304d70] px-4 py-3 text-sm font-bold text-white">닉네임 저장</button></form>}
    <Link href="/change-password" className="inline-flex min-h-11 items-center rounded-lg border border-[#ddd6cc] bg-white p-4 font-bold">비밀번호 변경 →</Link>
    {!isAdminUser(user) ? <details className="rounded-lg border border-[#ddd6cc] bg-white p-5"><summary className="min-h-11 cursor-pointer text-sm font-bold text-[#a73735]">회원 탈퇴</summary><p className="mt-3 text-sm leading-7 text-[#64748b]">계정과 프로필은 삭제됩니다. 작성한 공개 글과 첨부 사진은 ‘탈퇴한 회원’으로 남고 이후 직접 수정·삭제할 수 없습니다. 삭제할 글이나 사진은 탈퇴 전에 정리해 주세요. 미사용 술 사진은 삭제됩니다.</p><form action={withdrawAccount} className="mt-4 grid gap-3"><label className="grid gap-2 text-sm">현재 비밀번호<input name="current_password" type="password" autoComplete="current-password" required className={field} /></label><label className="grid gap-2 text-sm">확인 문구<input name="withdraw_confirm" placeholder="탈퇴" autoComplete="off" required pattern="탈퇴" className={field} /></label><Captcha siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} /><button className="min-h-11 rounded-md border border-[#a73735] p-3 text-sm font-bold text-[#a73735]">안내를 확인했고 탈퇴합니다</button></form></details> : null}
    <div className="flex gap-5 text-xs text-[#64748b]"><Link href="/terms" className="min-h-11 py-3">이용약관</Link><Link href="/privacy" className="min-h-11 py-3">개인정보 안내</Link></div>
  </section></div></main>;
}
