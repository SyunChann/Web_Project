"use client";

import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

type DeleteRestaurantsReviewButtonProps = {
  title: string;
};

export function DeleteRestaurantsReviewButton({ title }: DeleteRestaurantsReviewButtonProps) {
  return (
    <ConfirmSubmitButton
      triggerLabel="삭제"
      title="리뷰를 삭제할까요?"
      description={`"${title}" 리뷰를 삭제합니다. 삭제한 리뷰는 되돌릴 수 없습니다.`}
      confirmLabel="삭제"
      icon={<Trash2 size={16} />}
      triggerClassName="inline-flex items-center gap-2 rounded-md bg-[#e57632] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
    />
  );
}