import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required.
// Validates a startup's email + OTP against portfolio_nominations.
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

    const { data: nomination, error } = await admin
      .from("portfolio_nominations")
      .select(`
        id, status, expires_at, message,
        partner:profiles!partner_id (full_name, business_name)
      `)
      .eq("invitee_email", email.trim().toLowerCase())
      .eq("otp", otp.trim())
      .single();

    if (error || !nomination) {
      return NextResponse.json({ error: "Invalid email or verification code." }, { status: 404 });
    }
    if (nomination.status !== "pending") {
      return NextResponse.json({ error: "This nomination has already been used or cancelled." }, { status: 400 });
    }
    if (new Date(nomination.expires_at) < new Date()) {
      return NextResponse.json({ error: "This nomination has expired. Ask the ecosystem partner to resend." }, { status: 400 });
    }

    return NextResponse.json({ nomination });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
