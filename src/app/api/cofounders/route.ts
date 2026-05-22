import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: invites }, { data: links }] = await Promise.all([
      supabase
        .from("cofounder_invites")
        .select("id, uid_type, uid_value, status, created_at, expires_at")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("cofounder_links")
        .select("id, cofounder_profile_id, created_at")
        .eq("founder_profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    // Enrich cofounder links with profile data
    const cofounderIds = (links ?? []).map((l) => l.cofounder_profile_id);
    let cofounderProfiles: Record<string, { full_name: string | null; business_name: string | null; email: string | null }> = {};

    if (cofounderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, email")
        .in("id", cofounderIds);
      cofounderProfiles = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p]),
      );
    }

    const cofounders = (links ?? []).map((l) => ({
      ...l,
      profile: cofounderProfiles[l.cofounder_profile_id] ?? null,
    }));

    return NextResponse.json({ invites: invites ?? [], cofounders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
