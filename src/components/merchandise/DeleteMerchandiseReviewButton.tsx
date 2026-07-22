"use client";

import { DeleteContentButton } from "@/components/common/DeleteContentButton";

type DeleteMerchandiseReviewButtonProps = {
  title: string;
  isOverseas?: boolean;
};

export function DeleteMerchandiseReviewButton({ title, isOverseas = false }: DeleteMerchandiseReviewButtonProps) {
  return (
    <DeleteContentButton
      title={title}
      contentLabel="상품 리뷰"
      variant="merchandise"
      isOverseas={isOverseas}
    />
  );
}
