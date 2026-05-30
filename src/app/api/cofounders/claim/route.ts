import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called by an unauthenticated user to set name + password and activate their account.
// Accepts { email, otp, name, password } (OTP flow) or { token, name, password } (legacy).
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      otp?: string;
      token?: string;
      name: string;
      password: string;
    };

    const { name, password } = body;

    if (!name?.trim() || !password) {
      return NextResponse.json({ error: "Name and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── Resolve invite by OTP (new) or token (legacy) ──────────────────────────
    let invite: {
      id: string;
      inviter_id: string;
      uid_type: string;
      uid_value: string;
      status: string;
      expires_at: string;
      project_id: string | null;
    } | null = null;

    if (body.email && body.otp) {
      if (!/^\d{6}$/.test(body.otp.trim())) {
        return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
      }
      const { data } = await admin
        .from("cofounder_invites")
        .select("id, inviter_id, uid_type, uid_value, status, expires_at, project_id")
        .eq("uid_value", body.email.trim().toLowerCase())
        .eq("otp", body.otp.trim())
        .eq("uid_type", "email")
        .single();
      invite = data ?? null;
    } else if (body.token) {
      const { data } = await admin
        .from("cofounder_invites")
        .select("id, inviter_id, uid_type, uid_value, status, expires_at, project_id")
        .eq("token", body.token)
        .single();
      invite = data ?? null;
    } else {
      return NextResponse.json({ error: "email + otp or token is required." }, { status: 400 });
    }

    if (!invite) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "This invite has already been used or cancelled." }, { status: 400 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 400 });
    }
    if (invite.uid_type !== "email") {
      return NextResponse.json({ error: "Only email invites support this flow." }, { status: 400 });
    }

    const email = invite.uid_value.toLowerCase();

    // ── Find the auth user by email ─────────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!profile?.id) {
      return NextResponse.json(
        { error: "No account found for this email. Please contact support." },
        { status: 404 },
      );
    }

    const { data: { user: authUser }, error: getUserError } = await admin.auth.admin.getUserById(profile.id);
    if (getUserError || !authUser) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (authUser.user_metadata?.account_status === "active") {
      return NextResponse.json(
        { error: "This account is already active. Please sign in normally." },
        { status: 409 },
      );
    }

    // ── Set password, confirm email, activate account ───────────────────────────
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        account_status: "active",
        invite_inviter_name: null,
        invite_project_name: null,
      },
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await admin.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);

    const { error: linkError } = await admin.from("cofounder_links").insert({
      founder_profile_id: invite.inviter_id,
      cofounder_profile_id: profile.id,
      project_id: invite.project_id ?? null,
    });
    if (linkError && !linkError.message.includes("duplicate")) {
      return NextResponse.json({ error: "Failed to create cofounder link." }, { status: 500 });
    }

    await admin.from("cofounder_invites").update({ status: "accepted" }).eq("id", invite.id);

    return NextResponse.json({ email, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
