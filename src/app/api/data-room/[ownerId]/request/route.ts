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

    const { data: request } = await supabase
      .from("data_room_access_requests")
      .select("id, status, created_at")
      .eq("owner_id", ownerId)
      .eq("requester_id", user.id)
      .maybeSingle();

    return NextResponse.json({ request: request ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
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

    if (ownerId === user.id)
      return NextResponse.json(
        { error: "Cannot request access to your own data room." },
        { status: 400 },
      );

    const body = (await req.json().catch(() => ({}))) as { message?: string };

    const { data, error } = await supabase
      .from("data_room_access_requests")
      .upsert(
        {
          requester_id: user.id,
          owner_id: ownerId,
          status: "pending",
          message: body.message ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "requester_id,owner_id" },
      )
      .select("id, status, created_at")
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
