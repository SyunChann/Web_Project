import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getPendingInviteCodeFromMetadata,
  pendingInviteCookieName,
  pendingInviteMetadataKey,
} from "@/lib/pendingInvite";
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

  const clearInvalidAuthCookies = () => {
    const authCookieNames = request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("sb-"))
      .map(({ name }) => name);

    authCookieNames.forEach((name) => request.cookies.delete(name));

    response = NextResponse.next({ request });
    authCookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    });
  };

  let user = null;

  try {
    const {
      data: { user: sessionUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      clearInvalidAuthCookies();
      return response;
    }

    user = sessionUser;
  } catch {
    clearInvalidAuthCookies();
    return response;
  }

  const pendingInviteCode =
    request.cookies.get(pendingInviteCookieName)?.value ||
    getPendingInviteCodeFromMetadata(user?.user_metadata);

  if (user && pendingInviteCode) {
    const { error } = await supabase.rpc("claim_invite_code", {
      invite_code: pendingInviteCode,
    });

    if (!error) {
      response.cookies.delete(pendingInviteCookieName);
      await supabase.auth.updateUser({
        data: {
          [pendingInviteMetadataKey]: null,
        },
      });
    }
  }

  return response;
}
