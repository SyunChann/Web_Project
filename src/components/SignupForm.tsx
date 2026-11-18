"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Captcha } from "./auth/Captcha";
const inputClass = "w-full rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-3 py-3 text-base font-normal outline-none focus:border-[#be4b49]";
function Submit({ resend, retrySeconds = 0 }: { resend?: boolean; retrySeconds?: number }) { const { pending } = useFormStatus(); const [remaining, setRemaining] = useState(retrySeconds); useEffect(() => { const id = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(id); }, []); return <button disabled={pending || remaining > 0} className="min-h-11 rounded-md bg-[#be4b49] px-4 py-3 font-bold text-white disabled:opacity-60">{pending ? "요청 중…" : remaining > 0 ? `${remaining}초 후 재요청` : resend ? "인증 메일 다시 받기" : "가입하기"}</button>; }
export function SignupForm({ action, resend, siteKey, retrySeconds }: { retrySeconds?: number; action: (data: FormData) => Promise<void>; resend?: boolean; siteKey?: string }) {
  const [show, setShow] = useState(false), [nickname, setNickname] = useState("");
  const [check, setCheck] = useState<{ name: string; message: string } | null>(null);
  const [checking, setChecking] = useState(false);
  async function checkNickname() {
    const name = nickname.trim(); setChecking(true);
    try { const res = await fetch("/api/account/nickname", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: name }) }); const result = await res.json(); setCheck({ name, message: result.message ?? "확인하지 못했습니다." }); }
    catch { setCheck({ name, message: "확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }); }
    finally { setChecking(false); }
  }
  return <form action={action} className="mt-5 grid gap-4 text-sm">
    {!resend ? <div><label className="grid gap-2 font-bold">닉네임<input name="nickname" autoComplete="nickname" minLength={2} maxLength={16} required className={inputClass} value={nickname} onChange={e => setNickname(e.target.value)} /></label><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xs text-[#64748b]">한글·영문·숫자·_·- / 2~16자</span><button type="button" disabled={checking || !nickname.trim()} onClick={checkNickname} className="min-h-11 font-bold text-[#be4b49] disabled:opacity-60">{checking ? "확인 중…" : "중복 확인"}</button></div>{check?.name === nickname.trim() ? <p role="status" className="text-xs leading-6 text-[#52616b]">{check.message}</p> : null}</div> : null}
    <label className="grid gap-2 font-bold">이메일<input name="email" type="email" autoComplete="email" maxLength={254} required className={inputClass} /></label>
    {!resend ? <><label className="grid gap-2 font-bold">비밀번호<input name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} /></label><label className="grid gap-2 font-bold">비밀번호 확인<input name="confirm_password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} /></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />비밀번호 보기</label>
    <div className="grid gap-2 rounded-md bg-[#f7f8fa] p-3"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="terms" required /><span>[필수] <Link href="/terms" target="_blank" className="underline">이용약관</Link> 동의</span></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="privacy" required /><span>[필수] <Link href="/privacy" target="_blank" className="underline">개인정보 수집·이용</Link> 동의</span></label></div></> : null}
    <Captcha siteKey={siteKey} /><Submit key={retrySeconds} resend={resend} retrySeconds={retrySeconds} />
  </form>;
}
