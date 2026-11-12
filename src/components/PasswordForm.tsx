"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";

const passwordInputClass = "w-full min-w-0 rounded-md border border-[#d8cfc2] bg-[#fbfaf7] px-4 py-3 text-base font-normal outline-none focus:border-[#be4b49]";

export function PasswordForm({ action, currentRequired = false }: {
  action: (form: FormData) => Promise<void>;
  currentRequired?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <form action={action} className="mt-6 flex flex-col gap-4">
    {currentRequired ? <label className="grid gap-2 text-sm font-bold">현재 비밀번호
      <input className={passwordInputClass} name="current_password" type={visible ? "text" : "password"} autoComplete="current-password" required />
    </label> : null}
    <label className="grid gap-2 text-sm font-bold">새 비밀번호
      <input className={passwordInputClass} name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} required aria-describedby="password-hint" />
    </label>
    <p id="password-hint" className="text-sm text-[#52616b]">8자 이상 입력해 주세요. 한글 등 다중 바이트 문자는 최대 길이가 더 짧을 수 있습니다.</p>
    <label className="grid gap-2 text-sm font-bold">새 비밀번호 확인
      <input className={passwordInputClass} name="confirm_password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={72} required />
    </label>
    <label className="flex min-h-11 items-center gap-2 text-sm text-[#52616b]">
      <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />비밀번호 표시
    </label>
    <PasswordSubmit label="새 비밀번호 저장" />
  </form>;
}

export function PasswordSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit" className="min-h-11 rounded-md bg-[#be4b49] px-5 py-3 text-sm font-bold text-white hover:bg-[#a83f3d] disabled:cursor-wait disabled:opacity-60">
    {pending ? "처리 중…" : label}
  </button>;
}
