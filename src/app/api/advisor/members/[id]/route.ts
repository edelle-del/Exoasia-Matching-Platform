import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STAGES = ["0", "1", "2", "3", "4"] as const;
const VALID_VERIFICATION = ["unverified", "pending", "verified"] as const;
const VALID_ACCOUNT_STATUSES = ["active", "suspended"] as const;

async function assertAdvisorAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleData?.role;

  if (!role || !["advisor", "staff", "admin"].includes(role)) {
    return {
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, error } = await assertAdvisorAccess();
    if (error || !supabase) return error;

    const { id: memberId } = await params;
    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, string> = {};

    if (Object.prototype.hasOwnProperty.call(body, "stage")) {
      if (!VALID_STAGES.includes(body.stage)) {
        return NextResponse.json(
          { error: "Invalid stage value" },
          { status: 400 },
        );
      }
      updates.stage = body.stage;
    }

    if (Object.prototype.hasOwnProperty.call(body, "verification_status")) {
      if (!VALID_VERIFICATION.includes(body.verification_status)) {
        return NextResponse.json(
          { error: "Invalid verification_status value" },
          { status: 400 },
        );
      }
      updates.verification_status = body.verification_status;
    }

    if (Object.prototype.hasOwnProperty.call(body, "account_status")) {
      if (!VALID_ACCOUNT_STATUSES.includes(body.account_status)) {
        return NextResponse.json(
          { error: "Invalid account_status value" },
          { status: 400 },
        );
      }
      updates.account_status = body.account_status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", memberId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
