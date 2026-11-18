import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
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

  try {
    const {
      error,
    } = await supabase.auth.getUser();

    if (error) {
      clearInvalidAuthCookies();
      return response;
    }

  } catch {
    clearInvalidAuthCookies();
    return response;
  }

  if (request.cookies.has("pending_invite_code")) response.cookies.delete("pending_invite_code");

  return response;
}
