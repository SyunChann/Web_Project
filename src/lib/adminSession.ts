import "server-only";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdminSession() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user || !supabase) redirect("/login");
  if (!isAdminUser(user)) redirect("/");
  return { supabase, user };
}
