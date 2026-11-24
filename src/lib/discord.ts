import "server-only";
import { after } from "next/server";

type DiscordField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordNotification = {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordField[];
};

function getMonitoringWebhookUrl() {
  return process.env.DISCORD_MONITORING_WEBHOOK_URL?.trim();
}

function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  return vercelUrl ? `https://${vercelUrl}` : "";
}

export function buildSiteUrl(path: string) {
  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    return undefined;
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function notifyDiscord({
  title,
  description,
  url,
  color = 0xbe4b49,
  fields = [],
}: DiscordNotification) {
  const webhookUrl = getMonitoringWebhookUrl();

  if (!webhookUrl) {
    return;
  }

  try {
    after(async () => {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [
              {
                title,
                description,
                url,
                color,
                fields,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
        if (!response.ok) console.warn("[discord] notification failed");
      } catch { console.warn("[discord] notification failed"); }
    });
  } catch {
    console.warn("[discord] notification scheduling failed");
  }
}
