import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let { data, error } = await supabase
      .from("projects")
      .select(
        "id, owner_id, name, description, stage, sector, venture_readiness_report, drive_link, pitch_deck_url, financial_snapshot, is_active, created_at, updated_at",
      )
      .eq("id", id)
      .single();

    // drive_link / pitch_deck_url / financial_snapshot columns may not exist yet — retry without them
    if (error?.message?.includes("drive_link") || error?.message?.includes("pitch_deck_url") || error?.message?.includes("financial_snapshot")) {
      const retry = await supabase
        .from("projects")
        .select(
          "id, owner_id, name, description, stage, sector, venture_readiness_report, is_active, created_at, updated_at",
        )
        .eq("id", id)
        .single();
      data = retry.data ? { ...retry.data, drive_link: null, pitch_deck_url: null, financial_snapshot: null } : null;
      error = retry.error;
    }

    if (error || !data)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch the owner's profile to get their real name
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("full_name, business_name, email")
      .eq("id", data.owner_id)
      .single();

    const responseData = {
      ...data,
      ...(ownerProfile ? { owner_profile: ownerProfile } : {}),
    };

    return NextResponse.json({ project: responseData });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      stage?: string;
      sector?: string;
      venture_readiness_report?: unknown;
      drive_link?: string | null;
      pitch_deck_url?: string | null;
      financial_snapshot?: { revenue: string; burn_rate: string; runway: string } | null;
      is_active?: boolean;
    };

    const { data: existing } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.sector !== undefined) updates.sector = body.sector;
    if (body.venture_readiness_report !== undefined)
      updates.venture_readiness_report = body.venture_readiness_report;
    if (body.drive_link !== undefined) updates.drive_link = body.drive_link ?? null;
    if (body.pitch_deck_url !== undefined) updates.pitch_deck_url = body.pitch_deck_url ?? null;
    if (body.financial_snapshot !== undefined) updates.financial_snapshot = body.financial_snapshot ?? null;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    let { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", id);

    // drive_link / pitch_deck_url / financial_snapshot columns may not exist yet — retry without them
    if (error?.message?.includes("drive_link") || error?.message?.includes("pitch_deck_url") || error?.message?.includes("financial_snapshot")) {
      const { drive_link: _omit1, pitch_deck_url: _omit2, financial_snapshot: _omit3, ...safeUpdates } = updates;
      const retry = await supabase
        .from("projects")
        .update(safeUpdates)
        .eq("id", id);
      error = retry.error;
    }

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: existing } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!existing || existing.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("projects")
      .update({ is_active: false })
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
