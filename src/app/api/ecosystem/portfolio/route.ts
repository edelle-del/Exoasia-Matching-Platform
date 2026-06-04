import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortfolioProject = {
  id: string;
  name: string;
  stage: string | null;
  sector: string | null;
  description: string | null;
  best_fit_score: number | null;
  investor_match_count: number;
  eco_fit_score: number | null;
};

export type PortfolioMatch = {
  id: string;
  status: string;
  fit_score: number | null;
  counterpart_name: string;
  deal_stage: string | null;
  last_updated: string;
  is_stale: boolean;
};

export type PortfolioCompany = {
  startup_id: string;
  portfolio_entry_id: string;
  status: string;
  business_name: string | null;
  full_name: string | null;
  sector: string | null;
  stage: string | null;
  verification_status: string | null;
  best_eco_fit_score: number | null;
  projects: PortfolioProject[];
  matches: PortfolioMatch[];
};

export type PortfolioResponse = {
  companies: PortfolioCompany[];
  stats: {
    total_companies: number;
    total_projects: number;
    total_matches: number;
    active_matches: number;
    pending: number;
    stale_count: number;
  };
};

const STALE_DAYS = 7;

function isStale(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) > STALE_DAYS * 86_400_000;
}

export async function POST(request: Request) {
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

    const { startup_id } = (await request.json().catch(() => ({}))) as { startup_id?: string };
    if (!startup_id) {
      return NextResponse.json({ error: "startup_id is required" }, { status: 400 });
    }

    // Verify the target is a startup
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, member_role")
      .eq("id", startup_id)
      .single();

    if (!targetProfile || targetProfile.member_role !== "startup") {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }

    const { error: insertError } = await admin
      .from("portfolio_companies")
      .insert({ partner_id: user.id, startup_id, status: "pending" });

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing } = await admin
          .from("portfolio_companies")
          .select("id, status")
          .eq("partner_id", user.id)
          .eq("startup_id", startup_id)
          .single();

        if (existing?.status === "pending") {
          return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
        }
        if (existing?.status === "active") {
          return NextResponse.json({ error: "Already in your portfolio" }, { status: 409 });
        }

        const { error: updateError } = await admin
          .from("portfolio_companies")
          .update({ status: "pending", nominated_at: new Date().toISOString() })
          .eq("id", existing!.id);

        if (updateError) throw updateError;
        return NextResponse.json({ ok: true, status: "pending" });
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is an ecosystem_partner
    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch portfolio entries
    const { data: portfolioRows } = await admin
      .from("portfolio_companies")
      .select("id, startup_id, status")
      .eq("partner_id", user.id)
      .in("status", ["active", "pending"]);

    if (!portfolioRows || portfolioRows.length === 0) {
      return NextResponse.json({
        companies: [],
        stats: { total_companies: 0, total_projects: 0, total_matches: 0, active_matches: 0, pending: 0, stale_count: 0 },
      } satisfies PortfolioResponse);
    }

    const startupIds = portfolioRows.map((r) => r.startup_id);

    // 2. Fetch startup profiles
    const { data: startupProfiles } = await admin
      .from("profiles")
      .select("id, full_name, business_name, sector, stage, verification_status")
      .in("id", startupIds);

    const profileMap = new Map(
      (startupProfiles ?? []).map((p) => [p.id, p]),
    );

    // 3. Fetch projects for all startups
    const { data: allProjects } = await admin
      .from("projects")
      .select("id, owner_id, name, stage, sector, description")
      .in("owner_id", startupIds)
      .eq("is_active", true);

    const projectsByOwner = new Map<string, typeof allProjects>();
    (allProjects ?? []).forEach((p) => {
      const arr = projectsByOwner.get(p.owner_id) ?? [];
      arr.push(p);
      projectsByOwner.set(p.owner_id, arr);
    });

    // 4. Fetch project match scores
    const projectIds = (allProjects ?? []).map((p) => p.id);
    const { data: allScores } = projectIds.length > 0
      ? await admin
          .from("project_match_scores")
          .select("project_id, fit_score")
          .in("project_id", projectIds)
      : { data: [] };

    // Group investor scores by project
    const scoresByProject = new Map<string, number[]>();
    (allScores ?? []).forEach((s) => {
      const arr = scoresByProject.get(s.project_id) ?? [];
      arr.push(s.fit_score);
      scoresByProject.set(s.project_id, arr);
    });

    // 4b. Fetch eco mandate-fit scores for this partner
    const { data: ecoScores } = projectIds.length > 0
      ? await admin
          .from("ecosystem_match_scores")
          .select("project_id, fit_score")
          .eq("eco_partner_profile_id", user.id)
          .in("project_id", projectIds)
      : { data: [] };

    const ecoScoreByProject = new Map<string, number>();
    (ecoScores ?? []).forEach((s) => {
      ecoScoreByProject.set(s.project_id, s.fit_score);
    });

    // 5. Fetch matches for all startups
    const { data: allMatches } = await admin
      .from("matches")
      .select("id, member_a_id, member_b_id, fit_score, status, member_a_status, member_b_status, updated_at, created_at")
      .or(startupIds.map((id) => `member_a_id.eq.${id},member_b_id.eq.${id}`).join(","))
      .in("status", ["pending", "approved", "accepted", "introduced"]);

    // Enrich with counterpart names
    const counterpartIds = [
      ...new Set(
        (allMatches ?? []).map((m) =>
          startupIds.includes(m.member_a_id) ? m.member_b_id : m.member_a_id,
        ),
      ),
    ];

    const { data: counterparts } = counterpartIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", counterpartIds)
      : { data: [] };

    const counterpartNameMap = new Map(
      (counterparts ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified member"]),
    );

    // 6. Fetch deal cards for all startups
    const { data: allDealCards } = await admin
      .from("deal_cards")
      .select("id, buyer_member_id, provider_member_id, title, stage, last_updated_at")
      .or(startupIds.map((id) => `buyer_member_id.eq.${id},provider_member_id.eq.${id}`).join(","))
      .not("stage", "in", '("Closed-Won / Pilot Go","Closed-Lost / On Hold")');

    const dealCardsByStartup = new Map<string, typeof allDealCards>();
    (allDealCards ?? []).forEach((d) => {
      const ownerId = startupIds.includes(d.buyer_member_id) ? d.buyer_member_id : d.provider_member_id;
      const arr = dealCardsByStartup.get(ownerId) ?? [];
      arr.push(d);
      dealCardsByStartup.set(ownerId, arr);
    });

    // 7. Assemble per-company data
    const companies: PortfolioCompany[] = portfolioRows.map((row) => {
      const prof = profileMap.get(row.startup_id);
      const rawProjects = projectsByOwner.get(row.startup_id) ?? [];

      const projects: PortfolioProject[] = rawProjects.map((p) => {
        const scores = scoresByProject.get(p.id) ?? [];
        return {
          id: p.id,
          name: p.name,
          stage: p.stage,
          sector: p.sector,
          description: p.description ?? null,
          best_fit_score: scores.length > 0 ? Math.max(...scores) : null,
          investor_match_count: scores.length,
          eco_fit_score: ecoScoreByProject.get(p.id) ?? null,
        };
      });

      const startupMatches = (allMatches ?? []).filter(
        (m) => m.member_a_id === row.startup_id || m.member_b_id === row.startup_id,
      );

      const matchedDealStageById = new Map(
        (dealCardsByStartup.get(row.startup_id) ?? []).map((d) => [d.id, d.stage]),
      );
      void matchedDealStageById;

      const matches: PortfolioMatch[] = startupMatches.map((m) => {
        const cpId = m.member_a_id === row.startup_id ? m.member_b_id : m.member_a_id;
        const updatedAt = m.updated_at ?? m.created_at;
        return {
          id: m.id,
          status: m.status,
          fit_score: m.fit_score,
          counterpart_name: counterpartNameMap.get(cpId) ?? "Verified member",
          deal_stage: null,
          last_updated: updatedAt,
          is_stale: isStale(updatedAt),
        };
      });

      const ecoScores = projects.map((p) => p.eco_fit_score).filter((s): s is number => s !== null);

      return {
        startup_id: row.startup_id,
        portfolio_entry_id: row.id,
        status: row.status,
        business_name: prof?.business_name ?? null,
        full_name: prof?.full_name ?? null,
        sector: prof?.sector ?? null,
        stage: prof?.stage ?? null,
        verification_status: prof?.verification_status ?? null,
        best_eco_fit_score: ecoScores.length > 0 ? Math.max(...ecoScores) : null,
        projects,
        matches,
      };
    });

    // 8. Aggregate stats
    const allMatchesFlat  = companies.flatMap((c) => c.matches);
    const activeMatches   = allMatchesFlat.filter((m) => ["accepted", "introduced"].includes(m.status));
    const pendingMatches  = allMatchesFlat.filter((m) => ["pending", "approved"].includes(m.status));
    const staleCount      = allMatchesFlat.filter((m) => m.is_stale).length;

    const stats = {
      total_companies: companies.length,
      total_projects:  companies.reduce((s, c) => s + c.projects.length, 0),
      total_matches:   allMatchesFlat.length,
      active_matches:  activeMatches.length,
      pending:         pendingMatches.length,
      stale_count:     staleCount,
    };

    return NextResponse.json({ companies, stats } satisfies PortfolioResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
