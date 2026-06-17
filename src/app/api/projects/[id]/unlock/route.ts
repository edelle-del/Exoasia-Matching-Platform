import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deductCredits } from "@/lib/credits";
import { grantPermanentUnlock } from "@/lib/quotas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Deduct 3 credits
    try {
      await deductCredits(user.id, "UNLOCK_MATCH");
    } catch (e: any) {
      if (e.name === "InsufficientCreditsError") {
        return NextResponse.json(
          { error: e.message, balance: e.balance, required: e.required },
          { status: 402 }
        );
      }
      throw e;
    }

    // Grant permanent unlock using "project" as the asset_type
    // which corresponds to generated matches (AI scores) masking
    await grantPermanentUnlock(user.id, "project", projectId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unlock Project Match Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
