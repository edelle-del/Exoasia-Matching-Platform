"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center px-4 sm:px-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mx-auto">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-700 text-[var(--color-ink)]">Payment successful</h1>
        <p className="mt-3 text-[var(--color-body)]">
          Your payment has been processed. Credits and subscription updates will reflect in your
          account shortly.
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
