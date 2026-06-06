import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/projects/[id]/investor-matches
// Startup owner fetches investor match scores for their project
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single();

    if (!project || project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: scores, error } = await admin
      .from("project_match_scores")
      .select("investor_profile_id, fit_score, summary, rationale, generated_at")
      .eq("project_id", projectId)
      .order("fit_score", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!scores || scores.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Enrich with investor profile data
    const investorIds = scores.map((s) => s.investor_profile_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select(
        "id, full_name, business_name, sector, city, short_bio, linkedin_url, role_title, years_in_operation, employee_band, verification_status, asks_summary",
      )
      .in("id", investorIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const matches = scores.map((s) => {
      const profile = profileMap.get(s.investor_profile_id);
      return {
        investor_profile_id: s.investor_profile_id,
        fit_score: s.fit_score,
        summary: s.summary,
        rationale: s.rationale,
        generated_at: s.generated_at,
        investor_name: profile?.business_name || profile?.full_name || "Investor",
        investor_full_name: profile?.full_name ?? null,
        investor_sector: profile?.sector ?? null,
        investor_city: profile?.city ?? null,
        investor_bio: profile?.short_bio ?? null,
        investor_linkedin: profile?.linkedin_url ?? null,
        investor_role_title: profile?.role_title ?? null,
        investor_years: profile?.years_in_operation ?? null,
        investor_employee_band: profile?.employee_band ?? null,
        investor_verification: profile?.verification_status ?? null,
        investor_asks_summary: profile?.asks_summary ?? null,
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
