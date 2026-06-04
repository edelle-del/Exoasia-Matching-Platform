import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DiscoverProject = {
  project_id: string;
  project_name: string;
  stage: string | null;
  sector: string | null;
  description: string | null;
  owner_id: string;
  owner_name: string;
  already_in_portfolio: boolean;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Startups already in this partner's portfolio
    const { data: portfolio } = await admin
      .from("portfolio_companies")
      .select("startup_id")
      .eq("partner_id", user.id);

    const portfolioIds = new Set((portfolio ?? []).map((r) => r.startup_id));

    // All active startup projects
    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id, name, stage, sector, description, owner_id, profiles!owner_id(full_name, business_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    const rows: DiscoverProject[] = (projects ?? []).map((p) => {
      const owner = p.profiles as { full_name?: string | null; business_name?: string | null } | null;
      return {
        project_id: p.id,
        project_name: p.name,
        stage: p.stage,
        sector: p.sector,
        description: p.description ?? null,
        owner_id: p.owner_id,
        owner_name: owner?.business_name ?? owner?.full_name ?? "Unnamed startup",
        already_in_portfolio: portfolioIds.has(p.owner_id),
      };
    });

    return NextResponse.json({ projects: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
