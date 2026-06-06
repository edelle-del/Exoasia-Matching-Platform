"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/account-settings"), 2500);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-[480px] space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-700 text-(--color-ink)">Password updated</h1>
          <p className="text-sm text-(--color-body)">Redirecting to account settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-20">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div>
          <h1 className="text-3xl font-700 text-(--color-ink)">Set new password</h1>
          <p className="mt-2 text-sm text-(--color-body)">Choose a strong password for your account.</p>
        </div>
        <form onSubmit={handleSetPassword} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <input
            type="password"
            className="gn-input"
            placeholder="New password (min. 8 characters)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            required
          />
          <input
            type="password"
            className="gn-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full gn-btn-primary disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
