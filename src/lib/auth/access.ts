export type AppRole = string | null | undefined;

export const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/accept-invite",
  "/get-invited",
  "/not-authorized",
  "/reset-password",
  "/auth/callback",
  "/docs",
  "/privacy",
  "/terms",
] as const;

export const MEMBER_PATH_PREFIXES = [
  "/dashboard",
  "/profile",
  "/startup",
  "/account-settings",
  "/notifications",
  "/requests",
  "/matches",
  "/deal-board",
  "/documents",
  "/events",
  "/payments",
  "/community",
  "/projects",
  "/data-room",  // covers /data-room and /data-room/[projectId]
  "/ecosystem",
  "/stage-1",
  "/stage-2",
  "/stage-3",
  "/stage-4",
  "/announcements",
  "/feature-requests",
  "/report-bug",
] as const;

export const ADVISOR_PATH_PREFIXES = [
  "/advisor/manual-match",
  "/advisor/network-graph",
  "/advisor/members",
  "/advisor/documents",
  "/advisor/match-queue",
  "/advisor/introductions",
] as const;
export const ADMIN_PATH_PREFIXES = ["/admin"] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number]);
}

export function getRoleAccessPrefixes(role: AppRole) {
  if (role === "advisor") {
    return ["/dashboard", ...ADVISOR_PATH_PREFIXES, ...MEMBER_PATH_PREFIXES];
  }

  if (role === "admin") {
    return ["/dashboard", ...ADVISOR_PATH_PREFIXES, ...ADMIN_PATH_PREFIXES, ...MEMBER_PATH_PREFIXES];
  }

  return [...MEMBER_PATH_PREFIXES];
}

export function canAccessPath(pathname: string, role: AppRole) {
  if (isPublicPath(pathname)) return true;

  return getRoleAccessPrefixes(role).some((prefix) =>
    pathname.startsWith(prefix),
  );
}

export function getHomePathForRole(role: AppRole) {
  return "/dashboard";
}

export function getSignedInRedirectPath(options: {
  role: AppRole;
  isInvitedAccount: boolean;
  needsOnboarding: boolean;
}) {
  const { role, isInvitedAccount, needsOnboarding } = options;

  if (isInvitedAccount) {
    return "/accept-invite";
  }

  if (needsOnboarding) {
    return "/onboarding";
  }

  return "/dashboard";
}
