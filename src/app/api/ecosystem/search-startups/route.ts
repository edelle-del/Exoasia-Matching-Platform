import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ startups: [] });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, business_name, sector")
      .eq("member_role", "startup")
      .or(`full_name.ilike.%${q}%,business_name.ilike.%${q}%`)
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const startups = (data ?? []).map((p) => ({
      id: p.id,
      name: p.business_name || p.full_name || "Unnamed startup",
      sector: p.sector ?? null,
    }));

    return NextResponse.json({ startups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
