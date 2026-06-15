import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = (await request.json()) as { token: string };
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invite, error: inviteError } = await admin
      .from("cofounder_invites")
      .select("id, inviter_id, uid_type, uid_value, status, expires_at, project_id")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid invite." }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "This invite has already been used or cancelled." },
        { status: 400 },
      );
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 400 });
    }

    // Verify the accepting user's email matches the invited address
    if (
      invite.uid_type === "email" &&
      user.email?.toLowerCase() !== invite.uid_value.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address." },
        { status: 403 },
      );
    }

    // Use admin client to bypass the founder-only RLS on cofounder_links
    const { error: linkError } = await admin.from("cofounder_links").insert({
      founder_profile_id: invite.inviter_id,
      cofounder_profile_id: user.id,
      project_id: invite.project_id ?? null,
    });

    if (linkError && !linkError.message.includes("duplicate")) {
      return NextResponse.json(
        { error: "Failed to create cofounder link." },
        { status: 500 },
      );
    }

    await admin
      .from("cofounder_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    // Set flag so middleware knows they are an invited cofounder
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        is_invited_cofounder: true,
      },
    });

    return NextResponse.json({ success: true, project_id: invite.project_id ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
