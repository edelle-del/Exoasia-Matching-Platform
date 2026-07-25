import { SupabaseClient } from "@supabase/supabase-js";
import { deductCredits, InsufficientCreditsError } from "./credits";
import { checkWeeklyQuota, incrementWeeklyQuota } from "./quotas";

export type RequestType = "intro_request" | "community_request";

export async function authorizeRequest(
  adminClient: SupabaseClient,
  userId: string,
  userRole: "startup" | "investor" | "ecosystem_partner",
  requestType: RequestType
): Promise<void> {
  // 1. Check if user is a paid subscriber
  const { data: profile } = await adminClient
    .from("profiles")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  if (profile && profile.subscription_plan && profile.subscription_plan !== "free") {
    // Paid Subscription Plan = Automatically authorize
    return;
  }

  // 2. Free Tier Logic
  // Evaluate the server transaction timestamp using Asia/Manila (PHT)
  const now = new Date();
  const phtDateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Returns MM/DD/YYYY, let's convert to YYYY-MM-DD for DB
  const [month, day, year] = phtDateStr.split("/");
  const datePht = `${year}-${month}-${day}`;

  const phtDayOfWeekStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(now);

  // Map to 1=Monday... 7=Sunday
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const currentDay = dayMap[phtDayOfWeekStr];

  const isMissingDailyUsageTableError = (error: any): boolean => {
    return error?.code === "PGRST205" && /user_daily_usage/.test(error?.message);
  };

  // Helper to process daily usage and deduct credits
  const processUsage = async (
    isValidDay: boolean,
    actionStr: "REQUEST_INTRO_INVESTOR" | "REQUEST_FOUNDER_INTRO" | "REQUEST_COMMUNITY_INTRO",
    allowedLimit: number = 1
  ) => {
    let useFreeCredit = false;
    let currentCount = 0;
    let tableMissing = false;

    if (isValidDay) {
      if (requestType === "community_request") {
        const { remaining } = await checkWeeklyQuota(userId, "request_community_intro", adminClient);
        if (remaining > 0) {
          useFreeCredit = true;
        }
      } else {
        // Check user_daily_usage
        const { data: usage, error } = await adminClient
          .from("user_daily_usage")
          .select("count")
          .eq("user_id", userId)
          .eq("action_type", requestType)
          .eq("date_pht", datePht)
          .maybeSingle();

        if (error) {
          if (isMissingDailyUsageTableError(error)) {
            tableMissing = true;
            currentCount = 0;
          } else {
            throw new Error(`Failed to query daily usage: ${error.message}`);
          }
        } else {
          currentCount = usage?.count || 0;
        }

        if (currentCount < allowedLimit) {
          useFreeCredit = true;
        }
      }
    }

    if (useFreeCredit) {
      // Authorize as free and increment
      if (requestType !== "community_request" && !tableMissing) {
        const { error } = await adminClient
          .from("user_daily_usage")
          .upsert(
            {
              user_id: userId,
              action_type: requestType,
              date_pht: datePht,
              count: currentCount + 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,action_type,date_pht" }
          );

        if (error) {
          if (!isMissingDailyUsageTableError(error)) {
            throw new Error(`Failed to update daily usage: ${error.message}`);
          }
          tableMissing = true;
        }
      }

      let quotaAction: import("./quotas").QuotaAction | null = null;
      if (requestType === "intro_request") {
        quotaAction = userRole === "startup" ? "request_intro_investor" : "request_intro_startup";
      } else if (requestType === "community_request") {
        quotaAction = "request_community_intro";
      }
      if (quotaAction) {
        await incrementWeeklyQuota(userId, quotaAction, adminClient);
      }

      return; // Authorized for free
    }

    // Otherwise, deduct fallback fee
    await deductCredits(userId, actionStr);
  };

  if (requestType === "intro_request") {
    // Days 1 (Mon) and 4 (Thu)
    const isValidDay = currentDay === 1 || currentDay === 4;
    
    let allowedLimit = 1; // Default for startups
    if (userRole === "investor") {
      if (currentDay === 1) allowedLimit = 3;
      if (currentDay === 4) allowedLimit = 2;
    }

    const actionStr = userRole === "startup" ? "REQUEST_INTRO_INVESTOR" : "REQUEST_FOUNDER_INTRO";
    await processUsage(isValidDay, actionStr, allowedLimit);
  } else if (requestType === "community_request") {
    // Days 3 (Wed) and 6 (Sat)
    const isValidDay = currentDay === 3 || currentDay === 6;
    await processUsage(isValidDay, "REQUEST_COMMUNITY_INTRO", 1);
  }
}
