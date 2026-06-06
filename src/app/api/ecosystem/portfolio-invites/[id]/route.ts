import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { decision } = (await request.json().catch(() => ({}))) as {
      decision?: "accepted" | "declined";
    };

    if (decision !== "accepted" && decision !== "declined") {
      return NextResponse.json({ error: "decision must be accepted or declined" }, { status: 400 });
    }

    const { data: invite, error: fetchError } = await admin
      .from("portfolio_companies")
      .select("id, startup_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.startup_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite is no longer pending" }, { status: 409 });
    }

    const newStatus = decision === "accepted" ? "active" : "inactive";

    const { error: updateError } = await admin
      .from("portfolio_companies")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
