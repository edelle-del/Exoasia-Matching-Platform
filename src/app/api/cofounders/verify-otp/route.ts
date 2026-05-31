import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required.
// Validates an email + 6-digit OTP against cofounder_invites and returns
// safe invite details so the client can show context before the claim form.
export async function POST(request: Request) {
  try {
    const { email, otp } = (await request.json()) as { email: string; otp: string };

    if (!email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: "Email and verification code are required." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json({ error: "Verification code must be 6 digits." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: invite, error } = await admin
      .from("cofounder_invites")
      .select(`
        id, status, expires_at, project_id,
        inviter:profiles!inviter_id (full_name, business_name),
        project:projects!project_id (id, name, stage)
      `)
      .eq("uid_value", email.trim().toLowerCase())
      .eq("otp", otp.trim())
      .eq("uid_type", "email")
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: "Invalid email or verification code." }, { status: 404 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "This invite has already been used or cancelled." }, { status: 400 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "This invite has expired. Ask the sender to resend." }, { status: 400 });
    }

    return NextResponse.json({ invite });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
