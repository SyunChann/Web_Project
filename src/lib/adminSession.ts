import "server-only";
import { loginHref } from "@/lib/returnTo";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { getSupabaseServerSession } from "@/lib/supabase/session";

export async function requireAdminSession(returnTo = "/admin") {
  const { supabase, user } = await getSupabaseServerSession();
  if (!user || !supabase) redirect(loginHref(returnTo));
  if (!isAdminUser(user)) redirect("/");
  return { supabase, user };
}
