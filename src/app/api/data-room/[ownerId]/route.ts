import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ownerId } = await params;

    if (user.id !== ownerId) {
      const { data: access } = await supabase
        .from("data_room_access_requests")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("requester_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (!access)
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: files, error } = await supabase
      .from("data_room_files")
      .select("id, name, file_size, mime_type, created_at")
      .eq("owner_id", ownerId)
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
