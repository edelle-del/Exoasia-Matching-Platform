"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type NominationInfo = {
  id: string;
  status: string;
  expires_at: string;
  message: string | null;
  partner: { full_name: string | null; business_name: string | null } | null;
};

function OtpBoxes({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const next = [...value];
    next[i] = char;
    onChange(next);
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      onChange(text.split(""));
      refs.current[5]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          aria-label={`Digit ${i + 1} of verification code`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] text-center text-xl font-700 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      ))}
    </div>
  );
}

export default function AcceptNominationPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nomination, setNomination] = useState<NominationInfo | null>(null);

  const partnerLabel =
    nomination?.partner?.full_name ||
    nomination?.partner?.business_name ||
    "An ecosystem partner";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    if (!email.trim()) { setError("Enter your email address."); return; }

    setSubmitting(true);
    setError("");
    const res = await fetch("/api/ecosystem/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Invalid code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      return;
    }

    setNomination(data.nomination);
  };

  if (nomination) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
        <div className="mx-auto max-w-[600px] space-y-6">
          <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6 text-[var(--color-primary)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-center text-2xl font-700 text-[var(--color-ink)]">Invite verified</h1>
            <p className="mt-2 text-center text-sm text-[var(--color-body)]">
              <strong>{partnerLabel}</strong> has invited your startup to the Founders Arena platform.
            </p>

            {nomination.message && (
              <div className="mt-4 rounded-lg bg-[var(--color-surface-soft)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Message from partner</p>
                <p className="mt-1 text-sm text-[var(--color-body)]">{nomination.message}</p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <p className="text-sm font-600 text-[var(--color-ink)]">To accept this nomination:</p>
              <Link
                href="/sign-up"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-3 font-600 text-white transition hover:opacity-90"
              >
                Create your account →
              </Link>
              <p className="text-center text-xs text-[var(--color-muted)]">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-[var(--color-primary)] hover:underline">Sign in</Link>
                {" "}— your startup will be linked after sign-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
      <div className="mx-auto max-w-[480px] space-y-6">
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
          <p className="text-xs font-600 uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Ecosystem Partner Nomination
          </p>
          <h1 className="mt-3 text-2xl font-700 text-[var(--color-ink)]">Enter your verification code</h1>
          <p className="mt-1 text-sm text-[var(--color-body)]">
            You received a 6-digit code from an ecosystem partner. Enter it below to view your nomination.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleVerify} className="mt-6 space-y-5">
            <div>
              <label htmlFor="nomination-email" className="block text-sm font-600 text-[var(--color-ink)]">
                Your email address
              </label>
              <input
                id="nomination-email"
                type="email"
                value={email}
                onChange={(e) => { setError(""); setEmail(e.target.value); }}
                className="mt-1 w-full rounded-lg border border-[var(--color-hairline)] px-4 py-3"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-600 text-[var(--color-ink)]">Verification code</p>
              <OtpBoxes value={otp} onChange={(v) => { setError(""); setOtp(v); }} />
            </div>

            <button
              type="submit"
              disabled={submitting || otp.join("").length < 6}
              className="w-full rounded-lg bg-[var(--color-primary)] py-3 font-600 text-white disabled:opacity-50"
            >
              {submitting ? "Verifying…" : "Verify code →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
