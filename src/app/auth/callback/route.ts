import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`);
  }

  // If a specific destination was requested (e.g. password reset), go there directly.
  if (next !== "/dashboard") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Default: check if the user still needs onboarding.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, sector")
    .eq("id", user.id)
    .single();

  const needsOnboarding = !profile || !profile.full_name || !profile.sector;

  if (needsOnboarding) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
