import type { User } from "@supabase/supabase-js";

const developmentAdminEmails = ["admin@example.com"];

function getAdminEmails() {
  const envValue = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = envValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length) {
    return emails;
  }

  return process.env.NODE_ENV === "development" ? developmentAdminEmails : [];
}

export function isAdminUser(user: User | null) {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email);
}
