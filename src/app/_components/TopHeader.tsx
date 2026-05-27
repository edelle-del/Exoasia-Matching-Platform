"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import logo from "../logo.png";
import { FullPageLoader } from "./FullPageLoader";

const ICONS = {
  dashboard: "ri-dashboard-line",
  projects: "ri-folder-line",
  matches: "ri-heart-3-line",
  dealBoard: "ri-briefcase-line",
  documents: "ri-file-text-line",
  events: "ri-calendar-line",
  introductions: "ri-group-line",
  members: "ri-team-line",
  matchQueue: "ri-inbox-line",
  docReview: "ri-clipboard-line",
  manualMatch: "ri-magic-line",
  networkGraph: "ri-share-line",
  community: "ri-group-line",
  ecosystem: "ri-organization-chart",
  profile: "ri-user-3-line",
  signOut: "ri-logout-box-r-line",
  signIn: "ri-login-box-line",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <i
      aria-hidden="true"
      className={`text-xl leading-none ${name} ${className}`}
    />
  );
}

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
      className={`group/link flex w-full items-center gap-0 rounded-xl px-[10px] py-2.5 text-sm font-semibold transition-all duration-300 group-hover/sidebar:gap-3 group-hover/sidebar:px-3 ${
        isActive
          ? "bg-[#FF6B1F] text-white shadow-sm"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon name={icon} className="shrink-0" />
      <Label>{label}</Label>
    </Link>
  );
}

const NAV_ITEM_CLASS =
  "group/link flex w-full items-center gap-0 rounded-xl px-[10px] py-2.5 text-sm font-semibold transition-all duration-300 group-hover/sidebar:gap-3 group-hover/sidebar:px-3";

export default function TopHeader() {
  const { signedIn, signOut, role, memberRole, user, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdminView =
    !isLoading && signedIn && ["advisor", "admin"].includes(role ?? "");
  const isEcosystemPartner =
    !isLoading &&
    signedIn &&
    !isAdminView &&
    memberRole === "ecosystem_partner";
  const isMemberView =
    !isLoading && signedIn && role && !isAdminView && !isEcosystemPartner;

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");
  const firstName = displayName.includes("@")
    ? "Account"
    : displayName.split(" ")[0] || "Account";

  return (
    <>
      {isSigningOut && <FullPageLoader message="Signing out…" />}
      <aside className="fa-sidebar group/sidebar fixed left-3 top-3 z-40 flex h-[calc(100vh-24px)] w-14 flex-col rounded-2xl shadow-xl transition-all duration-300 hover:w-56">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-5">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image
              src={logo}
              alt="FOUNDERS ARENA"
              width={28}
              height={28}
              className="shrink-0 rounded"
            />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover/sidebar:max-w-[160px] group-hover/sidebar:opacity-100">
              <span className="flex items-center gap-1.5">
                <span className="block text-[11px] font-black tracking-widest text-white leading-tight uppercase">
                  FOUNDERS ARENA
                </span>
                <span className="fa-year-badge shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-semibold tracking-wider">
                  2026
                </span>
              </span>
              <span className="block text-[9px] text-white/40 tracking-wide">
                by Exoasia
              </span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-2">
          {signedIn && (
            <NavLink
              href="/dashboard"
              label="Dashboard"
              icon={ICONS.dashboard}
              exact
            />
          )}

          {isEcosystemPartner && (
            <>
              <NavLink
                href="/ecosystem"
                label="Portfolio"
                icon={ICONS.ecosystem}
              />
              <NavLink href="/events" label="Events" icon={ICONS.events} />
              <NavLink
                href="/community"
                label="Community"
                icon={ICONS.community}
              />
            </>
          )}

          {isMemberView && (
            <>
              <NavLink
                href="/deal-board"
                label="Deal board"
                icon={ICONS.dealBoard}
              />
              <NavLink
                href="/projects"
                label="Projects"
                icon={ICONS.projects}
              />
              <NavLink href="/events" label="Events" icon={ICONS.events} />
              <NavLink
                href="/community"
                label="Community"
                icon={ICONS.community}
              />
            </>
          )}

          {isAdminView && (
            <>
              <NavLink
                href="/advisor/introductions"
                label="Introductions"
                icon={ICONS.introductions}
              />
              <NavLink
                href="/advisor/members"
                label="Member management"
                icon={ICONS.members}
              />
              <NavLink
                href="/advisor/match-queue"
                label="Match review queue"
                icon={ICONS.matchQueue}
              />
              <NavLink
                href="/advisor/documents"
                label="Document review"
                icon={ICONS.docReview}
              />
              <NavLink
                href="/advisor/manual-match"
                label="Manual match"
                icon={ICONS.manualMatch}
              />
              <NavLink
                href="/advisor/network-graph"
                label="Network graph"
                icon={ICONS.networkGraph}
              />
            </>
          )}
        </nav>

        {/* Bottom: profile + sign out */}
        <div className="space-y-1 border-t border-white/20 px-2 py-3">
          {signedIn && (
            <>
              <Link
                href="/profile"
                className={`${NAV_ITEM_CLASS} text-white/70 hover:bg-white/10 hover:text-white`}
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
                className={`${NAV_ITEM_CLASS} text-white/70 hover:bg-white/10 hover:text-white`}
              >
                <Icon name={ICONS.signOut} className="shrink-0" />
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
