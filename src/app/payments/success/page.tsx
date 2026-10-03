"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const paymentId = params.get("payment_id");
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!sessionId && !paymentId) { setStatus("invalid"); return; }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    setStatus("checking");
    const check = async () => {
      try {
        const query = paymentId ? `payment_id=${encodeURIComponent(paymentId)}` : `session_id=${encodeURIComponent(sessionId!)}`;
        const response = await fetch(`/api/payments/status?${query}`, { cache: "no-store" });
        const data = await response.json();
        if (stopped) return;
        if (!response.ok) { setStatus(response.status >= 500 ? "error" : "invalid"); return; }
        setStatus(data.status);
        if (data.status === "pending" && ++attempts < 10) timer = setTimeout(check, 3000);
      } catch { if (!stopped) setStatus("error"); }
    };
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [sessionId, paymentId]);

  const paid = status === "paid";
  const title = paid ? "Payment successful" : status === "failed" ? "Payment failed"
    : status === "invalid" ? "Checkout not found" : status === "error" ? "Unable to verify payment" : "Verifying payment";
  const message = paid ? "Your payment has been confirmed. Your account has been updated."
    : status === "invalid" ? "Open this page from your checkout confirmation to verify a payment."
    : status === "failed" ? "Your payment was not completed. Return to payments to try again."
    : status === "error" ? "Please refresh to retry verification or check your payment history."
    : "We are waiting for payment confirmation. Check your payment history if this takes longer than expected.";

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-4 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        {paid && <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>}

        <h1 className="text-2xl font-700 text-[var(--color-ink)]" aria-live="polite">{title}</h1>
        <p className="mt-3 text-[var(--color-body)]">
          {message}
        </p>

        {sessionId && (
          <p className="mt-2 text-xs text-[var(--color-muted)] font-mono break-all">
            Ref: {sessionId}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 font-500 text-white hover:bg-[var(--color-primary-active)]"
          >
            Go to dashboard
          </Link>
          <Link
            href="/payments"
            className="rounded-lg border border-[var(--color-hairline)] px-6 py-2.5 font-500 text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)]"
          >
            View payments
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
