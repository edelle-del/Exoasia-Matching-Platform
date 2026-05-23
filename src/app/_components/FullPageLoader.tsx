"use client";

import Image from "next/image";
import logo from "../logo.png";

type FullPageLoaderProps = {
  message?: string;
};

export function FullPageLoader({ message = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image src={logo} alt="Founders Arena" width={36} height={36} className="rounded-lg" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-900">Founders Arena</p>
          <p className="text-[11px] text-gray-400">by Exoasia</p>
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
            stroke="#E5E7EB"
            strokeWidth="4"
          />
          <circle
            cx="20" cy="20" r="16"
            stroke="#1a2744"
            strokeWidth="4"
            strokeDasharray="80"
            strokeDashoffset="60"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Message */}
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
}
