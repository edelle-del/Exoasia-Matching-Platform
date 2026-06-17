import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, reason } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error: insertError } = await admin.from("credit_requests").insert({
      user_id: user.id,
      amount,
      reason: reason.trim(),
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Submit Credit Request Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
