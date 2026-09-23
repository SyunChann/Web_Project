const fallbackSiteUrl = "https://web-project-omega-ruby-60.vercel.app";

export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return fallbackSiteUrl;
  }

  try {
    return new URL(configuredSiteUrl).origin;
  } catch {
    return fallbackSiteUrl;
  }
}
