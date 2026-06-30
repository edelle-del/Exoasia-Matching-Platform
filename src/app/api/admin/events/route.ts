import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

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

  const { data: { session } } = await supabase.auth.getSession();
  const { getRoleFromAccessToken } = await import("@/lib/auth/jwt");
  const role = getRoleFromAccessToken(session?.access_token);
  const isAdmin = role === "admin";

  if (profile?.stage !== "4" && profile?.member_role !== "ecosystem_partner" && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ecosystem partners pay 5 credits to post an event; stage-4 advisors and admins post for free
  if (profile?.member_role === "ecosystem_partner" && !isAdmin) {
    const POST_COST = 5;

    const { data: ledgerRows } = await admin
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", user.id);

    const balance = (ledgerRows ?? []).reduce(
      (sum, r) => sum + Number(r.change_amount ?? 0),
      0,
    );

    if (!BYPASS_CREDIT_GATES && balance < POST_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${POST_COST} credits but have ${balance}.`, needed: POST_COST, balance },
        { status: 402 },
      );
    }

    const { error: deductError } = await admin.from("ad_credit_ledger").insert({
      member_id: user.id,
      change_amount: -POST_COST,
      reason: `Post opportunity/program call`,
    });

    if (deductError) {
      return NextResponse.json({ error: deductError.message }, { status: 500 });
    }
  }

  const body = await req.json() as {
    title: string;
    type: string;
    starts_at: string;
    ends_at?: string;
    location?: string;
    description?: string;
    max_attendees?: number;
    postAsAnnouncement?: boolean;
    rsvp_link?: string;
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
      rsvp_link:     body.rsvp_link ?? null,
      created_by:    user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.postAsAnnouncement) {
    const formattedDate = new Date(body.starts_at).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    let content = body.description ? body.description + "\n\n" : "";
    content += `**Date:** ${formattedDate}\n`;
    if (body.location) content += `**Location:** ${body.location}\n`;
    
    await admin.from("announcements").insert({
      author_id: user.id,
      title: `Upcoming Event: ${body.title}`,
      content: content.trim(),
      is_featured: false,
    });
  }

  return NextResponse.json({ id: data.id });
}
