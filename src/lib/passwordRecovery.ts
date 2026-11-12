export const recoveryCookieName = "password-recovery";

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) return "weak";
  if (new TextEncoder().encode(password).length > 72) return "long";
  if (password !== confirmation) return "mismatch";
  return null;
}

export function parseRecoveryCredential(value?: string): { type: "token_hash" | "code"; value: string } | null {
  if (!value) return null;
  const separator = value.indexOf(":");
  const type = value.slice(0, separator);
  const credential = value.slice(separator + 1);
  if ((type !== "token_hash" && type !== "code") || !credential || credential.length > 2048) return null;
  return { type, value: credential };
}
