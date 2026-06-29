"use client";

import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type DeleteWatchlistButtonProps = {
  title: string;
};

export function DeleteWatchlistButton({ title }: DeleteWatchlistButtonProps) {
  return (
    <ConfirmSubmitButton
      triggerLabel="삭제"
      title="기대작을 삭제할까요?"
      description={`"${title}" 기대작을 삭제합니다. 삭제한 항목은 되돌릴 수 없습니다.`}
      confirmLabel="삭제"
      icon={<Trash2 size={16} />}
      triggerClassName="inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
    />
  );
}
