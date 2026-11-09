import type { User } from "@supabase/supabase-js";

const developmentAdminEmails = ["admin@example.com"];

export type AdminConfiguration = {
  emails: string[];
  source: "environment" | "development-fallback" | "unconfigured";
};

export function getAdminConfiguration(): AdminConfiguration {
  const envValue = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const emails = envValue
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length) {
    return { emails, source: "environment" };
  }

  if (process.env.NODE_ENV === "development") {
    return {
      emails: developmentAdminEmails,
      source: "development-fallback",
    };
  }

  return { emails: [], source: "unconfigured" };
}

export function isAdminUser(user: User | null) {
  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    return false;
  }

  return getAdminConfiguration().emails.includes(email);
}
