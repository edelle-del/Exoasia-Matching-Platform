import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { match_id, startup_id } = body as { match_id?: string; startup_id?: string };

    if (!match_id || !startup_id) {
      return NextResponse.json({ error: "match_id and startup_id are required" }, { status: 400 });
    }

    // Verify this startup is in the partner's portfolio
    const { data: entry } = await admin
      .from("portfolio_companies")
      .select("id")
      .eq("partner_id", user.id)
      .eq("startup_id", startup_id)
      .eq("status", "active")
      .single();

    if (!entry) {
      return NextResponse.json({ error: "Startup not in your active portfolio" }, { status: 403 });
    }

    // Touch updated_at so the match is no longer stale
    const { error: updateError } = await admin
      .from("matches")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", match_id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
