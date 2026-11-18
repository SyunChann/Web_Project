import { NextResponse } from "next/server";
import { validNickname } from "@/lib/membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (Number(request.headers.get("content-length")) > 1024) return NextResponse.json({ message: "닉네임을 다시 확인해 주세요." }, { status: 400, headers });
  try {
    const { nickname } = await request.json();
    if (typeof nickname !== "string" || !validNickname(nickname)) return NextResponse.json({ available: false, message: "한글·영문·숫자·_·- 조합으로 2~16자 입력해 주세요. 운영자 이름은 사용할 수 없습니다." }, { status: 400, headers });
    const supabase = await createSupabaseServerClient();
    if (!supabase) throw Error("unconfigured");
    const { data, error } = await supabase.rpc("nickname_available_v1", { p_nickname: nickname });
    if (error) throw Error("unavailable");
    return NextResponse.json({ available: data === true, message: data === true ? "사용할 수 있습니다. 가입 완료 시 최종 확정됩니다." : "이미 사용 중인 닉네임입니다." }, { headers });
  } catch { return NextResponse.json({ message: "중복 확인을 완료하지 못했습니다. 잠시 후 시도해 주세요." }, { status: 503, headers }); }
}
