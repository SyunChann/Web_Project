"use client";

import Image from "next/image";
import { useState } from "react";

type ThumbnailTone = "movie" | "anime" | "game" | "drama" | "watchlist";

interface ThumbnailImageProps {
  src?: string | null;
  alt: string;
  title: string;
  label: string;
  tone?: ThumbnailTone;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  className?: string;
  fallbackClassName?: string;
}

const fallbackToneClasses: Record<ThumbnailTone, string> = {
  movie: "from-[#fbe8e5] via-[#f8f1ed] to-[#ead3cf] text-[#9b3d3b]",
  anime: "from-[#e9ecff] via-[#f6f4ff] to-[#dfe4ff] text-[#4657b8]",
  game: "from-[#e5f4ed] via-[#f4fbf7] to-[#d5efe3] text-[#247053]",
  drama: "from-[#fff0d9] via-[#fff8ec] to-[#f4dfbf] text-[#9a5a13]",
  watchlist: "from-[#e4f4f2] via-[#f4fbfa] to-[#d2ebe8] text-[#2f7f7a]",
};

export function ThumbnailImage({
  src,
  alt,
  title,
  label,
  tone = "watchlist",
  loading = "lazy",
  fetchPriority = "auto",
  className = "aspect-video h-auto w-full object-cover",
  fallbackClassName = "aspect-video w-full",
}: ThumbnailImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = src?.trim();

  if (!imageSrc || hasError) {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden bg-gradient-to-br ${fallbackClassName} ${fallbackToneClasses[tone]}`}
        role="img"
        aria-label={alt}
      >
        <div className="px-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
            {label}
          </p>
          <p className="mt-3 line-clamp-2 text-xl font-black leading-snug">
            {title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={960}
      height={540}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      onError={() => setHasError(true)}
    />
  );
}
