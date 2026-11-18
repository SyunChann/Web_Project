import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "./server";

// React cache lives for one server render, never across users or requests.
// Server Actions keep using a fresh client so auth mutations cannot reuse old results.
export const getSupabaseServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
});
