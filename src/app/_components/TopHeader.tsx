"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../providers";
import logo from "../logo.png";
import { FullPageLoader } from "./FullPageLoader";
import { NotificationBell } from "./NotificationBell";

const ICONS = {
  dashboard: "ri-dashboard-line",
  projects: "ri-folder-line",
  matches: "ri-heart-3-line",
  requests: "ri-inbox-2-line",
  dealBoard: "ri-briefcase-line",
  documents: "ri-file-text-line",
  dataRoom: "ri-database-2-line",
  events: "ri-calendar-line",
  introductions: "ri-group-line",
  members: "ri-team-line",
  matchQueue: "ri-inbox-line",
  docReview: "ri-clipboard-line",
  manualMatch: "ri-magic-line",
  networkGraph: "ri-share-line",
  community: "ri-group-line",
  featureRequests: "ri-lightbulb-line",
  ecosystem: "ri-organization-chart",
  profile: "ri-user-3-line",
  signOut: "ri-logout-box-r-line",
  signIn: "ri-login-box-line",
  docs: "ri-book-open-line",
  announcements: "ri-notification-3-line",
  creditRequests: "ri-bank-card-line",
  messages: "ri-message-3-line",
  bugReport: "ri-bug-line",
  guide: "ri-compass-3-line",
  track: "ri-route-line",
  leaderboard: "ri-trophy-line",
  badges: "ri-medal-line",
  kudos: "ri-thumb-up-line",
  rituals: "ri-calendar-event-line",
  alumni: "ri-group-2-line",
  launchpad: "ri-rocket-line",
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
    <span className="whitespace-nowrap opacity-100">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap opacity-100">
      {children}
    </div>
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
      className={`group/link flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-300 ${
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
  "group/link flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-300";

function RequestsNavItem() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/requests");
  const [count, setCount] = useState(0);

  const refresh = () => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((d) => setCount(d.totalPending ?? 0))
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Refetch whenever the user navigates away from /requests (they may have acted on some)
  useEffect(() => {
    if (!pathname.startsWith("/requests")) refresh();
  }, [pathname]);

  return (
    <Link
      href="/requests"
      className={`group/link relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-300 ${
        isActive
          ? "bg-[#FF6B1F] text-white shadow-sm"
          : "text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="relative shrink-0">
        <Icon name={ICONS.requests} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <Label>Requests</Label>
    </Link>
  );
}

export default function TopHeader() {
  const pathname = usePathname();
  const { signedIn, signOut, role, memberRole, user, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  const getDisplayRole = () => {
    if (role === "admin") return "ADMIN";
    if (role === "advisor") return "ADVISOR";
    if (memberRole === "startup") return "FOUNDER";
    if (memberRole === "investor") return "INVESTOR";
    if (memberRole === "ecosystem_partner") return "PARTNER";
    return "MEMBER";
  };

  const LogoContent = () => (
    <div className="flex shrink-0 items-center gap-3">
      <Image
        src={logo}
        alt="FOUNDERS ARENA"
        width={28}
        height={28}
        className="shrink-0 rounded"
      />
      <span className="flex items-center gap-1.5 whitespace-nowrap opacity-100">
        <span className="block text-[11px] font-black tracking-widest text-white leading-tight uppercase">
          FOUNDERS ARENA
        </span>
        <span className="fa-year-badge shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-semibold tracking-wider bg-white/10">
          2026
        </span>
      </span>
    </div>
  );

  const NavLinks = () => (
    <>
      {signedIn && (
        <>
          <NavLink
            href="/dashboard"
            label="Dashboard"
            icon={ICONS.dashboard}
            exact
          />
          <NavLink
            href="/announcements"
            label="Announcements"
            icon={ICONS.announcements}
          />
        </>
      )}

      {isEcosystemPartner && (
        <>
          <NavLink
            href="/ecosystem"
            label="Portfolio"
            icon={ICONS.ecosystem}
          />
          <RequestsNavItem />
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

          <SectionLabel>Program:</SectionLabel>
          <NavLink href="/matches" label="Matches" icon={ICONS.matches} />
          <NavLink href="/deal-board" label="Deal board" icon={ICONS.dealBoard} />
          <RequestsNavItem />
          <NavLink href="/data-room" label="Data Room" icon={ICONS.dataRoom} />

          <SectionLabel>Culture:</SectionLabel>
          <NavLink href="/community" label="Community" icon={ICONS.community} />
          <NavLink href="/events" label="Events" icon={ICONS.events} />

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
          {role === "admin" && (
            <>
              <SectionLabel>Admin</SectionLabel>
              <NavLink
                href="/admin/users"
                label="User management"
                icon={ICONS.members}
              />
              <NavLink
                href="/admin/deal-boards"
                label="Deal Boards"
                icon={ICONS.dealBoard}
              />
              <NavLink
                href="/admin/credit-requests"
                label="Credit Requests"
                icon={ICONS.creditRequests}
              />
            </>
          )}
        </>
      )}

      {signedIn && (
        <>
          <SectionLabel>Support</SectionLabel>
          <NavLink
            href="/feature-requests"
            label="Request a Feature"
            icon={ICONS.featureRequests}
          />
          <NavLink
            href="/account-settings"
            label="Report a Bug"
            icon={ICONS.bugReport}
          />
          <NavLink
            href="/docs"
            label="Help Center"
            icon={ICONS.docs}
          />
        </>
      )}
    </>
  );

  const ProfileCard = () => {
    if (!signedIn) return null;
    return (
      <Link
        href="/profile"
        className={`${NAV_ITEM_CLASS} text-white/70 hover:bg-white/10 hover:text-white mb-2 mx-2`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
          {initials || "?"}
        </div>
        <div className="flex flex-col opacity-100 min-w-0 flex-1">
          <span className="font-bold text-white text-sm truncate" title={displayName}>{firstName}</span>
          <span className="text-[10px] font-semibold text-[#FF6B1F] uppercase tracking-wider truncate">
            {getDisplayRole()}
          </span>
        </div>
      </Link>
    );
  };

  const BottomProfile = () => (
    <div className="space-y-1 border-t border-white/20 px-2 py-3 mt-auto">
      {signedIn && (
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
      )}

      {!signedIn && (
        <NavLink href="/sign-in" label="Sign in" icon={ICONS.signIn} />
      )}
    </div>
  );

  return (
    <>
      {isSigningOut && <FullPageLoader message="Signing out…" />}

      {/* Mobile Top App Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-[#0a0a0f] border-b border-white/10 px-4">
        <Link href="/">
          <LogoContent />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell currentUserId={user?.id ?? null} />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -mr-2 text-white/80 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            <Icon name={isMobileMenuOpen ? "ri-close-line" : "ri-menu-3-line"} className="text-2xl" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-40 bg-[#0a0a0f] overflow-y-auto pb-6 pt-4">
          <ProfileCard />
          <nav className="p-4 space-y-2">
            <NavLinks />
          </nav>
          <div className="mt-auto">
            <BottomProfile />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fa-sidebar hidden md:flex fixed top-0 left-0 z-40 h-screen w-56 flex-col bg-[#0a0a0f] border-r border-white/10 shadow-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-5">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <LogoContent />
          </Link>
        </div>

        <ProfileCard />

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 mt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <NavLinks />
        </nav>

        {/* Bottom: profile + sign out */}
        <BottomProfile />
      </aside>
    </>
  );
}
