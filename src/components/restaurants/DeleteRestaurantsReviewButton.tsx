"use client";

import { DeleteContentButton } from "@/components/common/DeleteContentButton";

type DeleteRestaurantsReviewButtonProps = {
  title: string;
};

export function DeleteRestaurantsReviewButton({ title }: DeleteRestaurantsReviewButtonProps) {
  return (
    <DeleteContentButton
      title={title}
      contentLabel="맛집 리뷰"
      variant="restaurants"
    />
  );
}
