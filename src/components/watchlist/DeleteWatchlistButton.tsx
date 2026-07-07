"use client";

import { DeleteContentButton } from "@/components/common/DeleteContentButton";

type DeleteWatchlistButtonProps = {
  title: string;
};

export function DeleteWatchlistButton({ title }: DeleteWatchlistButtonProps) {
  return (
    <DeleteContentButton
      title={title}
      contentLabel="기대작"
      variant="watchlist"
    />
  );
}
