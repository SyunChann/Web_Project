"use client";

import Image from "next/image";
import { useState } from "react";

export function TossProductImage({ src, name, compact = false }: {
  src: string | null;
  name: string;
  compact?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;

  return <div className={compact ? "relative mb-3 w-24 bg-white sm:w-28" : "relative mt-5 w-full bg-white"}>
    <Image
      src={src}
      alt={`${name} 상품 이미지`}
      width={640}
      height={640}
      unoptimized
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      style={{ display: "block", width: "100%", height: "auto" }}
    />
  </div>;
}
