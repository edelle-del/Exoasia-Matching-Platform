import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { session } } = await supabase.auth.getSession();
  const { getRoleFromAccessToken } = await import("@/lib/auth/jwt");
  const role = getRoleFromAccessToken(session?.access_token);
  const isAdmin = role === "admin";

  // Fetch the event to check ownership
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("created_by")
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (!isAdmin && event.created_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    title?: string;
    type?: string;
    starts_at?: string;
    ends_at?: string | null;
    location?: string | null;
    description?: string | null;
    max_attendees?: number | null;
    rsvp_link?: string | null;
  };

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.starts_at !== undefined) updateData.starts_at = body.starts_at;
  if (body.ends_at !== undefined) updateData.ends_at = body.ends_at;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.max_attendees !== undefined) updateData.max_attendees = body.max_attendees;
  if (body.rsvp_link !== undefined) updateData.rsvp_link = body.rsvp_link;

  const { error } = await admin
    .from("events")
    .update(updateData)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
