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

    const { id: jobId } = await params;
    const admin = createAdminClient();

    // Verify ownership and update status to acknowledged
    const { data: job, error } = await admin
      .from("background_jobs")
      .update({ status: "acknowledged" })
      .eq("id", jobId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found or could not be updated." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Acknowledge Job Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
