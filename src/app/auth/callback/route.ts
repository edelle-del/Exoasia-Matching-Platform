import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewSignupNotification } from "@/lib/email";
import { CREDIT_CONFIG } from "@/types/constants";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  
  // Force sign out of any existing session before exchanging the code.
  // This is required because Supabase prevents session fixation: if you are logged in 
  // as User A and click an invite link for User B, exchangeCodeForSession will fail silently.
  await supabase.auth.signOut();

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

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdminOrAdvisor = roleData?.role === "admin" || roleData?.role === "advisor";

  const needsOnboarding = !isAdminOrAdvisor && (!profile || !profile.full_name || !profile.sector);

  // Brand-new signup: profile exists (from DB trigger) but full_name is still null,
  // meaning onboarding has never been completed. The time guard prevents re-firing
  // on OAuth re-logins where the user abandoned onboarding.
  const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
  const isNewSignup = !profile?.full_name && accountAgeMs < 60 * 60 * 1000; // within 1 hour
  if (isNewSignup) {
    const admin = createAdminClient();

    // Grant 10 welcome credits immediately on new account — idempotent.
    const { data: existing } = await admin
      .from("ad_credit_ledger")
      .select("id")
      .eq("member_id", user.id)
      .eq("reason", CREDIT_CONFIG.WELCOME_BONUS.reason)
      .maybeSingle();

    if (!existing) {
      await admin.from("ad_credit_ledger").insert({
        member_id: user.id,
        change_amount: CREDIT_CONFIG.WELCOME_BONUS.credits,
        reason: CREDIT_CONFIG.WELCOME_BONUS.reason,
      });
    }

    if (user.email) {
      const meta = user.user_metadata as Record<string, string> | undefined;
      void sendNewSignupNotification({
        email: user.email,
        createdAt: user.created_at,
        location: meta?.signin_location,
        browser: meta?.signin_browser,
      });
    }
  }

  if (needsOnboarding) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
