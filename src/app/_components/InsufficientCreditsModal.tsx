"use client";

import Link from "next/link";

type Props = {
  needed: number;
  balance: number;
  onClose: () => void;
};

export function InsufficientCreditsModal({ needed, balance, onClose }: Props) {
  if (process.env.NEXT_PUBLIC_BYPASS_CREDIT_GATES === "true") return null;

  const shortfall = needed - balance;

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
          <p className="text-sm text-white/50">
            Top up with a Match Bundle add-on to continue. Credits work on any plan — free tier or paid subscription.
          </p>

          {/* Match Bundle card — coming soon */}
          <div className="rounded-[14px] border border-[#FF6B1F]/30 bg-[#FF6B1F]/08 px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white text-sm">Match Bundle</p>
              <p className="text-[#FF6B1F] font-bold text-lg mt-0.5">
                100
                <span className="text-sm font-normal text-white/40 ml-1">credits</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white/80 font-bold text-base">$99</p>
              <p className="text-white/30 text-xs mt-0.5">$0.99 / cr</p>
            </div>
          </div>

          <p className="text-center text-[0.72rem] font-mono text-white/25 -mt-1">
            Credit purchases coming soon
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/25">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <Link
            href="/payments"
            onClick={onClose}
            className="block text-center text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            View plans &amp; pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}
