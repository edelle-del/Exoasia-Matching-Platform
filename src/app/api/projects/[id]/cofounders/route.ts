import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET  /api/projects/[id]/cofounders
// Returns:
//   - accepted: cofounders from cofounder_links with rich profile data (visible to all)
//   - pending:  pending cofounder_invites (only returned to the project owner)
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Accepted cofounders (publicly visible once accepted)
    const { data: links, error: linksError } = await admin
      .from("cofounder_links")
      .select("id, cofounder_profile_id, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

    const cofounderIds = (links ?? []).map((l) => l.cofounder_profile_id);
    let profileMap: Record<string, {
      full_name: string | null;
      business_name: string | null;
      email: string | null;
      role_title: string | null;
      short_bio: string | null;
      sector: string | null;
      city: string | null;
      linkedin_url: string | null;
    }> = {};

    if (cofounderIds.length > 0) {
      const { data: profileData } = await admin
        .from("profiles")
        .select("id, full_name, business_name, email, role_title, short_bio, sector, city, linkedin_url")
        .in("id", cofounderIds);
      profileMap = Object.fromEntries((profileData ?? []).map((p) => [p.id, p]));
    }

    const cofounders = (links ?? []).map((l) => ({
      ...l,
      profile: profileMap[l.cofounder_profile_id] ?? null,
    }));

    // Pending invites — only exposed to the project owner
    const { data: project } = await admin
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    let pendingInvites: { id: string; uid_value: string; token: string; created_at: string; expires_at: string }[] = [];

    if (project?.owner_id === user.id) {
      const { data: invites } = await admin
        .from("cofounder_invites")
        .select("id, uid_value, token, created_at, expires_at")
        .eq("project_id", id)
        .eq("inviter_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      pendingInvites = invites ?? [];
    }

    return NextResponse.json({ cofounders, pendingInvites });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

// DELETE /api/projects/[id]/cofounders
// Body: { link_id: string }   — removes an accepted cofounder
// Body: { invite_id: string } — cancels a pending invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Only the project owner may remove cofounders or cancel invites
    const { data: project } = await admin
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { link_id?: string; invite_id?: string };

    if (body.link_id) {
      // Remove an accepted cofounder
      const { error } = await admin
        .from("cofounder_links")
        .delete()
        .eq("id", body.link_id)
        .eq("project_id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.invite_id) {
      // Cancel a pending invite
      const { error } = await admin
        .from("cofounder_invites")
        .update({ status: "expired" })
        .eq("id", body.invite_id)
        .eq("inviter_id", user.id)
        .eq("status", "pending");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "link_id or invite_id is required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
