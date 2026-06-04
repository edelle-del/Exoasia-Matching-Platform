import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PortfolioInvite = {
  id: string;
  partner_id: string;
  partner_name: string;
  nominated_at: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "startup") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: rows, error } = await admin
      .from("portfolio_companies")
      .select("id, partner_id, nominated_at")
      .eq("startup_id", user.id)
      .eq("status", "pending")
      .order("nominated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const partnerIds = [...new Set((rows ?? []).map((r) => r.partner_id))];
    const { data: partners } = partnerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", partnerIds)
      : { data: [] };

    const partnerNameMap = new Map(
      (partners ?? []).map((p) => [p.id, p.business_name || p.full_name || "Ecosystem partner"]),
    );

    const invites: PortfolioInvite[] = (rows ?? []).map((r) => ({
      id: r.id,
      partner_id: r.partner_id,
      partner_name: partnerNameMap.get(r.partner_id) ?? "Ecosystem partner",
      nominated_at: r.nominated_at,
    }));

    return NextResponse.json({ invites });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
