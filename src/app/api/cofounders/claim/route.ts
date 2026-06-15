import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Called by an unauthenticated user to set name + password and activate their account.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token: string;
      name: string;
      password: string;
    };

    const { token, name, password } = body;

    if (!token) {
      return NextResponse.json({ error: "token is required." }, { status: 400 });
    }
    if (!name?.trim() || !password) {
      return NextResponse.json({ error: "Name and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invite } = await admin
      .from("cofounder_invites")
      .select("id, inviter_id, uid_type, uid_value, status, expires_at, project_id")
      .eq("token", token)
      .single();

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
        is_invited_cofounder: true,
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
