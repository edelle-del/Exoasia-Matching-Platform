import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Directly add an existing platform user as a cofounder on a project.
// Caller must own or be a cofounder on the project.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cofounder_id, project_id } = (await request.json()) as {
      cofounder_id?: string;
      project_id?: string;
    };

    if (!cofounder_id) {
      return NextResponse.json({ error: "cofounder_id is required" }, { status: 400 });
    }
    if (!project_id) {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    if (cofounder_id === user.id) {
      return NextResponse.json({ error: "You cannot add yourself as a cofounder." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify caller owns or is a cofounder on the project
    const { data: project } = await admin
      .from("projects")
      .select("owner_id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.owner_id !== user.id) {
      const { data: link } = await admin
        .from("cofounder_links")
        .select("id")
        .eq("project_id", project_id)
        .eq("cofounder_profile_id", user.id)
        .single();
      if (!link) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify the target profile exists
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", cofounder_id)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const { error: insertError } = await admin.from("cofounder_links").insert({
      founder_profile_id: project.owner_id,
      cofounder_profile_id: cofounder_id,
      project_id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "This person is already a cofounder on this project." }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
