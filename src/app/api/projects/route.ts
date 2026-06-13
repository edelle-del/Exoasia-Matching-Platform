import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const PROJECT_FIELDS =
      "id, owner_id, name, description, stage, sector, is_active, created_at, updated_at";

    const archived = req.nextUrl.searchParams.get("archived") === "true";

    // Projects the user owns
    const { data: ownedProjects, error } = await supabase
      .from("projects")
      .select(PROJECT_FIELDS)
      .eq("owner_id", user.id)
      .in("is_active", archived ? [true, false] : [true])
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Projects the user was invited to as a cofounder
    const { data: cofounderLinks } = await supabase
      .from("cofounder_links")
      .select("project_id")
      .eq("cofounder_profile_id", user.id)
      .not("project_id", "is", null);

    const cofounderProjectIds = (cofounderLinks ?? [])
      .map((l) => l.project_id as string)
      .filter(Boolean);

    let cofounderProjects: typeof ownedProjects = [];
    if (cofounderProjectIds.length > 0) {
      const { data: cfp } = await supabase
        .from("projects")
        .select(PROJECT_FIELDS)
        .in("id", cofounderProjectIds)
        .in("is_active", archived ? [true, false] : [true]);
      cofounderProjects = cfp ?? [];
    }

    // Merge, deduplicate, sort by created_at descending
    const ownedIds = new Set((ownedProjects ?? []).map((p) => p.id));
    const merged = [
      ...(ownedProjects ?? []),
      ...cofounderProjects.filter((p) => !ownedIds.has(p.id)),
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return NextResponse.json({ projects: merged });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, stage, sector, venture_readiness_report } =
      (await request.json()) as {
        name: string;
        description?: string;
        stage?: string;
        sector?: string;
        venture_readiness_report?: unknown;
      };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    // Enforce project slot limit: unlimited for active subscribers, 1 for free tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_ends_at")
      .eq("id", user.id)
      .single();

    const hasActiveSub =
      !!profile?.subscription_plan &&
      (!profile.subscription_ends_at ||
        new Date(profile.subscription_ends_at) > new Date());

    if (!hasActiveSub) {
      const { count: existing } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("is_active", true);

      if ((existing ?? 0) >= 1) {
        return NextResponse.json(
          {
            error:
              "Project slot limit reached. Upgrade to a paid plan to add more projects.",
            upgrade: true,
          },
          { status: 402 },
        );
      }
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        description,
        stage,
        sector,
        venture_readiness_report: venture_readiness_report ?? null,
      })
      .select("id, name")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
