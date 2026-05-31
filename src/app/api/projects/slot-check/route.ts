import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_ends_at")
      .eq("id", user.id)
      .single();

    const hasActiveSub =
      !!profile?.subscription_plan &&
      (!profile.subscription_ends_at ||
        new Date(profile.subscription_ends_at) > new Date());

    if (hasActiveSub) {
      return NextResponse.json({ canCreate: true });
    }

    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("is_active", true);

    return NextResponse.json({ canCreate: (count ?? 0) < 1 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
