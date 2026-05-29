import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Accessible by the project owner OR any investor with approved access to the owner's data room.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { projectId } = await params;

    // Fetch project to get owner_id
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .single();

    if (!project)
      return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const isOwner = project.owner_id === user.id;

    if (!isOwner) {
      const { data: access } = await supabase
        .from("data_room_access_requests")
        .select("id")
        .eq("owner_id", project.owner_id)
        .eq("requester_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (!access)
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: files, error } = await supabase
      .from("data_room_files")
      .select("id, name, file_size, mime_type, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ files: files ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
