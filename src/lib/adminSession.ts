import "server-only";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin";
import { getSupabaseServerSession } from "@/lib/supabase/session";

export async function requireAdminSession() {
  const { supabase, user } = await getSupabaseServerSession();
  if (!user || !supabase) redirect("/login");
  if (!isAdminUser(user)) redirect("/");
  return { supabase, user };
}
