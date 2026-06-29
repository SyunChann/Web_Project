"use client";

import { Trash2 } from "lucide-react";

type DeleteReviewButtonProps = {
  title: string;
};

export function DeleteReviewButton({ title }: DeleteReviewButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          `"${title}" 리뷰를 삭제할까요?\n삭제한 리뷰는 되돌릴 수 없습니다.`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-2 rounded-md bg-[#be4b49] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83f3d]"
    >
      <Trash2 size={16} />
      삭제
    </button>
  );
}
