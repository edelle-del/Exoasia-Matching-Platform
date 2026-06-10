"use client";

import { useState } from "react";
import Link from "next/link";
import { CREDIT_PACKAGES, type CreditPackage } from "@/types/constants";

type Props = {
  needed: number;
  balance: number;
  onClose: () => void;
  onPurchased?: () => void;
};

export function InsufficientCreditsModal({ needed, balance, onClose, onPurchased }: Props) {
  const shortfall = needed - balance;
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [error, setError] = useState("");

  const handleBuy = async (pkg: CreditPackage) => {
    setPurchasing(pkg.id);
    setError("");
    try {
      const res = await fetch("/api/payments/mock-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Purchase failed. Please try again.");
        setPurchasing(null);
        return;
      }
      setPurchased(true);
      onPurchased?.();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setPurchasing(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] bg-[#1A0B2E] border border-[#C9A040]/25 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#2D0A28] to-[#1A0B2E] px-7 pt-7 pb-5 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C9A040]">
                Not Enough Credits
              </p>
              <h2 className="font-display mt-1 text-[1.4rem] text-white leading-tight">
                You need {shortfall} more credit{shortfall !== 1 ? "s" : ""}
              </h2>
              <p className="mt-1.5 text-sm text-white/50">
                Balance: <span className="text-white/80 font-semibold">{balance} cr</span>
                <span className="mx-2 text-white/20">·</span>
                Required: <span className="text-[#FF6B1F] font-semibold">{needed} cr</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white/70 transition-colors mt-0.5"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4">
          {purchased ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Credits added!</p>
                <p className="text-sm text-white/50 mt-0.5">You can now complete your action.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-[12px] bg-[#FF6B1F] py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/50">Top up your credits to continue:</p>

              {error && (
                <p className="rounded-[10px] bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-400">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2.5">
                {CREDIT_PACKAGES.map((pkg) => {
                  const covers = pkg.credits >= shortfall;
                  const isLoading = purchasing === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      disabled={!!purchasing}
                      onClick={() => void handleBuy(pkg)}
                      className={[
                        "relative flex items-center justify-between rounded-[14px] border px-5 py-4 text-left transition-all disabled:opacity-60",
                        covers
                          ? "border-[#FF6B1F]/40 bg-[#FF6B1F]/10 hover:bg-[#FF6B1F]/15"
                          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      {covers && (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-[#FF6B1F] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                          Recommended
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-white text-sm">{pkg.name}</p>
                        <p className="text-[#FF6B1F] font-bold text-lg mt-0.5">
                          {pkg.credits}
                          <span className="text-sm font-normal text-white/40 ml-1">credits</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white/80 font-bold text-base">${pkg.price}</p>
                        {isLoading ? (
                          <svg className="animate-spin h-4 w-4 text-[#FF6B1F] ml-auto mt-1" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <p className="text-white/30 text-xs mt-0.5">
                            ${(pkg.price / pkg.credits).toFixed(2)}/cr
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-xs text-white/25">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              <Link
                href="/payments"
                onClick={onClose}
                className="block text-center text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                View all plans & packages →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
