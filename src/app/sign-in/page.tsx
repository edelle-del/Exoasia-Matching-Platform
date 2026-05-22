"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { getSignedInRedirectPath } from "@/lib/auth/access";
import { FullPageLoader } from "../_components/FullPageLoader";

export default function SignInPage() {
  const router = useRouter();
  const { signedIn, signInWithPassword, isInvitedAccount, session, user } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handles the case where the user is already signed in when they land on this page
  useEffect(() => {
    if (!signedIn || isRedirecting) return;

    setIsRedirecting(true);

    if (isInvitedAccount) {
      router.replace("/accept-invite");
      return;
    }

    const userId = user?.id;
    const role = getRoleFromAccessToken(session?.access_token ?? null);

    if (!userId) {
      router.replace("/dashboard");
      return;
    }

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, sector")
      .eq("id", userId)
      .single()
      .then(({ data: profile }) => {
        const needsOnboarding = !profile || !profile.full_name || !profile.sector;
        router.replace(getSignedInRedirectPath({ role, isInvitedAccount, needsOnboarding }));
      })
      .catch(() => router.replace("/dashboard"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    const { error, user: signedInUser, session: signedInSession } = await signInWithPassword(
      loginData.email.trim().toLowerCase(),
      loginData.password,
    );
    setIsSubmitting(false);

    if (error) {
      setLoginError(error);
      return;
    }

    setIsRedirecting(true);

    // Use the user + session already returned — no extra getSession/getUser calls
    const userId = signedInUser?.id;
    const role = getRoleFromAccessToken(signedInSession?.access_token ?? null);
    const isInvited = signedInUser?.user_metadata?.account_status === "invited";

    if (isInvited) {
      router.push("/accept-invite");
      return;
    }

    if (!userId) {
      router.push("/dashboard");
      return;
    }

    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, sector")
        .eq("id", userId)
        .single();

      const needsOnboarding = !profile || !profile.full_name || !profile.sector;
      router.push(getSignedInRedirectPath({ role, isInvitedAccount: isInvited, needsOnboarding }));
    } catch {
      router.push("/dashboard");
    }
  };

  const handleLoginInputChange = (field: string, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));
    if (loginError) setLoginError("");
  };

  if (isRedirecting) {
    return <FullPageLoader message="Signing in…" />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <main className="px-[5%] py-20">
        <div className="mx-auto max-w-[640px] space-y-8 text-center">
          <div>
            <h1 className="font-display text-4xl font-700 text-[var(--color-ink)]">
              Welcome back
            </h1>
            <p className="mt-4 text-lg text-[var(--color-body)]">
              Sign in to access your dashboard and matches
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <input
                className="gn-input"
                type="email"
                placeholder="Email address"
                value={loginData.email}
                onChange={(e) =>
                  handleLoginInputChange("email", e.target.value)
                }
                required
              />
              <input
                className="gn-input"
                type="password"
                placeholder="Password"
                value={loginData.password}
                onChange={(e) =>
                  handleLoginInputChange("password", e.target.value)
                }
                required
              />
            </div>

            <button
              className="w-full gn-btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in ->"}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-[var(--color-muted)]">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-[var(--color-primary)] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
