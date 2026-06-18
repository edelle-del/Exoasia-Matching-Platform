"use client";

import React from "react";

export default function PieScore({
  score,
  size = 32,
  large = false,
  color,
}: {
  score: number;
  size?: number;
  large?: boolean;
  color?: string;
}) {
  const stroke = large ? 5 : 4;
  const s = Math.max(12, size);
  const radius = (s - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = circumference * (1 - clamped / 100);

  const sizeClass = s <= 24 ? "w-6 h-6"
    : s <= 28 ? "w-7 h-7"
    : s <= 32 ? "w-8 h-8"
    : s <= 40 ? "w-10 h-10"
    : "w-12 h-12";

  return (
    <div
      role="img"
      aria-label={`Score ${clamped} percent`}
      className={`group inline-flex items-center justify-center relative ${sizeClass}`}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <title>{`${clamped}%`}</title>
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          strokeWidth={stroke}
          stroke="var(--color-hairline)"
          fill="none"
        />
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={color || "var(--color-primary)"}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${s / 2} ${s / 2})`}
          fill="none"
        />
      </svg>

      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-(--color-ink) opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        {clamped}%
      </span>
    </div>
  );
}
