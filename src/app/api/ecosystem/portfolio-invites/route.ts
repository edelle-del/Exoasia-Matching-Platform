import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortfolioInvite = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_role: string | null;
  partner_role_title: string | null;
  partner_sector: string | null;
  partner_city: string | null;
  partner_bio: string | null;
  partner_ask_categories: string[];
  partner_offer_categories: string[];
  partner_linkedin_url: string | null;
  partner_verification_status: string | null;
  nominated_at: string;
  eco_score: number | null;
  eco_summary: string | null;
  scored_project_id: string | null;
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

    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error } = await admin
      .from("portfolio_companies")
      .select("id, partner_id, nominated_at")
      .eq("startup_id", user.id)
      .eq("status", "pending")
      .order("nominated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const partnerIds = [...new Set((rows ?? []).map((r) => r.partner_id))];

    // Fetch current user's project IDs and partner profiles in parallel
    const [{ data: myProjects }, { data: partners }] = await Promise.all([
      admin.from("projects").select("id").eq("owner_id", user.id).eq("is_active", true),
      partnerIds.length > 0
        ? admin
            .from("profiles")
            .select("id, full_name, business_name, member_role, role_title, sector, city, short_bio, ask_categories, offer_categories, linkedin_url, verification_status")
            .in("id", partnerIds)
        : Promise.resolve({ data: [] }),
    ]);

    const myProjectIds = (myProjects ?? []).map((p) => p.id);

    // Fetch mandate-fit scores for this user's projects from these partners
    const { data: scores } = myProjectIds.length > 0 && partnerIds.length > 0
      ? await admin
          .from("ecosystem_match_scores")
          .select("project_id, eco_partner_profile_id, fit_score, summary")
          .in("project_id", myProjectIds)
          .in("eco_partner_profile_id", partnerIds)
          .order("fit_score", { ascending: false })
      : { data: [] };

    // Best score per partner
    const bestScoreByPartner = new Map<string, { fit_score: number; summary: string | null; project_id: string }>();
    for (const s of (scores ?? [])) {
      const existing = bestScoreByPartner.get(s.eco_partner_profile_id);
      if (!existing || s.fit_score > existing.fit_score) {
        bestScoreByPartner.set(s.eco_partner_profile_id, {
          fit_score: s.fit_score,
          summary: s.summary ?? null,
          project_id: s.project_id,
        });
      }
    }

    const partnerMap = new Map(
      (partners ?? []).map((p) => [p.id, p]),
    );

    const invites: PortfolioInvite[] = (rows ?? []).map((r) => {
      const partner = partnerMap.get(r.partner_id);
      const score = bestScoreByPartner.get(r.partner_id);
      return {
        id: r.id,
        partner_id: r.partner_id,
        partner_name: partner?.business_name || partner?.full_name || "Ecosystem partner",
        partner_role: partner?.member_role ?? null,
        partner_role_title: partner?.role_title ?? null,
        partner_sector: partner?.sector ?? null,
        partner_city: partner?.city ?? null,
        partner_bio: partner?.short_bio ?? null,
        partner_ask_categories: (partner?.ask_categories as string[] | null) ?? [],
        partner_offer_categories: (partner?.offer_categories as string[] | null) ?? [],
        partner_linkedin_url: partner?.linkedin_url ?? null,
        partner_verification_status: partner?.verification_status ?? null,
        nominated_at: r.nominated_at,
        eco_score: score?.fit_score ?? null,
        eco_summary: score?.summary ?? null,
        scored_project_id: score?.project_id ?? null,
      };
    });

    return NextResponse.json({ invites });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
