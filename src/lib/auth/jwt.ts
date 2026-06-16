type JwtPayload = {
  user_role?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  amr?: Array<{ method: string; timestamp: number }>;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf-8");
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRoleFromAccessToken(accessToken?: string | null) {
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload?.user_role) return null;
  return payload.user_role;
}
