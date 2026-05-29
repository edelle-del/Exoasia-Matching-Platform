import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId } = await params;

    const { data: file } = await supabase
      .from("data_room_files")
      .select("owner_id, file_path, mime_type")
      .eq("id", fileId)
      .maybeSingle();

    if (!file)
      return NextResponse.json({ error: "File not found." }, { status: 404 });

    if (file.owner_id !== user.id) {
      const { data: access } = await supabase
        .from("data_room_access_requests")
        .select("id")
        .eq("owner_id", file.owner_id)
        .eq("requester_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      if (!access)
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Use admin client so storage RLS doesn't block; download: false = inline display
    const { data: signed, error: signError } =
      await createAdminClient().storage
        .from("data-room")
        .createSignedUrl(file.file_path, 300, { download: false });

    if (signError || !signed)
      return NextResponse.json(
        { error: "Could not create preview link." },
        { status: 500 },
      );

    return NextResponse.json({ url: signed.signedUrl, mime_type: file.mime_type });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
