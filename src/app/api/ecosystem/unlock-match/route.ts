import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deductCredits, InsufficientCreditsError } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetId } = await request.json() as { targetId: string };
    if (!targetId) {
      return NextResponse.json({ error: "targetId required" }, { status: 400 });
    }

    try {
      await deductCredits(user.id, "UNLOCK_MATCH", targetId);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${err.required} credits but have ${err.balance}.`, needed: err.required, balance: err.balance },
          { status: 402 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
