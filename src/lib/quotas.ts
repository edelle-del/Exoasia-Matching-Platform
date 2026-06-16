import { createAdminClient } from "@/lib/supabase/admin";
import { isPayingSubscriber } from "./credits";

export type QuotaAction =
  | "view_investor_profile"
  | "request_intro_investor"
  | "unlock_community_profile"
  | "request_community_intro"
  | "view_pitch_deck"
  | "view_financials"
  | "request_intro_startup"
  | "post_announcement";

export const WEEKLY_LIMITS: Record<string, Partial<Record<QuotaAction, number>>> = {
  startup: {
    view_investor_profile: 3,
    request_intro_investor: 2,
    unlock_community_profile: 5,
    request_community_intro: 2,
  },
  investor: {
    unlock_community_profile: 10,
    request_community_intro: 2,
    view_pitch_deck: 1,
    view_financials: 1,
    request_intro_startup: 5,
  },
  ecosystem_partner: {
    request_community_intro: 2,
    post_announcement: 1,
  },
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

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("member_role").eq("id", userId).single();
  const role = profile?.member_role || "startup";
  
  const limit = WEEKLY_LIMITS[role]?.[action] ?? 0;
  if (limit === 0) {
    // If the role has no free allowance for this action, they must use fallback credits
    return { remaining: 0, total: 0, isPaid: false };
  }

  const weekStart = getCurrentWeekStart().toISOString();
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

  const { data: profile } = await admin.from("profiles").select("member_role").eq("id", userId).single();
  const role = profile?.member_role || "startup";
  
  const limit = WEEKLY_LIMITS[role]?.[action] ?? 0;
  if (limit === 0) return; // Cannot increment if limit is 0 (it requires credits)

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
