"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClientContext } from "@/lib/client-context";
import AuthNavBar from "../_components/AuthNavBar";

function MarketingPanel() {
  return (
    <div className="fa-panel hidden lg:flex lg:w-[52%] xl:w-[56%] relative overflow-hidden flex-col justify-between">
      <div className="absolute inset-0 pointer-events-none">
        <div className="fa-panel-blob-1 absolute top-0 left-0 w-[60%] h-[60%] rounded-full opacity-40" />
        <div className="fa-panel-blob-2 absolute bottom-0 right-0 w-[55%] h-[55%] rounded-full opacity-30" />
        <div className="fa-panel-blob-3 absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full opacity-25" />
      </div>
      <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16 py-6">
        <h2 className="fa-panel-headline text-4xl xl:text-5xl font-black leading-[1.08] tracking-tight text-white mb-3">
          Stop Pitching<br />Blind.
        </h2>
        <p className="fa-panel-headline text-2xl xl:text-3xl font-black leading-tight text-white mb-3">
          Your Next Investor Is<br />
          <span className="fa-panel-accent">Already Looking for You.</span>
        </p>
        <div className="mb-3">
          <span className="fa-panel-tagline inline-block text-xs tracking-[0.18em] uppercase pb-1">
            Not by chance. By design.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          {[
            { icon: "🧠", stat: "AI-Powered", label: "Matching Engine" },
            { icon: "✅", stat: "500+", label: "Verified Investors" },
            { icon: "🌏", stat: "15+", label: "Countries" },
            { icon: "📂", stat: "27", label: "Sectors Covered" },
          ].map(({ icon, stat, label }) => (
            <div key={stat} className="fa-panel-stat flex items-center gap-3 rounded-xl px-4 py-2">
              <span className="text-base">{icon}</span>
              <div>
                <p className="text-sm font-bold text-white leading-none">{stat}</p>
                <p className="fa-panel-stat-label text-[10px] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fa-panel-footer relative z-10 px-12 xl:px-16 py-3">
        <p className="text-[10px] tracking-widest uppercase">
          Powered by <span className="fa-panel-accent">Exoasia Innovation Hub</span> · 21F 8 Rockwell, Makati City
        </p>
      </div>
    </div>
  );
}

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

  const handleOAuth = async (provider: "google") => {
    setError("");
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError("Could not sign in with Google. Please try again or use email.");
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  if (checkEmailStep) {
    return (
    <div className="h-screen overflow-hidden flex flex-col bg-[var(--color-canvas)]">
        <AuthNavBar />
        <div className="flex flex-1 min-h-0">
          <MarketingPanel />
          <main className="flex flex-1 items-center justify-center px-8 sm:px-10 py-8 overflow-hidden bg-[var(--color-canvas)]">
          <div className="w-full max-w-[450px] mx-auto space-y-5 text-center">
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
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[var(--color-canvas)]">
      <AuthNavBar />
      <div className="flex flex-1 min-h-0">
        <MarketingPanel />
      <main className="flex flex-1 items-center justify-center px-8 sm:px-10 py-8 overflow-hidden bg-[var(--color-canvas)]">
        <div className="w-full max-w-[450px] mx-auto space-y-5 text-center">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--color-ink)]">
              Create your account
            </h1>
            <p className="mt-2 text-base text-[var(--color-body)]">
              Join FOUNDERS ARENA
            </p>
          </div>

          {/* OAuth buttons */}
          <div>
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
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-hairline)]" />
            <span className="text-xs text-[var(--color-muted)]">or sign up with email</span>
            <div className="h-px flex-1 bg-[var(--color-hairline)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <input
                className="gn-input-auth"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
              <input
                className="gn-input-auth"
                type="password"
                placeholder="Password (min. 8 characters)"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
              <input
                className="gn-input-auth"
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

          <p className="text-xs text-[var(--color-muted)] leading-relaxed px-4">
            By creating an account or continuing with Google, you agree to our <Link href="/terms" className="underline hover:text-[var(--color-ink)] transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-[var(--color-ink)] transition-colors">Privacy Policy</Link>.
          </p>

          <p className="text-sm text-[var(--color-muted)]">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-[var(--color-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
      </div>
    </div>
  );
}
