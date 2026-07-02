"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <ConfirmSubmitButton
        triggerLabel="로그아웃"
        title="로그아웃할까요?"
        description="현재 로그인 세션을 종료하고 홈으로 이동합니다."
        confirmLabel="로그아웃"
        icon={<LogOut size={16} />}
        triggerClassName="inline-flex items-center gap-2 rounded-md border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-bold text-[#52616b] shadow-sm transition hover:border-[#be4b49] hover:text-[#be4b49]"
      />
    </form>
  );
}
