export function parseTossProductIds(value?: string): Set<number> {
  return new Set((value ?? "").split(",").map((part) => part.trim())
    .filter((part) => /^[1-9]\d*$/.test(part))
    .map(Number).filter(Number.isSafeInteger));
}

// Images are displayed by default; withdrawal settings take priority.
export function getTossThumbnailUrl(
  product: { tacaItemId: number; thumbnailUrl?: string | null },
  blocked: Set<number>,
): string | null {
  if (blocked.has(product.tacaItemId)) return null;
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
