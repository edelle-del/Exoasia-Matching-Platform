import { createAdminClient } from "@/lib/supabase/admin";
import { isPayingSubscriber } from "./credits";

export type QuotaAction =
  | "view_investor_profile"
  | "unlock_community_profile"
  | "view_pitch_deck"
  | "view_financials"
  | "post_announcement";

export const WEEKLY_LIMITS: Record<QuotaAction, number> = {
  view_investor_profile: 1,
  unlock_community_profile: 2,
  view_pitch_deck: 1,
  view_financials: 1,
  post_announcement: 1,
};

export function getCurrentWeekStart(): Date {
  const now = new Date();
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayOfWeek = now.getDay();
  let daysSinceMonday = (dayOfWeek + 6) % 7;

  // If today is Monday but before 6:00 AM, we belong to previous week's Monday
  if (daysSinceMonday === 0 && now.getHours() < 6) {
    daysSinceMonday = 7;
  }

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(6, 0, 0, 0);

  return weekStart;
}

export async function checkWeeklyQuota(
  userId: string,
  action: QuotaAction
): Promise<{ remaining: number; total: number; isPaid: boolean }> {
  const isPaid = await isPayingSubscriber(userId);
  if (isPaid) {
    return { remaining: Infinity, total: Infinity, isPaid: true };
  }

  const limit = WEEKLY_LIMITS[action];
  const weekStart = getCurrentWeekStart().toISOString();

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_weekly_usage")
    .select("usage_count")
    .eq("user_id", userId)
    .eq("action_type", action)
    .eq("week_start", weekStart)
    .single();

  const used = data?.usage_count ?? 0;
  return {
    remaining: Math.max(0, limit - used),
    total: limit,
    isPaid: false,
  };
}

export async function incrementWeeklyQuota(
  userId: string,
  action: QuotaAction
): Promise<void> {
  const isPaid = await isPayingSubscriber(userId);
  if (isPaid) return;

  const weekStart = getCurrentWeekStart().toISOString();
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_weekly_usage")
    .select("usage_count, id")
    .eq("user_id", userId)
    .eq("action_type", action)
    .eq("week_start", weekStart)
    .single();

  if (data) {
    await admin
      .from("user_weekly_usage")
      .update({ usage_count: data.usage_count + 1 })
      .eq("id", data.id);
  } else {
    await admin.from("user_weekly_usage").insert({
      user_id: userId,
      action_type: action,
      week_start: weekStart,
      usage_count: 1,
    });
  }
}

export async function hasPermanentUnlock(
  userId: string,
  assetType: string,
  assetId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("user_unlocked_assets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("asset_type", assetType)
    .eq("asset_id", assetId);

  return (count ?? 0) > 0;
}

export async function grantPermanentUnlock(
  userId: string,
  assetType: string,
  assetId: string
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_unlocked_assets").upsert({
    user_id: userId,
    asset_type: assetType,
    asset_id: assetId,
  });
}
