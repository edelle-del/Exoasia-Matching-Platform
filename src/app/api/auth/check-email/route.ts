import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    const admin = createAdminClient();

    // Query profiles to see if email exists
    const { data } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email.trim())
      .maybeSingle();

    return NextResponse.json({ exists: !!data });
  } catch (err) {
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
