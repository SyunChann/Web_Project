"use client";

import { DeleteContentButton } from "@/components/common/DeleteContentButton";

type DeleteReviewButtonProps = {
  title: string;
};

export function DeleteReviewButton({ title }: DeleteReviewButtonProps) {
  return (
    <DeleteContentButton title={title} contentLabel="리뷰" variant="reviews" />
  );
}
