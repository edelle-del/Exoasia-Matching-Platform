import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId } = await params;
    const { status } = (await req.json()) as {
      status: "approved" | "denied";
    };

    if (!["approved", "denied"].includes(status))
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });

    const { data, error } = await supabase
      .from("data_room_access_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("owner_id", user.id)
      .select()
      .single();

    if (error || !data)
      return NextResponse.json(
        { error: error?.message ?? "Not found." },
        { status: 404 },
      );

    return NextResponse.json({ request: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
