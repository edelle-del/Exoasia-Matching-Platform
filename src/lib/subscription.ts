export function hasActiveSubscription(profile: {
  subscription_plan?: string | null;
  subscription_ends_at?: string | null;
} | null | undefined, now = Date.now()): boolean {
  if (!profile?.subscription_plan || profile.subscription_plan === "free") return false;
  if (!profile.subscription_ends_at) return true;
  const expiry = Date.parse(profile.subscription_ends_at);
  return Number.isFinite(expiry) && expiry > now;
}
