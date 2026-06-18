import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function canonicalizePair(memberAId: string, memberBId: string) {
  return memberAId < memberBId
    ? { member_a_id: memberAId, member_b_id: memberBId }
    : { member_a_id: memberBId, member_b_id: memberAId };
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { member_a_id, member_b_id, summary, fit_score } = body;
    if (!member_a_id || !member_b_id) {
      return NextResponse.json(
        { error: "member_a_id and member_b_id required" },
        { status: 400 },
      );
    }

    const pair = canonicalizePair(member_a_id, member_b_id);

    const row = {
      ...pair,
      fit_score: fit_score ?? null,
      summary: summary ?? null,
      rationale: "Manual advisor match",
      status: "approved",
      member_a_status: "pending",
      member_b_status: "pending",
      created_at: new Date().toISOString(),
    } as any;

    const adminClient = createAdminClient();
    const { error: upsertError } = await adminClient
      .from("matches")
      .upsert([row], { onConflict: "member_a_id,member_b_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
