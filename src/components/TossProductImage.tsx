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
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", height: "100%", minWidth: 0,
    background: "#fff",
  }}>
    <Image
      src={src}
      alt={`${name} 상품 이미지`}
      width={640}
      height={640}
      unoptimized
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
    />
  </div>;
}
