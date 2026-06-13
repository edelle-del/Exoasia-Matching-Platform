"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../providers";
import DocsHeader from "./_components/DocsHeader";
import DocsRoleTabs from "./_components/DocsRoleTabs";
import DocsSidebar, { DocsMobileNavButton } from "./_components/DocsSidebar";
import DocsSectionContent from "./_components/DocsSectionContent";
import { getNavForRole, getSectionsForRole } from "@/lib/docs/sections";
import type { MemberRole } from "@/lib/docs/types";
import { MEMBER_ROLES } from "@/lib/docs/types";
import "./docs.css";

const VALID_ROLES = new Set<string>(MEMBER_ROLES.map((r) => r.id));

function parseRole(value: string | null): MemberRole | null {
  if (value && VALID_ROLES.has(value)) return value as MemberRole;
  return null;
}

export default function DocsPageClient() {
  const { signedIn, memberRole, memberRoleLoaded } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryRole = parseRole(searchParams.get("role"));
  const detectedRole =
    memberRoleLoaded && memberRole && VALID_ROLES.has(memberRole)
      ? (memberRole as MemberRole)
      : null;

  const [activeRole, setActiveRole] = useState<MemberRole>("startup");
  const [activeSectionId, setActiveSectionId] = useState<string | null>("getting-started");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (queryRole) {
      setActiveRole(queryRole);
      return;
    }
    if (detectedRole) {
      setActiveRole(detectedRole);
    }
  }, [queryRole, detectedRole]);

  const sections = useMemo(() => getSectionsForRole(activeRole), [activeRole]);
  const navItems = useMemo(() => getNavForRole(activeRole), [activeRole]);

  const handleRoleChange = useCallback(
    (role: MemberRole) => {
      setActiveRole(role);
      setActiveSectionId(getSectionsForRole(role)[0]?.id ?? null);
      const params = new URLSearchParams(searchParams.toString());
      params.set("role", role);
      router.replace(`/docs?${params.toString()}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, searchParams],
  );

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSectionId(id);
    }
  }, []);

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const roleIntro = useMemo(() => {
    switch (activeRole) {
      case "startup":
        return "Guides for founders listing projects, finding investors, and tracking deals.";
      case "investor":
        return "Guides for investors scoring startups, expressing interest, and managing deal flow.";
      case "ecosystem_partner":
        return "Guides for accelerators and networks monitoring portfolio matching activity.";
    }
  }, [activeRole]);

  return (
    <div className="docs-shell flex flex-col bg-[#faf8f4] text-[#1a1028]" style={{ height: "100dvh" }}>
      {/* ── Fixed top: only the site header bar ── */}
      <div className="shrink-0">
        <DocsHeader signedIn={signedIn} />
      </div>

      {/* ── Body: left sidebar (static) + right column (scrollable) ── */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 overflow-hidden px-4 sm:px-6">

        {/* "On this page" sidebar — no heading above, never scrolls */}
        <DocsSidebar
          items={navItems}
          activeId={activeSectionId}
          onNavigate={scrollToSection}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />

        {/* Right column — everything scrolls here */}
        <div className="min-w-0 flex-1 overflow-y-auto pb-16">
          {/* Page intro: Documentation heading + lead + tabs + role intro */}
          <div className="pt-8 sm:pt-10">
            <header className="docs-page-header mb-6 max-w-3xl">
              <h1 className="docs-h1">Documentation</h1>
              <p className="docs-lead">
                Everything you need to use Founders Arena to discover aligned partners,
                manage introductions, and track deals with institutional discipline.
              </p>
            </header>

            <DocsRoleTabs
              activeRole={activeRole}
              onRoleChange={handleRoleChange}
              detectedRole={detectedRole}
            />

            <p className="mb-8 text-sm text-[#7a6a5a]">{roleIntro}</p>
          </div>

          <DocsMobileNavButton onClick={() => setMobileNavOpen(true)} />

          <article className="docs-article space-y-14">
            {sections.map((section) => (
              <DocsSectionContent
                key={section.id}
                id={section.id}
                title={section.title}
                blocks={section.blocks}
                role={activeRole}
              />
            ))}
          </article>

          <footer className="docs-cta mt-16 rounded-2xl border border-[#e8e0d0] bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-[#1a1028]">Ready to get started?</h2>
            <p className="mt-2 text-sm text-[#7a6a5a]">
              Join Founders Arena and start making verified, advisor-governed introductions.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-[#ff6b1f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e85a10]"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="rounded-lg border border-[#e8e0d0] bg-white px-5 py-2.5 text-sm font-semibold text-[#5a4a3a] transition hover:bg-[#f5efe0]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="rounded-lg bg-[#ff6b1f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e85a10]"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
