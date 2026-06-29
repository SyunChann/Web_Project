import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./config";

export function createSupabasePublicClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
