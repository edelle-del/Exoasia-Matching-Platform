import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required. Returns enough info for the accept-invite page
// to show context (project name, inviter name) before the user signs in.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from("cofounder_invites")
    .select("id, uid_type, uid_value, status, expires_at, project_id, inviter_id")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite link." }, { status: 404 });
  }

  const [{ data: project }, { data: inviter }] = await Promise.all([
    invite.project_id
      ? admin.from("projects").select("id, name, stage, sector").eq("id", invite.project_id).single()
      : Promise.resolve({ data: null }),
    admin.from("profiles").select("full_name, business_name").eq("id", invite.inviter_id).single(),
  ]);

  return NextResponse.json({
    invite: {
      id: invite.id,
      uid_type: invite.uid_type,
      uid_value: invite.uid_value,
      status: invite.status,
      expires_at: invite.expires_at,
      project: project ?? null,
      inviter: inviter ?? null,
    },
  });
}
