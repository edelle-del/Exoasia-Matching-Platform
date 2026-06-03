import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let { data: requests, error } = await supabase
      .from("data_room_access_requests")
      .select(
        "id, requester_id, status, message, requester_email, created_at, updated_at, requester:profiles!requester_id(full_name, business_name, member_role, email)",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    // requester_email column may not exist yet — retry without it
    if (error?.message?.includes("requester_email")) {
      const retry = await supabase
        .from("data_room_access_requests")
        .select(
          "id, requester_id, status, message, created_at, updated_at, requester:profiles!requester_id(full_name, business_name, member_role, email)",
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      requests = (retry.data ?? []).map((r) => ({ ...r, requester_email: null }));
      error = retry.error;
    }

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requests: requests ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
