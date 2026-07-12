"use client";

import { DeleteContentButton } from "@/components/common/DeleteContentButton";

type DeleteRestaurantsReviewButtonProps = {
  title: string;
  isOverseas?: boolean;
};

export function DeleteRestaurantsReviewButton({ title, isOverseas = false }: DeleteRestaurantsReviewButtonProps) {
  return (
    <DeleteContentButton
      title={title}
      contentLabel="맛집 리뷰"
      variant="restaurants"
      isOverseas={isOverseas}
    />
  );
}
