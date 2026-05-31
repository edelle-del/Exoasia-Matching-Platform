import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const BUCKET = "data-room";

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.id === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: false });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { error: "File must be under 50 MB." },
        { status: 400 },
      );

    await ensureBucket();

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}_${safeName}`;

    const admin = createAdminClient();
    const { error: storageError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, file);

    if (storageError)
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 },
      );

    const { data: record, error: dbError } = await supabase
      .from("data_room_files")
      .insert({
        owner_id: user.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select("id, name, file_size, mime_type, created_at")
      .single();

    if (dbError) {
      await admin.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ file: record }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
