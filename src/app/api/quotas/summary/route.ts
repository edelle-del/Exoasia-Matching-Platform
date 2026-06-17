import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEEKLY_LIMITS, getCurrentWeekStart, type QuotaAction } from "@/lib/quotas";
import { isPayingSubscriber } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    const role = profile?.member_role || "startup";
    const limits = WEEKLY_LIMITS[role] ?? {};
    
    // Check if paid subscriber
    const isPaid = await isPayingSubscriber(user.id);
    
    // Fetch all current weekly usage
    const weekStart = getCurrentWeekStart().toISOString();
    const { data: usageData } = await admin
      .from("user_weekly_usage")
      .select("action_type, usage_count")
      .eq("user_id", user.id)
      .eq("week_start", weekStart);

    const usageMap = new Map<string, number>();
    (usageData || []).forEach(row => {
      usageMap.set(row.action_type, row.usage_count);
    });

    const quotas = Object.entries(limits).map(([action, limit]) => {
      const used = usageMap.get(action) ?? 0;
      return {
        action: action as QuotaAction,
        limit,
        used,
        remaining: isPaid ? Infinity : Math.max(0, limit - used),
        isPaid
      };
    });

    return NextResponse.json({ quotas, isPaid });
  } catch (err: any) {
    console.error("Quotas Summary Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
