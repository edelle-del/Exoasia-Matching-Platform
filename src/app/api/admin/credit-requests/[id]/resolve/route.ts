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

    const { action } = await req.json(); // 'approve' or 'reject'
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { id: requestId } = await params;

    // Get the request
    const { data: request, error: reqError } = await admin
      .from("credit_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already resolved" }, { status: 400 });
    }

    // Update status
    const status = action === "approve" ? "approved" : "rejected";
    const { error: updateError } = await admin
      .from("credit_requests")
      .update({ status })
      .eq("id", requestId);

    if (updateError) {
      throw updateError;
    }

    // If approved, insert into ledger
    if (action === "approve") {
      const { error: insertError } = await admin.from("ad_credit_ledger").insert({
        member_id: request.user_id,
        change_amount: request.amount,
        reason: `Approved request: ${request.reason || "Admin Approved"}`,
        expires_at: request.amount > 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      });
      if (insertError) {
        // We probably should handle partial failure better, but throw for now
        throw insertError;
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error("Resolve Credit Request Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
