import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    const role = roleData?.role;

    if (!role || !["advisor", "staff", "admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [profilesRes, matchesRes, sparkRes] = await Promise.all([
      admin
        .from("profiles")
        .select("id, business_name, full_name, sector, stage, verification_status")
        .order("full_name", { ascending: true }),
      admin
        .from("matches")
        .select(
          "id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at",
        )
        .in("status", ["pending", "approved", "flagged", "accepted", "declined", "introduced"])
        .order("created_at", { ascending: false })
        .limit(500),
      admin
        .from("matches")
        .select("created_at")
        .eq("status", "accepted")
        .gte("created_at", since.toISOString()),
    ]);

    // Bucket accepted matches into 7-day sparkline
    const buckets = new Array(7).fill(0);
    (sparkRes.data ?? []).forEach((row) => {
      const idx = Math.floor(
        (new Date(row.created_at).getTime() - since.getTime()) / 86_400_000,
      );
      if (idx >= 0 && idx < 7) buckets[idx]++;
    });

    return NextResponse.json({
      companies: profilesRes.data ?? [],
      matches: matchesRes.data ?? [],
      sparkData: buckets.map((value) => ({ value })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
