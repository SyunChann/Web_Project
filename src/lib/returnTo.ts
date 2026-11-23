export function safeReturnTo(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return fallback;
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) {
      if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//")) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//")) return fallback;
    const url = new URL(value, "https://return.invalid");
    const decodedPath = new URL(decoded, "https://return.invalid").pathname;
    if (url.origin !== "https://return.invalid" || /^\/(?:login|auth|reset-password|confirm-email|password-complete)(?:\/|$)/.test(decodedPath)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function loginHref(returnTo: unknown) {
  return `/login?${new URLSearchParams({ next: safeReturnTo(returnTo) })}`;
}
