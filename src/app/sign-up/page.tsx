"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is required, the session will be null
    if (!data.session) {
      setEmailSent(true);
      return;
    }

    router.replace("/onboarding");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)]">
        <main className="px-[5%] py-20">
          <div className="mx-auto max-w-[640px] space-y-6 text-center">
            <h1 className="font-display text-4xl font-700 text-[var(--color-ink)]">
              Check your email
            </h1>
            <p className="text-lg text-[var(--color-body)]">
              We sent a confirmation link to{" "}
              <strong>{formData.email}</strong>. Click it to activate your
              account and complete onboarding.
            </p>
            <Link href="/sign-in" className="inline-block gn-btn-secondary">
              Back to sign in
            </Link>
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
              Join Founders Arena
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
