"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import {
  fetchDashboardSummary,
  fetchProjectPipelineStats,
  fetchDealCards,
  type AdvisorCompanyRecord,
  type AdvisorMatchRecord,
  type DashboardMatch,
  type DashboardProfile,
  type ProjectPipelineStats,
} from "@/lib/app-data";
import {
  PartnerPortfolioCard,
  DealBoardSnapshotCard,
  NotificationsCard,
  type NotificationItem,
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
  const [dealStageCounts, setDealStageCounts] = useState<
    Record<string, number>
  >({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
        const [stats, dealCards] = await Promise.all([
          fetchProjectPipelineStats(
            supabase,
            user.id,
            next.profile?.member_role ?? null,
          ),
          fetchDealCards(supabase, user.id),
        ]);
        if (!active) return;
        setPipelineStats(stats);
        // Map DB enum values → display labels used by the chart
        const DB_TO_LABEL: Record<string, string> = {
          discover:    "Qualified",
          intro:       "Intro & Scoping",
          proposal:    "Proposal",
          negotiation: "Negotiation",
          won:         "Closed Won",
          lost:        "On Hold",
        };
        const counts: Record<string, number> = {};
        for (const card of dealCards as { stage: string }[]) {
          const label = DB_TO_LABEL[card.stage] ?? card.stage;
          counts[label] = (counts[label] ?? 0) + 1;
        }
        setDealStageCounts(counts);
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
      .then((data) => {
        setUnreadCount(data.unreadCount ?? 0);
        setNotifications(data.notifications ?? []);
      })
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
        ? "Founder Profile"
        : summary.profile?.member_role === "ecosystem_partner"
          ? "Partner Profile"
          : "Member Portal";

  const { percent: profilePercent, nextStep: profileNextStep } =
    computeProfileStrength(summary.profile);

  const currentRole = memberRole ?? summary.profile?.member_role;
  const isInvestor = currentRole === "investor";
  const isEcosystemPartner = currentRole === "ecosystem_partner";

  return (
    <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* Row 0: Greeting (profile strength inline next to name) */}
        <section className="rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-muted)">
              {isLoading ? "Member Portal" : portalLabel}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-(--color-ink)">
                Hello,{" "}
                <span className="text-(--color-primary)">{firstName}</span>
              </h1>
              <ProfileStrengthRing percent={isLoading ? 0 : profilePercent} />
            </div>
            <p className="mt-2 text-sm text-(--color-body)">
              You're a member at Stage {summary.profile?.stage || "0"} ·
              Verification{" "}
              {summary.profile?.verification_status || "unverified"}
            </p>
            {profileNextStep && (
              <p className="mt-1 text-xs text-(--color-muted)">
                <span className="font-semibold text-(--color-body)">Next:</span>{" "}
                {profileNextStep}
              </p>
            )}
          </div>
        </section>

        {/* Row 1: Credits + Pipeline stats */}
        <section className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-4">
          <MetricCard
            label="Credits"
            value={isLoading ? "..." : String(summary.credits)}
            valueColor="text-blue-600"
          />
          <MetricCard
            label={isInvestor ? "Opportunities" : "Projects"}
            value={
              isLoading
                ? "..."
                : pipelineStats.activeProjects > 0
                  ? String(pipelineStats.activeProjects)
                  : "—"
            }
            valueColor="text-indigo-500"
          />
          <MetricCard
            label={isInvestor ? "Score cards" : "Inv. matches"}
            value={
              isLoading
                ? "..."
                : pipelineStats.investorMatches > 0
                  ? String(pipelineStats.investorMatches)
                  : "—"
            }
            valueColor="text-violet-500"
          />
          <MetricCard
            label="Best fit"
            value={
              isLoading
                ? "..."
                : pipelineStats.bestFit > 0
                  ? `${pipelineStats.bestFit}%`
                  : "—"
            }
            valueColor={
              pipelineStats.bestFit >= 80
                ? "text-emerald-500"
                : pipelineStats.bestFit >= 65
                  ? "text-indigo-500"
                  : "text-amber-500"
            }
          />
        </div>
        {!isInvestor && (
          <div className="flex justify-end">
            <Link
              href="/matches"
              className="text-xs font-semibold text-indigo-400 hover:underline"
            >
              View project pipeline →
            </Link>
          </div>
        )}
        </section>

        {/* Row 2: Deal board graph + Notifications */}
        <section className="grid gap-6 lg:grid-cols-2">
          <DealBoardSnapshotCard
            stageCounts={dealStageCounts}
            isLoading={isLoading}
          />
          <NotificationsCard
            notifications={notifications}
            isLoading={isLoading}
          />
        </section>

        {/* Partner portfolio (ecosystem partners only) */}
        {isEcosystemPartner && <PartnerPortfolioCard />}
      </div>
    </div>
  );
}

function ProfileStrengthRing({ percent }: { percent: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="relative flex shrink-0 items-center justify-center" title={`Profile ${percent}% complete`}>
      <svg width={48} height={48} className="-rotate-90">
        <defs>
          <linearGradient id="miniRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
        <circle cx={24} cy={24} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={4} />
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke="url(#miniRingGrad)"
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-(--color-ink)">{percent}%</span>
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
