import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ACTIONS = ["approve", "reject", "under-review"] as const;
type Action = (typeof VALID_ACTIONS)[number];

async function assertAdvisorAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  const role = roleData?.role;
  const advisorId = user.id;

  if (!role || !["advisor", "staff", "admin"].includes(role)) {
    return {
      supabase: null,
      advisorId: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, advisorId, error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase, advisorId, error } = await assertAdvisorAccess();
    if (error || !supabase) return error;

    const { id: docId } = await params;
    if (!docId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const action = body.action as Action;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be approve, reject, or under-review." },
        { status: 400 },
      );
    }

    if (action === "reject" && !body.reject_reason?.trim()) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 },
      );
    }

    // Fetch the document to get the member_id for stage progression
    const { data: doc, error: fetchError } = await supabase
      .from("member_documents")
      .select("id, member_id, status")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    // Build document update
    const docUpdate: Record<string, unknown> = {
      reviewed_by: advisorId,
      reviewed_at: new Date().toISOString(),
    };

    if (action === "approve") {
      docUpdate.status = "approved";
      docUpdate.reject_reason = null;
    } else if (action === "reject") {
      docUpdate.status = "rejected";
      docUpdate.reject_reason = body.reject_reason.trim();
    } else {
      docUpdate.status = "under-review";
    }

    const { error: docUpdateError } = await supabase
      .from("member_documents")
      .update(docUpdate)
      .eq("id", docId);

    if (docUpdateError) {
      return NextResponse.json(
        { error: docUpdateError.message },
        { status: 500 },
      );
    }

    // On approval: advance member to Stage 2 (only if currently Stage 0 or 1)
    if (action === "approve") {
      await supabase
        .from("profiles")
        .update({ stage: "2", verification_status: "verified" })
        .eq("id", doc.member_id)
        .in("stage", ["0", "1"]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
