"use client";

import Image from "next/image";
import { useState } from "react";

export function TossProductImage({ src, name }: {
  src: string | null;
  name: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;

  return <div style={{
    position: "relative", width: "100%", height: "100%", minWidth: 0, minHeight: 0,
    background: "#fff",
  }}>
    <Image
      src={src}
      alt={`${name} 상품 이미지`}
      fill
      sizes="(max-width: 600px) 104px, 33vw"
      unoptimized
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      style={{ objectFit: "contain" }}
    />
  </div>;
}
