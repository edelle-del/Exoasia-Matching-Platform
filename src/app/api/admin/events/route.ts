import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const admin    = createAdminClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stage, member_role")
    .eq("id", user.id)
    .single();

  if (profile?.stage !== "4" && profile?.member_role !== "ecosystem_partner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    title: string;
    type: string;
    starts_at: string;
    ends_at?: string;
    location?: string;
    description?: string;
    max_attendees?: number;
  };

  if (!body.title || !body.starts_at) {
    return NextResponse.json({ error: "title and starts_at are required" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("events")
    .insert({
      title:         body.title,
      type:          body.type ?? "session",
      starts_at:     body.starts_at,
      ends_at:       body.ends_at ?? null,
      location:      body.location ?? null,
      description:   body.description ?? null,
      max_attendees: body.max_attendees ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
