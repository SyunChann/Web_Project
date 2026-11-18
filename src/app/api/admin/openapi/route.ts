import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { internalOpenApi } from "@/lib/internalOpenApi";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return NextResponse.json({ message: "인증 서비스를 확인할 수 없습니다." }, { status: 503, headers });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && (!error.status || error.status >= 500)) return NextResponse.json({ message: "인증 서비스를 확인할 수 없습니다." }, { status: 503, headers });
    if (error || !user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401, headers });
    if (!isAdminUser(user)) return NextResponse.json({ message: "관리자만 볼 수 있습니다." }, { status: 403, headers });
    return NextResponse.json(internalOpenApi, { headers });
  } catch {
    return NextResponse.json({ message: "문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503, headers });
  }
}
