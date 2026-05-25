"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import logo from "../logo.png";
import { FullPageLoader } from "./FullPageLoader";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 ${className}`}
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard:     "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  projects:      "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  matches:       "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  dealBoard:     "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7",
  documents:     "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  events:        "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  introductions: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  members:       "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  matchQueue:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  docReview:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  manualMatch:   "M13 10V3L4 14h7v7l9-11h-7z",
  networkGraph:  "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  community:     "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  profile:       "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  signOut:       "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  signIn:        "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/sidebar:max-w-[160px] group-hover/sidebar:opacity-100">
      {children}
    </span>
  );
}

function NavLink({
  href,
  label,
  icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        isActive
          ? "bg-[#FF6B1F] text-white shadow-sm"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon d={icon} />
      <Label>{label}</Label>
    </Link>
  );
}


export default function TopHeader() {
  const { signedIn, signOut, role, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdminView = signedIn && ["advisor", "admin"].includes(role ?? "");
  const isMemberView = signedIn && role && !isAdminView;

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");
  const firstName = displayName.includes("@")
    ? "Account"
    : (displayName.split(" ")[0] || "Account");

  return (
    <>
    {isSigningOut && <FullPageLoader message="Signing out…" />}
    <aside className="fa-sidebar group/sidebar fixed left-3 top-3 z-40 flex h-[calc(100vh-24px)] w-14 flex-col rounded-2xl shadow-xl transition-all duration-300 hover:w-56">

      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-5">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image src={logo} alt="FOUNDERS ARENA" width={28} height={28} className="shrink-0 rounded" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/sidebar:max-w-[160px] group-hover/sidebar:opacity-100">
            <span className="flex items-center gap-1.5">
              <span className="block text-[11px] font-black tracking-widest text-white leading-tight uppercase">FOUNDERS ARENA</span>
              <span className="fa-year-badge shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-semibold tracking-wider">2026</span>
            </span>
            <span className="block text-[9px] text-white/40 tracking-wide">by Exoasia</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {signedIn && (
          <NavLink href="/dashboard" label="Dashboard" icon={ICONS.dashboard} exact />
        )}

        {isMemberView && (
          <>
            <NavLink href="/deal-board" label="Deal board" icon={ICONS.dealBoard} />
            <NavLink href="/projects"   label="Projects"   icon={ICONS.projects}  />
            <NavLink href="/events"     label="Events"     icon={ICONS.events}    />
            <NavLink href="/community"  label="Community"  icon={ICONS.community} />
          </>
        )}

        {isAdminView && (
          <>
            <NavLink href="/advisor/introductions" label="Introductions"      icon={ICONS.introductions} />
            <NavLink href="/advisor/members"       label="Member management"  icon={ICONS.members}       />
            <NavLink href="/advisor/match-queue"   label="Match review queue" icon={ICONS.matchQueue}    />
            <NavLink href="/advisor/documents"     label="Document review"    icon={ICONS.docReview}     />
            <NavLink href="/advisor/manual-match"  label="Manual match"       icon={ICONS.manualMatch}   />
            <NavLink href="/advisor/network-graph" label="Network graph"      icon={ICONS.networkGraph}  />
          </>
        )}
      </nav>

      {/* Bottom: profile + sign out */}
      <div className="space-y-1 border-t border-white/20 px-2 py-3">
        {signedIn && (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white">
                {initials || "?"}
              </div>
              <Label>{firstName}</Label>
            </Link>

            <button
              type="button"
              onClick={async () => {
                setIsSigningOut(true);
                await signOut();
                window.location.href = "/";
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-red-500/80 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <Icon d={ICONS.signOut} />
              <Label>Sign out</Label>
            </button>
          </>
        )}

        {!signedIn && (
          <NavLink href="/sign-in" label="Sign in" icon={ICONS.signIn} />
        )}
      </div>
    </aside>
    </>
  );
}
