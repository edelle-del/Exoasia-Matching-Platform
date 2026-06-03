import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvestorProjectRow = {
  project_id: string;
  project_name: string;
  stage: string | null;
  sector: string | null;
  owner_id: string;
  owner_name: string;
  access_status: "none" | "pending" | "approved" | "denied";
  access_request_id: string | null;
  drive_link: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find all startup owners the investor has an accepted match with
    const { data: matches, error: matchesError } = await admin
      .from("matches")
      .select("member_a_id, member_b_id")
      .eq("status", "accepted")
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`);

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 });
    }

    const matchedOwnerIds = (matches ?? []).map((m) =>
      m.member_a_id === user.id ? m.member_b_id : m.member_a_id,
    );

    if (matchedOwnerIds.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    // Only projects owned by matched startups
    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id, name, stage, sector, owner_id, drive_link, profiles!owner_id(full_name, business_name)")
      .eq("is_active", true)
      .in("owner_id", matchedOwnerIds)
      .order("created_at", { ascending: false });

    if (projectsError) {
      return NextResponse.json({ error: projectsError.message }, { status: 500 });
    }

    // All access requests this investor has made
    const { data: requests } = await admin
      .from("data_room_access_requests")
      .select("id, owner_id, status")
      .eq("requester_id", user.id);

    const requestByOwner = new Map(
      (requests ?? []).map((r) => [r.owner_id, r]),
    );

    const rows: InvestorProjectRow[] = (projects ?? []).map((p) => {
      const owner = p.profiles as { full_name?: string | null; business_name?: string | null } | null;
      const req = requestByOwner.get(p.owner_id);
      const status = (req?.status as InvestorProjectRow["access_status"]) ?? "none";
      return {
        project_id: p.id,
        project_name: p.name,
        stage: p.stage,
        sector: p.sector,
        owner_id: p.owner_id,
        owner_name: owner?.full_name ?? owner?.business_name ?? "Unnamed startup",
        access_status: status,
        access_request_id: req?.id ?? null,
        drive_link: status === "approved" ? (p.drive_link ?? null) : null,
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
