import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
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

    const { data: file, error: fetchError } = await supabase
      .from("data_room_files")
      .select("file_path")
      .eq("id", fileId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !file)
      return NextResponse.json({ error: "File not found." }, { status: 404 });

    await createAdminClient().storage.from("data-room").remove([file.file_path]);

    const { error: dbError } = await supabase
      .from("data_room_files")
      .delete()
      .eq("id", fileId);

    if (dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
