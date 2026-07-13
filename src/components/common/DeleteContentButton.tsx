"use client";

import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type DeleteContentVariant = "reviews" | "watchlist" | "restaurants" | "travel";

type DeleteContentButtonProps = {
  title: string;
  contentLabel: string;
  variant: DeleteContentVariant;
};

const variantClasses: Record<DeleteContentVariant, string> = {
  reviews:
    "inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]",
  watchlist:
    "inline-flex items-center gap-2 rounded-md bg-[#2f7f7a] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#276965]",
  restaurants:
    "inline-flex items-center gap-2 rounded-md bg-[#e57632] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#c86124]",
  travel:
    "inline-flex items-center gap-2 rounded-md bg-[#5ca1e6] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#4584c4]",
};

export function DeleteContentButton({
  title,
  contentLabel,
  variant,
}: DeleteContentButtonProps) {
  return (
    <ConfirmSubmitButton
      triggerLabel="삭제"
      title={`${contentLabel}을 삭제할까요?`}
      description={`"${title}" ${contentLabel}을 삭제합니다. 삭제한 항목은 되돌릴 수 없습니다.`}
      confirmLabel="삭제"
      icon={<Trash2 size={16} />}
      triggerClassName={variantClasses[variant]}
    />
  );
}
