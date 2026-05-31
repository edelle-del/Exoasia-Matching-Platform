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
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // All active projects with owner name — exclude the investor's own projects
    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id, name, stage, sector, owner_id, profiles!owner_id(full_name, business_name)")
      .eq("is_active", true)
      .neq("owner_id", user.id)
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
      return {
        project_id: p.id,
        project_name: p.name,
        stage: p.stage,
        sector: p.sector,
        owner_id: p.owner_id,
        owner_name: owner?.full_name ?? owner?.business_name ?? "Unnamed startup",
        access_status: (req?.status as InvestorProjectRow["access_status"]) ?? "none",
        access_request_id: req?.id ?? null,
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
