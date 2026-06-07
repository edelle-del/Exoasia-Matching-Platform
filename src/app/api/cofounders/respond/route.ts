import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/cofounders/respond
// Body: { invite_id: string; action: "accept" | "decline" }
// Allows an already-signed-in user to accept or decline a cofounder invite
// in-app without needing the email token link.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invite_id, action } = (await request.json()) as {
      invite_id?: string;
      action?: "accept" | "decline";
    };

    if (!invite_id) return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invite, error: inviteError } = await admin
      .from("cofounder_invites")
      .select("id, inviter_id, uid_type, uid_value, status, expires_at, project_id")
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "This invite is no longer pending." }, { status: 400 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 400 });
    }

    // Verify the signed-in user's email matches the invited address
    if (
      invite.uid_type === "email" &&
      user.email?.toLowerCase() !== invite.uid_value.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address." },
        { status: 403 },
      );
    }

    if (action === "accept") {
      const { error: linkError } = await admin.from("cofounder_links").insert({
        founder_profile_id: invite.inviter_id,
        cofounder_profile_id: user.id,
        project_id: invite.project_id ?? null,
      });

      if (linkError && !linkError.message.includes("duplicate")) {
        return NextResponse.json({ error: "Failed to create cofounder link." }, { status: 500 });
      }

      await admin
        .from("cofounder_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      return NextResponse.json({ ok: true, action: "accepted", project_id: invite.project_id ?? null });
    }

    // decline
    await admin
      .from("cofounder_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);

    return NextResponse.json({ ok: true, action: "declined" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
