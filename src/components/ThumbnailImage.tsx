"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { loadGoogleMapsLibrary } from "@/lib/googleMaps";

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
  googlePlaceId?: string | null;
  googlePlaceQuery?: string | null;
}

const fallbackToneClasses: Record<ThumbnailTone, string> = {
  movie: "from-[#fbe8e5] via-[#f8f1ed] to-[#ead3cf] text-[#9b3d3b]",
  anime: "from-[#e9ecff] via-[#f6f4ff] to-[#dfe4ff] text-[#4657b8]",
  game: "from-[#e5f4ed] via-[#f4fbf7] to-[#d5efe3] text-[#247053]",
  drama: "from-[#fff0d9] via-[#fff8ec] to-[#f4dfbf] text-[#9a5a13]",
  watchlist: "from-[#e4f4f2] via-[#f4fbfa] to-[#d2ebe8] text-[#2f7f7a]",
};

function isGoogleImageSource(src: string) {
  try {
    const hostname = new URL(src).hostname;

    return (
      hostname === "maps.googleapis.com" ||
      hostname === "places.googleapis.com" ||
      hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

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
  googlePlaceId,
  googlePlaceQuery,
}: ThumbnailImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [placePhoto, setPlacePhoto] = useState<{
    key: string;
    src: string;
  } | null>(null);
  const imageSrc = src?.trim();
  const placePhotoKey = [
    googlePlaceId ?? "",
    googlePlaceQuery ?? "",
    imageSrc ?? "",
  ].join("|");
  const placePhotoSrc = placePhoto?.key === placePhotoKey ? placePhoto.src : null;
  const isStoredGoogleImage = Boolean(imageSrc && isGoogleImageSource(imageSrc));
  const shouldLoadPlacePhoto = Boolean(
    (googlePlaceId || googlePlaceQuery) &&
      (!imageSrc ||
        imageSrc === "/thumbnails/default-food.svg" ||
        isStoredGoogleImage ||
        failedSrc === imageSrc),
  );
  const effectiveSrc = placePhotoSrc ?? (isStoredGoogleImage ? undefined : imageSrc);
  const hasError = Boolean(effectiveSrc && failedSrc === effectiveSrc);

  useEffect(() => {
    if ((!googlePlaceId && !googlePlaceQuery) || !shouldLoadPlacePhoto) {
      return;
    }

    let isCancelled = false;

    loadGoogleMapsLibrary("places")
      .then(async (placesLibrary) => {
        const place = googlePlaceId
          ? new placesLibrary.Place({ id: googlePlaceId })
          : (
              await placesLibrary.Place.searchByText({
                textQuery: googlePlaceQuery ?? title,
                fields: ["photos"],
                maxResultCount: 1,
              })
            ).places[0];

        if (!place) {
          return;
        }

        await place.fetchFields({ fields: ["photos"] });

        const photoUrl = place.photos?.[0]?.getURI({
          maxWidth: 1200,
          maxHeight: 800,
        });

        if (!photoUrl) {
          return;
        }

        if (!isCancelled) {
          setFailedSrc(null);
          setPlacePhoto({ key: placePhotoKey, src: photoUrl });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [googlePlaceId, googlePlaceQuery, placePhotoKey, shouldLoadPlacePhoto, title]);

  if (!effectiveSrc || hasError) {
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
      src={effectiveSrc}
      alt={alt}
      width={960}
      height={540}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      unoptimized={isGoogleImageSource(effectiveSrc)}
      onError={() => setFailedSrc(effectiveSrc)}
    />
  );
}
