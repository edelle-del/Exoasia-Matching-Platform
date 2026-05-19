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
  const { signedIn, signInWithPassword, isInvitedAccount } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!signedIn) return;

    const redirectBasedOnProfile = async () => {
      setIsRedirecting(true);
      if (isInvitedAccount) {
        router.replace("/accept-invite");
        return;
      }

      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token ?? null;
        const role = getRoleFromAccessToken(accessToken);

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
            role,
            isInvitedAccount,
            needsOnboarding,
          }),
        );
      } catch {
        router.replace("/dashboard");
      }
    };

    void redirectBasedOnProfile();
  }, [signedIn, isInvitedAccount, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      setLoginError("Please enter your email and password");
      return;
    }

    setIsSubmitting(true);
    const normalizedEmail = loginData.email.trim().toLowerCase();
    const { error, user: signedInUser } = await signInWithPassword(
      normalizedEmail,
      loginData.password,
    );

    setIsSubmitting(false);

    if (error) {
      setLoginError(error);
      return;
    }

    setIsRedirecting(true);

    const accountStatus = signedInUser?.user_metadata?.account_status;
    if (accountStatus === "invited") {
      router.push("/accept-invite");
      return;
    }

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token ?? null;
      const role = getRoleFromAccessToken(accessToken);

      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;

      if (!userId) {
        router.push("/dashboard");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, sector")
        .eq("id", userId)
        .single();

      const needsOnboarding = !profile || !profile.full_name || !profile.sector;
      router.push(
        getSignedInRedirectPath({
          role,
          isInvitedAccount:
            signedInUser?.user_metadata?.account_status === "invited",
          needsOnboarding,
        }),
      );
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
