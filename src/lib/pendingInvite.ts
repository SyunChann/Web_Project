export const pendingInviteCookieName = "pending_invite_code";

export function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase();
}

export function getPendingInviteCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
