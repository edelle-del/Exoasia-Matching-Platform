import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Invite an existing platform user as a cofounder.
// Creates a pending cofounder_invite (same flow as email invite) rather than
// directly inserting into cofounder_links, so the invitee must accept first.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cofounder_id, project_id } = (await request.json()) as {
      cofounder_id?: string;
      project_id?: string;
    };

    if (!cofounder_id) return NextResponse.json({ error: "cofounder_id is required" }, { status: 400 });
    if (!project_id)   return NextResponse.json({ error: "project_id is required" },   { status: 400 });
    if (cofounder_id === user.id) return NextResponse.json({ error: "You cannot add yourself as a cofounder." }, { status: 400 });

    const admin = createAdminClient();

    // Verify caller owns or is already a cofounder on the project
    const { data: project } = await admin
      .from("projects")
      .select("owner_id, name")
      .eq("id", project_id)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (project.owner_id !== user.id) {
      const { data: link } = await admin
        .from("cofounder_links")
        .select("id")
        .eq("project_id", project_id)
        .eq("cofounder_profile_id", user.id)
        .single();
      if (!link) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up target profile's email
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", cofounder_id)
      .single();

    if (!targetProfile?.email) {
      return NextResponse.json({ error: "Member not found or has no email." }, { status: 404 });
    }

    const targetEmail = targetProfile.email.toLowerCase();

    // Already an accepted cofounder?
    const { data: existingLink } = await admin
      .from("cofounder_links")
      .select("id")
      .eq("project_id", project_id)
      .eq("cofounder_profile_id", cofounder_id)
      .maybeSingle();
    if (existingLink) {
      return NextResponse.json({ error: "This person is already a cofounder on this project." }, { status: 409 });
    }

    // Already has a pending invite?
    const { data: existingInvite } = await admin
      .from("cofounder_invites")
      .select("id")
      .eq("project_id", project_id)
      .eq("uid_value", targetEmail)
      .eq("status", "pending")
      .maybeSingle();
    if (existingInvite) {
      return NextResponse.json({ error: "An invite is already pending for this person." }, { status: 409 });
    }

    // Fetch inviter name for the email
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name, business_name")
      .eq("id", user.id)
      .single();
    const inviterName = inviterProfile?.full_name || inviterProfile?.business_name || "A founder";

    // Create the cofounder_invite entry
    const { data: invite, error: insertError } = await admin
      .from("cofounder_invites")
      .insert({
        inviter_id: user.id,
        uid_type: "email",
        uid_value: targetEmail,
        project_id,
      })
      .select("id, token")
      .single();

    if (insertError) throw insertError;

    // Send invite email (non-fatal if user already exists in auth)
    if (invite?.token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const acceptUrl = `${siteUrl}/accept-invite?token=${invite.token}`;
      try {
        await admin.auth.admin.inviteUserByEmail(targetEmail, {
          redirectTo: acceptUrl,
          data: {
            account_status: "invited",
            invite_inviter_name: inviterName,
            invite_project_name: project.name ?? null,
          },
        });
      } catch {
        // Non-fatal: existing auth users may not receive this call
      }
    }

    return NextResponse.json({ ok: true, pending: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
