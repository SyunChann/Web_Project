import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

export async function checkNicknameRateLimit(request: Request): Promise<{ allowed: boolean; retryAfter: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw Error("Rate limit unavailable");
  // Vercel overwrites x-forwarded-for at its edge. Never trust arbitrary proxy headers locally.
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() : undefined;
  const ip = forwarded && isIP(forwarded) ? forwarded : "shared";
  const key = createHmac("sha256", secret).update(`nickname:${ip}`).digest("hex");
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3000), cache: "no-store" }) } });
  const { data, error } = await client.rpc("consume_nickname_limit_v1", { p_key: key });
  if (error || !data || typeof data.allowed !== "boolean" || !Number.isInteger(data.retry_after)) throw Error("Rate limit unavailable");
  return { allowed: data.allowed, retryAfter: Math.max(1, Math.min(60, data.retry_after)) };
}
