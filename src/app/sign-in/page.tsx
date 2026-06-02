"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";
import { getSignedInRedirectPath } from "@/lib/auth/access";
import { FullPageLoader } from "../_components/FullPageLoader";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signedIn, signInWithPassword, isInvitedAccount, session, user } = useAuth();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState(
    searchParams.get("error") === "oauth_failed"
      ? "Sign-in failed. Please try again or use email."
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Please enter your email address.");
      return;
    }
    setForgotLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
    );
    setForgotLoading(false);
    if (error) {
      setForgotError(error.message);
      return;
    }
    setForgotSuccess(true);
  };

  const openForgotPassword = () => {
    setForgotEmail(loginData.email);
    setForgotError("");
    setForgotSuccess(false);
    setShowForgotPassword(true);
  };

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
    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, sector")
          .eq("id", userId)
          .single();

        const needsOnboarding = !profile || !profile.full_name || !profile.sector;
        router.replace(getSignedInRedirectPath({ role, isInvitedAccount, needsOnboarding }));
      } catch {
        router.replace("/dashboard");
      }
    };

    fetchProfile();
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

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoginError("");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setLoginError(`Could not sign in with ${provider === "google" ? "Google" : "Apple"}. Please try again or use email.`);
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

          {/* OAuth buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3 text-sm font-600 text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3 text-sm font-600 text-[var(--color-ink)] transition hover:bg-[var(--color-surface-soft)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.28.07 2.17.73 2.93.75.96-.19 1.88-.87 3.04-.94 1.36-.06 2.61.55 3.32 1.66-3.03 1.82-2.53 5.82.38 7.03-.61 1.5-1.38 2.97-1.67 3.38zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-hairline)]" />
            <span className="text-xs text-[var(--color-muted)]">or sign in with email</span>
            <div className="h-px flex-1 bg-[var(--color-hairline)]" />
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
              <div>
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
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
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

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 shadow-xl">
            {forgotSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Check your email</h2>
                <p className="mt-2 text-sm text-[var(--color-body)]">
                  We&apos;ve sent a password reset link to <span className="font-medium">{forgotEmail}</span>. Follow the link to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="mt-6 w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[var(--color-ink)]">Forgot your password?</h2>
                <p className="mt-2 text-sm text-[var(--color-body)]">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
                  <input
                    type="email"
                    className="gn-input"
                    placeholder="Email address"
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                    required
                    autoFocus
                  />
                  {forgotError && <p className="text-xs text-red-600">{forgotError}</p>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 rounded-xl border border-[var(--color-hairline)] py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {forgotLoading ? "Sending…" : "Send reset link"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
