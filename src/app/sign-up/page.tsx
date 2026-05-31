"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClientContext } from "@/lib/client-context";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP step shown after signUp() succeeds but session is null (email not yet confirmed)
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        data: {
          signin_location: ctx.location,
          signin_browser: ctx.browser,
        },
      },
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      // Email confirmation required — show OTP input.
      // The Supabase "Confirm signup" email template must include {{ .Token }}
      // so the 8-digit code reaches the user's inbox.
      setOtpStep(true);
      return;
    }

    router.replace("/onboarding");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError("");
    if (value && index < 7) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (text.length === 8) {
      setOtp(text.split(""));
      otpRefs.current[7]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 8) { setError("Enter the full 8-digit code."); return; }

    setOtpSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: formData.email.trim().toLowerCase(),
      token: code,
      type: "signup",
    });
    setOtpSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      setOtp(["", "", "", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      return;
    }

    router.replace("/onboarding");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  if (otpStep) {
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
              We sent an 8-digit code to <strong>{formData.email}</strong>. Enter it below to activate your account.
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    aria-label={`Digit ${i + 1} of verification code`}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-14 w-12 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-center text-xl font-700 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                ))}
              </div>

              <button
                className="w-full gn-btn-primary"
                type="submit"
                disabled={otpSubmitting || otp.join("").length < 8}
              >
                {otpSubmitting ? "Verifying…" : "Verify & continue →"}
              </button>
            </form>

            <p className="text-sm text-[var(--color-muted)]">
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtp(["", "", "", "", "", "", "", ""]); setError(""); }}
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
