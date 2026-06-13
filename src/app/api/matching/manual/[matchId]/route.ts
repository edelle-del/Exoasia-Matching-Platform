import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertAdvisorRole() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleData?.role;

  if (!role || !["advisor", "staff", "admin"].includes(role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { error: authError } = await assertAdvisorRole();
    if (authError) return authError;

    const { matchId } = await params;
    const admin = createAdminClient();

    const { data: match, error: matchError } = await admin
      .from("matches")
      .select(
        "id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at, updated_at",
      )
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const { data: profiles } = await admin
      .from("profiles")
      .select("id, business_name, full_name, sector, stage, verification_status")
      .in("id", [match.member_a_id, match.member_b_id]);

    return NextResponse.json({ match, profiles: profiles ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { error: authError } = await assertAdvisorRole();
    if (authError) return authError;

    const { matchId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, "summary")) {
      updates.summary = body.summary ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "fit_score")) {
      updates.fit_score = body.fit_score ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      updates.status = body.status ?? "pending";
    }
    if (Object.prototype.hasOwnProperty.call(body, "member_a_status")) {
      updates.member_a_status = body.member_a_status ?? "pending";
    }
    if (Object.prototype.hasOwnProperty.call(body, "member_b_status")) {
      updates.member_b_status = body.member_b_status ?? "pending";
    }
    updates.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("matches")
      .update(updates)
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { error: authError } = await assertAdvisorRole();
    if (authError) return authError;

    const { matchId } = await params;
    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 },
    );
  }
}
