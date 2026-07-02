import type { User } from "@supabase/supabase-js";

const fallbackAdminEmails = ["admin@example.com"];

function getAdminEmails() {
  const envValue = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = envValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return emails.length ? emails : fallbackAdminEmails;
}

export function isAdminUser(user: User | null) {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email);
}
