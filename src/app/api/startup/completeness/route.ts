import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompletenessCategory = "profile" | "project" | "data_room" | "investment" | "partnership";

export type CompletenessItem = {
  id: string;
  category: CompletenessCategory;
  label: string;
  description: string;
  href: string;
  completed: boolean;
};

export type CompletenessResponse = {
  items: CompletenessItem[];
  missingCount: number;
  completedCount: number;
  totalCount: number;
  projectId: string | null;
  memberRole: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("member_role, full_name, business_name, role_title, sector, city, short_bio, phone_whatsapp, ask_categories, offer_categories, asks_summary, offers_summary")
    .eq("id", user.id)
    .single();

  const memberRole = profile?.member_role ?? null;

  // ── Shared profile items (all roles) ────────────────────────────────────────
  const profileItems: CompletenessItem[] = [
    {
      id: "full_name",
      category: "profile",
      label: "Add your full name",
      description: "Your name helps others know who they're connecting with.",
      href: "/onboarding",
      completed: !!(profile?.full_name),
    },
    {
      id: "business_name",
      category: "profile",
      label: memberRole === "investor" ? "Add your firm or business name" : memberRole === "ecosystem_partner" ? "Add your organisation name" : "Add your business / company name",
      description: "Makes your profile more discoverable and professional.",
      href: "/onboarding",
      completed: !!(profile?.business_name),
    },
    {
      id: "role_title",
      category: "profile",
      label: "Add your role title",
      description: memberRole === "investor" ? "e.g. Angel Investor, Managing Partner, Venture Analyst." : "e.g. Founder & CEO, Co-founder & CTO.",
      href: "/onboarding",
      completed: !!(profile?.role_title),
    },
    {
      id: "sector",
      category: "profile",
      label: memberRole === "investor" ? "Add your investment sector focus" : "Add your industry sector",
      description: "Used by the matching algorithm to surface the most relevant connections.",
      href: "/onboarding",
      completed: !!(profile?.sector),
    },
    {
      id: "city",
      category: "profile",
      label: "Add your city / location",
      description: "Location helps with region-based matching and discovery.",
      href: "/onboarding",
      completed: !!(profile?.city),
    },
    {
      id: "short_bio",
      category: "profile",
      label: "Write a short bio",
      description: "A 2–3 sentence bio helps others quickly understand your background.",
      href: "/onboarding",
      completed: !!(profile?.short_bio),
    },
    {
      id: "phone_whatsapp",
      category: "profile",
      label: "Add a WhatsApp / contact number",
      description: "Enables direct communication once a connection is made.",
      href: "/onboarding",
      completed: !!(profile?.phone_whatsapp),
    },
  ];

  let roleItems: CompletenessItem[] = [];

  // ── Startup-specific ────────────────────────────────────────────────────────
  if (memberRole === "startup") {
    // Step 1: fetch core project fields (columns that definitely exist)
    const [{ data: ownedProjects }, { data: cofounderLinks }] = await Promise.all([
      admin
        .from("projects")
        .select("id, name, description, stage")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("cofounder_links")
        .select("project_id")
        .eq("cofounder_profile_id", user.id),
    ]);

    const cofounderProjectIds = (cofounderLinks ?? [])
      .map((l: { project_id: string | null }) => l.project_id)
      .filter(Boolean) as string[];

    type CoreProject = { id: string; name: string | null; description: string | null; stage: string | null };
    let projectList: CoreProject[] = (ownedProjects ?? []) as CoreProject[];

    if (cofounderProjectIds.length > 0) {
      const { data: coProjects } = await admin
        .from("projects")
        .select("id, name, description, stage")
        .in("id", cofounderProjectIds)
        .order("created_at", { ascending: false })
        .limit(5);

      const seen = new Set(projectList.map((p) => p.id));
      for (const p of (coProjects ?? []) as CoreProject[]) {
        if (!seen.has(p.id)) { seen.add(p.id); projectList.push(p); }
      }
    }

    projectList = projectList.slice(0, 5);

    // Step 2: try to fetch data room fields separately (these columns may not exist in all envs)
    type DataRoomRow = { id: string; drive_link: string | null; pitch_deck_url: string | null; financial_snapshot: unknown };
    const dataRoomMap = new Map<string, DataRoomRow>();
    if (projectList.length > 0) {
      try {
        const { data: drRows } = await admin
          .from("projects")
          .select("id, drive_link, pitch_deck_url, financial_snapshot")
          .in("id", projectList.map((p) => p.id));
        for (const row of (drRows ?? []) as DataRoomRow[]) {
          dataRoomMap.set(row.id, row);
        }
      } catch {
        // columns not yet migrated — data room items will show as incomplete
      }
    }
    const firstProjectId = projectList[0]?.id ?? null;

    const startupProfileItem: CompletenessItem = {
      id: "asks_summary",
      category: "profile",
      label: "Complete your fundraising details",
      description: "Fundraising stage, target raise, product stage, and target regions improve match quality significantly.",
      href: "/onboarding",
      completed: !!(profile?.asks_summary),
    };

    const hasProjectItem: CompletenessItem = {
      id: "has_project",
      category: "project",
      label: "Create your startup project",
      description: "Your project profile is what investors see when they discover your startup.",
      href: "/projects/new",
      completed: projectList.length > 0,
    };

    // Per-project detail and data room items
    const perProjectItems: CompletenessItem[] = [];
    for (const proj of projectList) {
      const n = proj.name ? `"${proj.name}"` : "your project";
      const dr = dataRoomMap.get(proj.id);
      perProjectItems.push(
        {
          id: `project_description_${proj.id}`,
          category: "project",
          label: `Add a description to ${n}`,
          description: "A clear description of what your startup does and the problem it solves.",
          href: `/projects/${proj.id}`,
          completed: !!(proj.description),
        },
        {
          id: `project_stage_${proj.id}`,
          category: "project",
          label: `Set the stage for ${n}`,
          description: "Stage (Idea, MVP, Pre-seed, etc.) is one of the first things investors look at.",
          href: `/projects/${proj.id}`,
          completed: !!(proj.stage),
        },
        {
          id: `drive_link_${proj.id}`,
          category: "data_room",
          label: `Link a Google Drive folder for ${n}`,
          description: "Matched investors can request access. Keep the folder restricted until you share it manually.",
          href: `/data-room/${proj.id}?tab=drive`,
          completed: !!(dr?.drive_link),
        },
        {
          id: `pitch_deck_url_${proj.id}`,
          category: "data_room",
          label: `Add a pitch deck link for ${n}`,
          description: "Canva, Docsend, Notion, or any view-only link. Investors can request access only to those startups they mutually matched with.",
          href: `/data-room/${proj.id}?tab=pitch`,
          completed: !!(dr?.pitch_deck_url),
        },
        {
          id: `financial_snapshot_${proj.id}`,
          category: "data_room",
          label: `Add a financial snapshot for ${n}`,
          description: "Revenue, burn rate, and runway. Self-reported. Investors can request access only to those startups they mutually matched with.",
          href: `/data-room/${proj.id}?tab=snapshot`,
          completed: !!(dr?.financial_snapshot),
        },
      );
    }

    roleItems = [startupProfileItem, hasProjectItem, ...perProjectItems];

    const items = [...profileItems, ...roleItems];
    const completedCount = items.filter((i) => i.completed).length;
    return NextResponse.json({
      items,
      missingCount: items.length - completedCount,
      completedCount,
      totalCount: items.length,
      projectId: firstProjectId,
      memberRole,
    } satisfies CompletenessResponse);
  }

  // ── Investor-specific ───────────────────────────────────────────────────────
  if (memberRole === "investor") {
    roleItems = [
      {
        id: "ask_categories",
        category: "investment",
        label: "Add your investment focus areas",
        description: "Sectors and industries you invest in — used to surface relevant startup matches.",
        href: "/onboarding",
        completed: Array.isArray(profile?.ask_categories) && profile.ask_categories.length > 0,
      },
      {
        id: "asks_summary",
        category: "investment",
        label: "Complete your investment profile",
        description: "Ticket size, preferred stages, thesis, and regions help founders find you and improve match quality.",
        href: "/onboarding",
        completed: !!(profile?.asks_summary),
      },
    ];
  }

  // ── Ecosystem partner-specific ───────────────────────────────────────────────
  if (memberRole === "ecosystem_partner") {
    roleItems = [
      {
        id: "ask_categories",
        category: "partnership",
        label: "Add what you're looking for",
        description: "What you seek from startup partnerships — used for matching and discovery.",
        href: "/onboarding",
        completed: Array.isArray(profile?.ask_categories) && profile.ask_categories.length > 0,
      },
      {
        id: "offer_categories",
        category: "partnership",
        label: "Add what you can offer",
        description: "Resources, networks, or services you can provide to startups.",
        href: "/onboarding",
        completed: Array.isArray(profile?.offer_categories) && profile.offer_categories.length > 0,
      },
      {
        id: "asks_summary",
        category: "partnership",
        label: "Describe your partnership asks",
        description: "A written description of what you're looking for from startup partnerships.",
        href: "/onboarding",
        completed: !!(profile?.asks_summary),
      },
      {
        id: "offers_summary",
        category: "partnership",
        label: "Describe what you offer partners",
        description: "A written description of the value you bring to startups you partner with.",
        href: "/onboarding",
        completed: !!(profile?.offers_summary),
      },
    ];
  }

  const items = [...profileItems, ...roleItems];
  const completedCount = items.filter((i) => i.completed).length;

  return NextResponse.json({
    items,
    missingCount: items.length - completedCount,
    completedCount,
    totalCount: items.length,
    projectId: null,
    memberRole,
  } satisfies CompletenessResponse);
}
