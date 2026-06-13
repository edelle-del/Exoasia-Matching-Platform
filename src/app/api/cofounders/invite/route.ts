import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uid_type, uid_value, project_id, client_context } = (await request.json()) as {
      uid_type: "email";
      uid_value: string;
      project_id?: string | null;
      client_context?: { location?: string; browser?: string };
    };

    if (uid_type !== "email") {
      return NextResponse.json({ error: "uid_type must be email" }, { status: 400 });
    }
    if (!uid_value?.trim()) {
      return NextResponse.json({ error: "uid_value is required" }, { status: 400 });
    }

    if (uid_type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(uid_value.trim())) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
    }

    // Email invites cost 1 credit. Skip the charge if an active invite to
    // the same email+project already exists (idempotency guard).
    if (uid_type === "email") {
      const admin = createAdminClient();
      const INVITE_COST = 1;

      const { data: existingInvite } = await admin
        .from("cofounder_invites")
        .select("id")
        .eq("inviter_id", user.id)
        .eq("uid_value", uid_value.trim())
        .eq("project_id", project_id ?? null)
        .eq("status", "pending")
        .maybeSingle();

      if (!existingInvite) {
        const { data: ledgerRows } = await admin
          .from("ad_credit_ledger")
          .select("change_amount")
          .eq("member_id", user.id);

        const balance = (ledgerRows ?? []).reduce(
          (sum, r) => sum + Number(r.change_amount ?? 0),
          0,
        );

        if (!BYPASS_CREDIT_GATES && balance < INVITE_COST) {
          return NextResponse.json(
            { error: `Insufficient credits. You need ${INVITE_COST} credit but have ${balance}.`, needed: INVITE_COST, balance },
            { status: 402 },
          );
        }

        const { error: deductError } = await admin.from("ad_credit_ledger").insert({
          member_id: user.id,
          change_amount: -INVITE_COST,
          reason: `Cofounder email invite: ${uid_value.trim()}`,
        });

        if (deductError) {
          return NextResponse.json({ error: deductError.message }, { status: 500 });
        }
      }
    }

    const { data, error } = await supabase
      .from("cofounder_invites")
      .insert({
        inviter_id: user.id,
        uid_type,
        uid_value: uid_value.trim(),
        project_id: project_id ?? null,
      })
      .select("id, token, uid_type, uid_value, status, created_at, expires_at, project_id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // For email invites, send via Supabase's built-in invite email.
    // We look up the inviter name and project name so they are available
    // as {{ index .Data "invite_inviter_name" }} / {{ index .Data "invite_project_name" }}
    // inside the Supabase "Invite User" email template.
    if (data?.token) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const acceptUrl = `${siteUrl}/accept-invite?token=${data.token}`;

      try {
        const admin = createAdminClient();

        const [{ data: inviterProfile }, { data: projectData }] = await Promise.all([
          admin.from("profiles").select("full_name, business_name").eq("id", user.id).single(),
          project_id
            ? admin.from("projects").select("name").eq("id", project_id).single()
            : Promise.resolve({ data: null }),
        ]);

        const inviterName =
          inviterProfile?.full_name || inviterProfile?.business_name || "A founder";
        const projectName = (projectData as { name?: string } | null)?.name || null;

        await admin.auth.admin.inviteUserByEmail(uid_value.trim(), {
          redirectTo: acceptUrl,
          data: {
            account_status: "invited",
            invite_inviter_name: inviterName,
            ...(projectName ? { invite_project_name: projectName } : {}),
            ...(client_context?.location ? { invite_location: client_context.location } : {}),
            ...(client_context?.browser  ? { invite_browser:  client_context.browser  } : {}),
          },
        });
      } catch {
        // Non-fatal: user may already exist in auth.
      }
    }

    return NextResponse.json({ invite: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invite_id } = (await request.json()) as { invite_id: string };
    if (!invite_id) {
      return NextResponse.json({ error: "invite_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("cofounder_invites")
      .update({ status: "expired" })
      .eq("id", invite_id)
      .eq("inviter_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
