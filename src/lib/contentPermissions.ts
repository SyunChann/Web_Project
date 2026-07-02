import type { User } from "@supabase/supabase-js";
import { isAdminUser } from "@/lib/admin";

export function canManageContent(user: User | null, authorId?: string | null) {
  if (!user) {
    return false;
  }

  return isAdminUser(user) || Boolean(authorId && authorId === user.id);
}
