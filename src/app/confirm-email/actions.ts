"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function confirmEmail() {
  const store = await cookies();
  const credential = store.get("signup_confirmation")?.value ?? "";
  if (!credential || credential.length > 2100 || !/^(hash|code):.+$/.test(credential)) redirect("/signup?error=expired");
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/signup?error=config");
  let failed = true;
  try {
    const result = credential.startsWith("hash:") ? await supabase.auth.verifyOtp({ token_hash: credential.slice(5), type: "email" }) : await supabase.auth.exchangeCodeForSession(credential.slice(5));
    failed = Boolean(result.error || !result.data.user?.email_confirmed_at);
    if (!failed) { try { await supabase.auth.signOut({ scope: "local" }); } catch { /* Successful confirmation takes precedence. */ } }
  } catch { failed = true; }
  store.delete("signup_confirmation");
  if (failed) redirect("/signup?error=expired");
  redirect("/login?status=confirmed");
}
