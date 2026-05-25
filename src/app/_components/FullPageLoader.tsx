"use client";

import Image from "next/image";
import logo from "../logo.png";

type FullPageLoaderProps = {
  message?: string;
};

export function FullPageLoader({ message = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0A0A0F]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image src={logo} alt="FOUNDERS ARENA" width={36} height={36} className="rounded-lg" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-[#F4F4FF]">FOUNDERS ARENA</p>
          <p className="text-[11px] text-[#8B8BA7]">by Exoasia</p>
        </div>
      </div>

      {/* Spinner */}
      <div className="relative h-10 w-10">
        <svg
          className="absolute inset-0 animate-spin"
          viewBox="0 0 40 40"
          fill="none"
        >
          <circle
            cx="20" cy="20" r="16"
            stroke="#2A2A3E"
            strokeWidth="4"
          />
          <circle
            cx="20" cy="20" r="16"
            stroke="#FF6B1F"
            strokeWidth="4"
            strokeDasharray="80"
            strokeDashoffset="60"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Message */}
      <p className="text-sm font-medium text-[#8B8BA7]">{message}</p>
    </div>
  );
}
