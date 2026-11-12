export function parseTossProductIds(value?: string): Set<number> {
  return new Set((value ?? "").split(",").map((part) => part.trim())
    .filter((part) => /^[1-9]\d*$/.test(part))
    .map(Number).filter(Number.isSafeInteger));
}

// Permission is a separate operator setting, never inferred from an API image URL.
export function getTossThumbnailUrl(
  product: { tacaItemId: number; thumbnailUrl?: string | null },
  approved: Set<number>,
  blocked: Set<number>,
): string | null {
  if (!approved.has(product.tacaItemId) || blocked.has(product.tacaItemId)) return null;
  const raw = product.thumbnailUrl;
  if (!raw || raw !== raw.trim()) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    // Preserve the original URL, including signed query parameters.
    return raw;
  } catch {
    return null;
  }
}
