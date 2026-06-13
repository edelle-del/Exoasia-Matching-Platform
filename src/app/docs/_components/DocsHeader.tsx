"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "@/app/logo.png";

export default function DocsHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="docs-header sticky top-0 z-30 border-b border-[#e8e0d0] bg-[#faf8f4]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src={logo} alt="Founders Arena" width={24} height={24} className="rounded" />
            <span className="text-sm font-black tracking-widest text-[#1a1028] uppercase">
              Founders Arena
            </span>
          </Link>
          <span className="hidden text-sm font-semibold text-[#ff6b1f] sm:inline">Docs</span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#5a4a3a] transition hover:bg-[#f0ebe0]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#5a4a3a] transition hover:bg-[#f0ebe0]"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-[#ff6b1f] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#e85a10]"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
