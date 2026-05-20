"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers";
import { createClient } from "@/lib/supabase/client";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { getSignedInRedirectPath } from "@/lib/auth/access";

export default function Home() {
  const router = useRouter();
  const { signedIn, isInvitedAccount } = useAuth();

  useEffect(() => {
    if (!signedIn) return;
    const redirectBasedOnProfile = async () => {
      // invited accounts still go to accept-claim
      if (isInvitedAccount) {
        router.replace("/accept-invite");
        return;
      }

      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;
        const tokenRole = getRoleFromAccessToken(accessToken);

        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) {
          router.replace("/dashboard");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, sector")
          .eq("id", userId)
          .single();

        const needsOnboarding =
          !profile || !profile.full_name || !profile.sector;
        router.replace(
          getSignedInRedirectPath({
            role: tokenRole,
            isInvitedAccount,
            needsOnboarding,
          }),
        );
      } catch (err) {
        console.error("Error checking profile for onboarding:", err);
        router.replace("/dashboard");
      }
    };

    redirectBasedOnProfile();
  }, [signedIn, isInvitedAccount, router]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <main className="px-[5%] py-20">
        <div className="mx-auto max-w-[640px] text-center">
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-4xl font-700 text-[var(--color-ink)]">
                The Growth Network
              </h1>
              <p className="mt-4 text-lg text-[var(--color-body)]">
                AI-powered matching platform for serious entrepreneurs
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Where verified introductions become real deals
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href="/sign-up"
                className="block w-full gn-btn-primary text-center"
              >
                Sign Up →
              </Link>
              <Link
                href="/sign-in"
                className="block w-full gn-btn-secondary text-center"
              >
                Member Login
              </Link>
              <Link
                href="/get-invited"
                className="block w-full text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-body)] transition-colors"
              >
                How Invitations Work →
              </Link>
            </div>

            <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6 text-left">
              <h3 className="font-600 text-[var(--color-ink)]">
                Platform Access
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-[var(--color-body)]">
                <li>• Invitation-only membership</li>
                <li>• Invited accounts must claim access before activation</li>
                <li>• Stage-based progression (1→2→3→4)</li>
                <li>• Credit-based matching system</li>
                <li>• Advisor-reviewed introductions</li>
                <li>• Document verification required</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
