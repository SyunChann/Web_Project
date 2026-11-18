import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hash = params.get("token_hash"), code = params.get("code");
  const credential = hash && ["email", "signup"].includes(params.get("type") ?? "") ? `hash:${hash}` : code ? `code:${code}` : "";
  const valid = credential && credential.length < 2100;
  const response = NextResponse.redirect(new URL(valid ? "/confirm-email" : "/signup?error=expired", request.url));
  response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer"); response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.cookies.set("signup_confirmation", valid ? credential : "", { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", path: "/", maxAge: valid ? 900 : 0 });
  return response;
}
