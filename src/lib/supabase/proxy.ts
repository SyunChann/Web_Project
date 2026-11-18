import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseKey, supabaseUrl } from "./config";

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }
  if (!request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const clearInvalidAuthCookies = () => {
    const authCookieNames = request.cookies
      .getAll()
      .filter(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))
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
    response.headers.set("Cache-Control", "private, no-store");
  };

  try {
    // Only refresh/persist cookies here. Never use getSession().user for identity.
    // Server components and actions validate identity with getUser(); DB writes use RLS.
    const { error } = await supabase.auth.getSession();

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
