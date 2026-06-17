import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify admin role
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { amount, reason } = await req.json();
    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const { id: targetUserId } = await params;

    // Insert into ad_credit_ledger
    const { error: insertError } = await admin.from("ad_credit_ledger").insert({
      member_id: targetUserId,
      change_amount: amount,
      reason: reason || "Admin Grant",
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Grant Credits Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
