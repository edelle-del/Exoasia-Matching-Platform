"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClientContext } from "@/lib/client-context";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check-email step shown after signUp() succeeds but session is null (email not yet confirmed)
  const [checkEmailStep, setCheckEmailStep] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    const [supabase, ctx] = await Promise.all([
      Promise.resolve(createClient()),
      getClientContext(),
    ]);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          signin_location: ctx.location,
          signin_browser: ctx.browser,
        },
      },
    });
    setIsSubmitting(false);

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes("rate limit") ||
        signUpError.message.toLowerCase().includes("too many") ||
        signUpError.status === 429
      ) {
        setError(
          "Too many sign-up attempts from this address. Please wait a few minutes, then try again."
        );
      } else {
        setError(signUpError.message);
      }
      return;
    }

    if (!data.session) {
      // Email confirmation required — show check-email screen.
      setCheckEmailStep(true);
      return;
    }

    router.replace("/onboarding");
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendStatus === "sending") return;
    setResendStatus("sending");
    setError("");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: formData.email.trim().toLowerCase(),
    });
    if (resendError) {
      if (
        resendError.message.toLowerCase().includes("rate limit") ||
        resendError.message.toLowerCase().includes("too many") ||
        resendError.status === 429
      ) {
        setError("Too many attempts. Please wait a few minutes before resending.");
      } else {
        setError(resendError.message);
      }
      setResendStatus("idle");
    } else {
      setResendStatus("sent");
      setResendCooldown(60);
      setTimeout(() => setResendStatus("idle"), 3000);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError("");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(`Could not sign in with ${provider === "google" ? "Google" : "Apple"}. Please try again or use email.`);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  if (checkEmailStep) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)]">
        <main className="px-[5%] py-20">
          <div className="mx-auto max-w-[480px] space-y-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6 text-[var(--color-primary)]">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 7 10-7" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-700 text-[var(--color-ink)]">
              Check your email
            </h1>
            <p className="text-[var(--color-body)]">
              We sent a confirmation link to <strong>{formData.email}</strong>. Click the link to activate your account.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <p className="text-sm text-[var(--color-muted)]">
              Didn&apos;t receive an email?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendStatus === "sending"}
                className="text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                {resendStatus === "sending"
                  ? "Sending…"
                  : resendStatus === "sent"
                  ? "Sent!"
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend link"}
              </button>
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => { setCheckEmailStep(false); setError(""); }}
                className="text-[var(--color-primary)] hover:underline"
              >
                Go back
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <main className="px-[5%] py-20">
        <div className="mx-auto max-w-[640px] space-y-8 text-center">
          <div>
            <h1 className="font-display text-4xl font-700 text-[var(--color-ink)]">
              Create your account
            </h1>
            <p className="mt-4 text-lg text-[var(--color-body)]">
              Join FOUNDERS ARENA
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
            <span className="text-xs text-[var(--color-muted)]">or sign up with email</span>
            <div className="h-px flex-1 bg-[var(--color-hairline)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <input
                className="gn-input"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
              <input
                className="gn-input"
                type="password"
                placeholder="Password (min. 8 characters)"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
              <input
                className="gn-input"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
              />
            </div>

            <button
              className="w-full gn-btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account →"}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-[var(--color-muted)]">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-[var(--color-primary)] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
