import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: links, error } = await supabase
      .from("cofounder_links")
      .select("id, cofounder_profile_id, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cofounderIds = (links ?? []).map((l) => l.cofounder_profile_id);
    let profiles: Record<string, { full_name: string | null; business_name: string | null; email: string | null }> = {};

    if (cofounderIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, email")
        .in("id", cofounderIds);
      profiles = Object.fromEntries((profileData ?? []).map((p) => [p.id, p]));
    }

    const cofounders = (links ?? []).map((l) => ({
      ...l,
      profile: profiles[l.cofounder_profile_id] ?? null,
    }));

    return NextResponse.json({ cofounders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
