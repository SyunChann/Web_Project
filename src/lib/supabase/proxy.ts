import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { pendingInviteCookieName } from "@/lib/pendingInvite";
import { supabaseKey, supabaseUrl } from "./config";

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pendingInviteCode = request.cookies.get(pendingInviteCookieName)?.value;

  if (user && pendingInviteCode) {
    const { error } = await supabase.rpc("claim_invite_code", {
      invite_code: pendingInviteCode,
    });

    if (!error) {
      response.cookies.delete(pendingInviteCookieName);
    }
  }

  return response;
}
