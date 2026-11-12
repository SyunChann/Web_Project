import { NextRequest, NextResponse } from "next/server";
import { recoveryCookieName } from "@/lib/passwordRecovery";

// Defer one-time verification until the user submits a new password.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const value = tokenHash && params.get("type") === "recovery"
    ? `token_hash:${tokenHash}` : code ? `code:${code}` : null;
  const response = NextResponse.redirect(new URL(
    value && value.length < 2100 ? "/reset-password" : "/forgot-password?error=expired", request.url,
  ));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.cookies.set(recoveryCookieName, value && value.length < 2100 ? value : "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: value ? 15 * 60 : 0,
  });
  return response;
}
