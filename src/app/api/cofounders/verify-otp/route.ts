import { NextResponse } from "next/server";

// OTP-based verification has been removed. Invites are now token-only.
export async function POST() {
  return NextResponse.json(
    { error: "OTP verification is no longer supported. Use the invite link sent to your email." },
    { status: 410 },
  );
}
