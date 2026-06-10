import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_PACKAGES } from "@/types/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as { packageId: string };
  const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);

  if (!pkg) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("ad_credit_ledger").insert({
    member_id: user.id,
    change_amount: pkg.credits,
    reason: `Credit purchase (placeholder): ${pkg.name}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: rows } = await admin
    .from("ad_credit_ledger")
    .select("change_amount")
    .eq("member_id", user.id);

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.change_amount ?? 0), 0);

  return NextResponse.json({ success: true, credits: total, added: pkg.credits });
}
