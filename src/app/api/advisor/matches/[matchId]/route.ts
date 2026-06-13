import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ACTIONS = ["approve", "flag", "decline", "introduce"] as const;
type Action = (typeof VALID_ACTIONS)[number];

async function assertAdvisorAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleData?.role;

  if (!role || !["advisor", "staff", "admin"].includes(role)) {
    return {
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { supabase, error } = await assertAdvisorAccess();
    if (error || !supabase) return error;

    const { matchId } = await params;
    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const action = body.action as Action;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be approve, flag, decline, or introduce." },
        { status: 400 },
      );
    }

    const STATUS_MAP: Record<Action, string> = {
      approve: "approved",
      flag: "flagged",
      decline: "declined",
      introduce: "introduced",
    };

    const updates: Record<string, unknown> = {
      status: STATUS_MAP[action],
      updated_at: new Date().toISOString(),
    };

    // Store the advisor's intro note in the summary field
    if (action === "introduce" && body.intro_note?.trim()) {
      updates.summary = body.intro_note.trim();
    }

    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("matches")
      .update(updates)
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
