import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    if (profile?.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { email, message } = body as { email?: string; message?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Idempotency: don't charge if a pending invite to this email already exists
    const { data: existingNomination } = await admin
      .from("portfolio_nominations")
      .select("id")
      .eq("partner_id", user.id)
      .eq("invitee_email", email.toLowerCase().trim())
      .maybeSingle();

    if (!existingNomination) {
      const INVITE_COST = 1;

      const { data: ledgerRows } = await admin
        .from("ad_credit_ledger")
        .select("change_amount")
        .eq("member_id", user.id);

      const balance = (ledgerRows ?? []).reduce(
        (sum, r) => sum + Number(r.change_amount ?? 0),
        0,
      );

      if (balance < INVITE_COST) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${INVITE_COST} credit but have ${balance}.`, needed: INVITE_COST, balance },
          { status: 402 },
        );
      }

      const { error: deductError } = await admin.from("ad_credit_ledger").insert({
        member_id: user.id,
        change_amount: -INVITE_COST,
        reason: `Partnership email invite: ${email.toLowerCase().trim()}`,
      });

      if (deductError) {
        return NextResponse.json({ error: deductError.message }, { status: 500 });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const { data: nomination, error: insertError } = await admin
      .from("portfolio_nominations")
      .insert({
        partner_id:    user.id,
        invitee_email: email.toLowerCase().trim(),
        message:       message?.trim() ?? null,
        otp,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "An invite has already been sent to this email." }, { status: 409 });
      }
      throw insertError;
    }

    // Send invite email via Supabase auth invite flow
    if (nomination?.otp) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const acceptUrl = `${siteUrl}/accept-nomination?otp=${nomination.otp}&email=${encodeURIComponent(email.toLowerCase().trim())}`;

        const { data: partnerProfile } = await admin
          .from("profiles")
          .select("full_name, business_name")
          .eq("id", user.id)
          .single();

        const partnerName = partnerProfile?.business_name || partnerProfile?.full_name || "An ecosystem partner";

        await admin.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
          redirectTo: acceptUrl,
          data: {
            account_status: "invited",
            invite_inviter_name: partnerName,
            invite_type: "ecosystem_partner",
            ...(message ? { invite_message: message.trim() } : {}),
          },
        });
      } catch {
        // Non-fatal: invitee may already have an account or email service unavailable
      }
    }

    return NextResponse.json({ ok: true, otp: nomination.otp });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
