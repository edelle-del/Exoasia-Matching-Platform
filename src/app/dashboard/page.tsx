"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDashboardSummary,
  fetchProjectPipelineStats,
  type AdvisorCompanyRecord,
  type AdvisorMatchRecord,
  type DashboardMatch,
  type DashboardProfile,
  type ProjectPipelineStats,
} from "@/lib/app-data";
import {
  ProfileStrength,
  PipelineSummaryCard,
  PartnerPortfolioCard,
  BenchmarkingChart,
} from "./_components/MemberWidgets";
import {
  SystemPulseHeader,
  AdvisorMetricCard,
  UrgencyQueuePanel,
  MatchingFunnelPanel,
  SectorPieChart,
  type CompanyWithMatches,
} from "./_components/AdvisorWidgets";

// ─── Profile strength helpers ─────────────────────────────────────────────────

const PROFILE_FIELDS: { key: keyof DashboardProfile; label: string }[] = [
  { key: "full_name", label: "Add your full name" },
  { key: "business_name", label: "Add your business name" },
  { key: "role_title", label: "Add your role title" },
  { key: "sector", label: "Add your industry sector" },
  { key: "city", label: "Add your city" },
  { key: "short_bio", label: "Write a short bio" },
  { key: "phone_whatsapp", label: "Add a WhatsApp number" },
  { key: "ask_categories", label: "Add what you're looking for" },
  { key: "offer_categories", label: "Add what you can offer" },
  { key: "asks_summary", label: "Describe your asks" },
  { key: "offers_summary", label: "Describe your offers" },
];

function computeProfileStrength(profile: DashboardProfile | null) {
  if (!profile)
    return { percent: 0, nextStep: "Complete your profile to get started" };
  let filled = 0;
  let nextStep: string | undefined;
  for (const { key, label } of PROFILE_FIELDS) {
    const val = profile[key];
    const isDefined = Array.isArray(val)
      ? val.length > 0
      : val !== null && val !== "";
    if (isDefined) {
      filled++;
    } else if (!nextStep) {
      nextStep = label;
    }
  }
  return {
    percent: Math.round((filled / PROFILE_FIELDS.length) * 100),
    nextStep,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, role, memberRole } = useAuth();
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "";
  const isAdvisorView = role && ["advisor", "admin"].includes(role);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [summary, setSummary] = useState({
    pendingMatches: 0,
    activeDeals: 0,
    credits: 0,
    profile: null as null | DashboardProfile,
    recentMatches: [] as DashboardMatch[],
    sectorAvgDeals: 0,
  });
  const [advisorData, setAdvisorData] = useState<{
    companies: AdvisorCompanyRecord[];
    matches: AdvisorMatchRecord[];
    sparkData: { value: number }[];
  }>({ companies: [], matches: [], sparkData: [] });
  const [pipelineStats, setPipelineStats] = useState<ProjectPipelineStats>({
    activeProjects: 0,
    investorMatches: 0,
    bestFit: 0,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      if (isAdvisorView) {
        const res = await fetch("/api/advisor/dashboard");
        if (!active) return;
        if (res.ok) {
          const next = await res.json();
          setAdvisorData(next);
        }
      } else {
        const next = await fetchDashboardSummary(supabase, user.id);
        if (!active) return;
        setSummary(next);
        const stats = await fetchProjectPipelineStats(
          supabase,
          user.id,
          next.profile?.member_role ?? null,
        );
        if (!active) return;
        setPipelineStats(stats);
      }
      setIsLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [supabase, user?.id, isAdvisorView]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount ?? 0))
      .catch(() => {});
  }, [user?.id]);

  const advisorDashboard = useMemo(() => {
    const counts = new Map<string, number>();
    const matchGroups = new Map<
      string,
      Array<{
        matchId: string;
        counterpartId: string;
        counterpartName: string;
        status: AdvisorMatchRecord["status"];
        fitScore: number | null;
      }>
    >();

    const companyNameById = new Map(
      advisorData.companies.map((company) => [
        company.id,
        company.business_name || company.full_name || "Verified company",
      ]),
    );

    advisorData.matches.forEach((match) => {
      const nameA =
        companyNameById.get(match.member_a_id) ?? "Verified company";
      const nameB =
        companyNameById.get(match.member_b_id) ?? "Verified company";

      counts.set(match.member_a_id, (counts.get(match.member_a_id) ?? 0) + 1);
      counts.set(match.member_b_id, (counts.get(match.member_b_id) ?? 0) + 1);

      const nextA = matchGroups.get(match.member_a_id) ?? [];
      nextA.push({
        matchId: match.id,
        counterpartId: match.member_b_id,
        counterpartName: nameB,
        status: match.status,
        fitScore: match.fit_score,
      });
      matchGroups.set(match.member_a_id, nextA);

      const nextB = matchGroups.get(match.member_b_id) ?? [];
      nextB.push({
        matchId: match.id,
        counterpartId: match.member_a_id,
        counterpartName: nameA,
        status: match.status,
        fitScore: match.fit_score,
      });
      matchGroups.set(match.member_b_id, nextB);
    });

    const companiesWithoutMatches = advisorData.companies.filter(
      (company) => (counts.get(company.id) ?? 0) === 0,
    );
    const companiesWithMatches = advisorData.companies
      .filter((company) => (counts.get(company.id) ?? 0) > 0)
      .map((company) => ({
        ...company,
        matches: matchGroups.get(company.id) ?? [],
      }));

    const pendingPairs = advisorData.matches.filter(
      (m) => m.status === "pending",
    ).length;
    const acceptedPairs = advisorData.matches.filter((m) =>
      ["approved", "accepted", "introduced"].includes(m.status),
    ).length;

    return {
      totalCompanies: advisorData.companies.length,
      companiesWithoutMatches,
      companiesWithMatches,
      pendingPairs,
      acceptedPairs,
    };
  }, [advisorData]);

  // ─── Advisor view ───────────────────────────────────────────────────────────

  if (isAdvisorView) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] px-[5%] py-12">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <SystemPulseHeader
            displayName={displayName}
            role={role ?? null}
            urgentCount={advisorDashboard.companiesWithoutMatches.length}
          />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdvisorMetricCard
              label="Total companies"
              value={
                isLoading ? "..." : String(advisorDashboard.totalCompanies)
              }
              accent="text-gray-900"
            />
            <AdvisorMetricCard
              label="Need matching"
              value={
                isLoading
                  ? "..."
                  : String(advisorDashboard.companiesWithoutMatches.length)
              }
              accent={
                advisorDashboard.companiesWithoutMatches.length > 0
                  ? "text-rose-500"
                  : "text-emerald-600"
              }
              sub={
                advisorDashboard.companiesWithoutMatches.length > 0
                  ? "Require attention"
                  : "All matched"
              }
            />
            <AdvisorMetricCard
              label="Pending pairs"
              value={isLoading ? "..." : String(advisorDashboard.pendingPairs)}
              accent="text-amber-500"
            />
            <AdvisorMetricCard
              label="Approved pairs"
              value={isLoading ? "..." : String(advisorDashboard.acceptedPairs)}
              accent="text-emerald-600"
              sub="Approved · accepted · introduced"
              sparkData={isLoading ? [] : advisorData.sparkData}
              sparkColor="#10B981"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <UrgencyQueuePanel
              companies={advisorDashboard.companiesWithoutMatches}
              isLoading={isLoading}
            />
            <MatchingFunnelPanel
              companies={
                advisorDashboard.companiesWithMatches as CompanyWithMatches[]
              }
              isLoading={isLoading}
            />
            <SectorPieChart companies={advisorData.companies} />
          </section>
        </div>
      </div>
    );
  }

  // ─── Member view ────────────────────────────────────────────────────────────

  const rawName = displayName || summary.profile?.full_name || "";
  const firstName = rawName.includes("@")
    ? "there"
    : rawName.split(" ")[0] || "there";

  const portalLabel =
    summary.profile?.member_role === "investor"
      ? "Investor Profile"
      : summary.profile?.member_role === "startup"
        ? "Startup Profile"
        : summary.profile?.member_role === "ecosystem_partner"
          ? "Partner Profile"
          : "Member Portal";

  const { percent: profilePercent, nextStep: profileNextStep } =
    computeProfileStrength(summary.profile);

  const benchmarkData = [
    { name: "You", value: isLoading ? 0 : summary.activeDeals },
    { name: "Sector avg", value: isLoading ? 0 : summary.sectorAvgDeals },
  ];

  return (
    <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* Greeting */}
        <section className="rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-muted)">
                {isLoading ? "Member Portal" : portalLabel}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
                Hello,{" "}
                <span className="text-(--color-primary)">{firstName}</span>
              </h1>
              <p className="mt-2 text-sm text-(--color-body)">
                You're a member at Stage {summary.profile?.stage || "0"} ·
                Verification{" "}
                {summary.profile?.verification_status || "unverified"}
              </p>
            </div>
            <Link
              href="/notifications"
              className="relative mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-(--color-hairline) bg-(--color-canvas) text-(--color-ink) transition-colors hover:bg-(--color-surface-soft)"
              aria-label="Notifications"
            >
              <i
                className="ri-notification-3-line text-lg"
                aria-hidden="true"
              />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </section>

        {/* Row 1: 4 metric cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pending matches"
            value={isLoading ? "..." : String(summary.pendingMatches)}
            valueColor="text-amber-500"
          />
          <MetricCard
            label="Active deals"
            value={isLoading ? "..." : String(summary.activeDeals)}
            valueColor="text-emerald-600"
          />
          <MetricCard
            label="Credits"
            value={isLoading ? "..." : String(summary.credits)}
            valueColor="text-blue-600"
          />
          <BenchmarkingChart data={benchmarkData} label="Active deals" />
        </section>

        {/* Row 2: Profile strength + Pipeline summary / Partner card */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ProfileStrength
            percent={isLoading ? 0 : profilePercent}
            nextStep={profileNextStep}
          />
          {(memberRole ?? summary.profile?.member_role) ===
          "ecosystem_partner" ? (
            <PartnerPortfolioCard />
          ) : (
            <PipelineSummaryCard
              activeProjects={isLoading ? 0 : pipelineStats.activeProjects}
              investorMatches={isLoading ? 0 : pipelineStats.investorMatches}
              bestFit={isLoading ? 0 : pipelineStats.bestFit}
              memberRole={summary.profile?.member_role ?? null}
              isLoading={isLoading}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueColor = "text-(--color-primary)",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) px-4 py-3">
      <p className="text-xs uppercase tracking-[0.12em] text-(--color-muted)">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${valueColor}`}>{value}</p>
    </div>
  );
}
