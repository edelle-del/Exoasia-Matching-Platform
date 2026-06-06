"use client";

import Link from "next/link";

type BottomNavProps = {
  activeStage: number;
  nextHref?: string;
  nextLabel?: string;
};

const stages = [0, 1, 2, 3, 4];

export default function BottomNav({
  activeStage,
  nextHref,
  nextLabel,
}: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-hairline)] bg-[var(--color-nav-bg)] backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {stages.map((stage) => (
            <span
              key={stage}
              className={`h-[8px] w-[8px] rounded-full transition-colors ${
                stage === activeStage
                  ? "bg-[var(--color-primary)] animate-pulse"
                  : "bg-[var(--color-hairline-soft)]"
              }`}
            />
          ))}
        </div>
        <div className="flex flex-1 justify-end">
          {nextHref && nextLabel ? (
            <Link
              className="inline-flex items-center gap-3 rounded-lg bg-[var(--color-primary)] px-6 py-2 text-sm font-500 text-white hover:bg-[var(--color-primary-active)]"
              href={nextHref}
            >
              <span className="hidden sm:inline">{nextLabel}</span>
              <span className="sm:hidden">Next →</span>
            </Link>
          ) : (
            <div className="h-[40px]" />
          )}
        </div>
      </div>
    </div>
  );
}
