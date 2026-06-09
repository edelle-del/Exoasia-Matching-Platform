"use client";

import Link from "next/link";
import { Star, Handshake, CheckCircle2, Bell, LucideIcon } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── HeroSection ─────────────────────────────────────────────────────────────

type HeroSectionProps = {
  name: string;
  stage: string | null;
  verificationStatus: string | null;
  nextStep?: string;
};

export function HeroSection({
  name,
  stage,
  verificationStatus,
  nextStep,
}: HeroSectionProps) {
  const greeting = getGreeting();
  const isVerified = verificationStatus === "verified";
  const badgeLabel = isVerified
    ? "Verified Founder"
    : `Stage ${stage ?? "0"} Member`;

  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-8 sm:flex-row sm:items-center sm:justify-between">
      {/* Left — greeting */}
      <div>
        <p className="text-sm font-medium text-(--color-muted)">{greeting}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">
          {name || "there"}{" "}
          <i
            className="ri-hand-line text-3xl align-middle text-(--color-primary)"
            aria-hidden="true"
          />
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isVerified
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isVerified ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
            {badgeLabel}
          </span>
          <span className="text-xs text-(--color-muted)">
            Verification: {verificationStatus ?? "unverified"}
          </span>
        </div>
      </div>

      {/* Right — Next Step nudge */}
      {nextStep && (
        <div className="flex shrink-0 items-start gap-3 rounded-2xl bg-(--color-surface-strong) border border-(--color-hairline) px-5 py-4 sm:max-w-xs">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff6b1f]/20">
            <i
              className="ri-arrow-right-line text-sm text-(--color-primary)"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-(--color-muted)">
              Next step
            </p>
            <p className="mt-0.5 text-sm font-medium text-(--color-body)">
              {nextStep}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

type MetricCardProps = {
  label: string;
  value: string;
  accent: string; // Tailwind text color class
  sub?: string;
};

export function AirbnbMetricCard({
  label,
  value,
  accent,
  sub,
}: MetricCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) py-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">
        {label}
      </p>
      <p className={`text-5xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-(--color-muted)">{sub}</p>}
    </div>
  );
}

// ─── ProfileStrength ─────────────────────────────────────────────────────────

type ProfileStrengthProps = {
  percent: number;
  nextStep?: string;
};

export function ProfileStrength({ percent, nextStep }: ProfileStrengthProps) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <p className="self-start text-sm font-semibold text-(--color-ink)">Profile strength</p>

      <div className="relative flex items-center justify-center">
        <svg width={140} height={140} className="-rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff6b1f" />
              <stop offset="100%" stopColor="#ff2e93" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={70}
            cy={70}
            r={r}
            fill="none"
            stroke="var(--color-hairline)"
            strokeWidth={12}
          />
          {/* Progress */}
          <circle
            cx={70}
            cy={70}
            r={r}
            fill="none"
            stroke="url(#ringGradient)"
            strokeWidth={12}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="ring-progress"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-bold text-(--color-ink)">{percent}%</span>
          <span className="text-[11px] font-medium text-(--color-muted)">
            complete
          </span>
        </div>
      </div>

      {nextStep && (
        <p className="text-center text-xs text-(--color-muted)">
          <span className="font-semibold text-(--color-body)">Tip: </span>
          {nextStep}
        </p>
      )}
    </div>
  );
}

// ─── PipelineSummaryCard ─────────────────────────────────────────────────────

type PipelineSummaryCardProps = {
  activeProjects: number;
  investorMatches: number;
  bestFit: number;
  memberRole: string | null;
  isLoading?: boolean;
};

export function PipelineSummaryCard({
  activeProjects,
  investorMatches,
  bestFit,
  memberRole,
  isLoading,
}: PipelineSummaryCardProps) {
  const isInvestor = memberRole === "investor";
  const fitColor =
    bestFit >= 80
      ? "text-emerald-400"
      : bestFit >= 65
        ? "text-(--color-primary)"
        : "text-amber-400";

  return (
    <div className="flex flex-col rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-6">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm font-semibold text-(--color-ink)">
          {isInvestor ? "Matched opportunities" : "Active projects"}
        </p>
        <Link
          href="/matches"
          className="text-xs font-semibold text-(--color-primary) hover:underline"
        >
          Next steps →
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 text-center">
          <p
            className={`text-3xl font-extrabold ${!isLoading && activeProjects > 0 ? "text-(--color-accent-gold)" : "text-(--color-muted-soft)"}`}
          >
            {isLoading ? "…" : activeProjects > 0 ? activeProjects : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
            {isInvestor ? "Opportunities" : "Projects"}
          </p>
        </div>
        <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 text-center">
          <p
            className={`text-3xl font-extrabold ${!isLoading && investorMatches > 0 ? "text-(--color-primary)" : "text-(--color-muted-soft)"}`}
          >
            {isLoading ? "…" : investorMatches > 0 ? investorMatches : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
            {isInvestor ? "Score cards" : "Inv. matches"}
          </p>
        </div>
        <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 text-center">
          <p
            className={`text-3xl font-extrabold ${isLoading || bestFit === 0 ? "text-(--color-muted-soft)" : fitColor}`}
          >
            {isLoading ? "…" : bestFit > 0 ? `${bestFit}%` : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
            Best fit
          </p>
        </div>
      </div>

      {/* Bottom CTA — always links to /matches for per-project next steps */}
      <Link
        href="/matches"
        className="mt-auto flex items-center justify-between rounded-xl border border-[#ff6b1f]/30 bg-[#ff6b1f]/10 px-4 py-3 transition-colors hover:border-[#ff6b1f]/50"
      >
        <p className="text-xs font-medium text-[#ffa04f]">
          {isLoading
            ? "Loading…"
            : activeProjects > 0
              ? `View next steps for your ${isInvestor ? "opportunities" : "projects"}`
              : "Set up your first project to get matched"}
        </p>
        <svg
          className="h-4 w-4 shrink-0 text-(--color-primary)"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── PartnerPortfolioCard ────────────────────────────────────────────────────

export function PartnerPortfolioCard() {
  return (
    <div className="flex flex-col rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-6">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm font-semibold text-(--color-ink)">Deal flow</p>
        <Link
          href="/ecosystem"
          className="text-xs font-semibold text-(--color-primary) hover:underline"
        >
          Ecosystem →
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/ecosystem"
          className="flex flex-col gap-1.5 rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 transition hover:border-[#ff6b1f]/40"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff6b1f]/20">
            <svg
              className="h-3.5 w-3.5 text-(--color-primary)"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-xs font-bold text-(--color-ink)">Deal flow overview</p>
          <p className="text-[10px] text-(--color-muted)">
            Pipeline stats, companies, deep-dive
          </p>
        </Link>

        <Link
          href="/ecosystem"
          className="flex flex-col gap-1.5 rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 transition hover:border-[#c9a040]/40"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c9a040]/20">
            <svg
              className="h-3.5 w-3.5 text-(--color-accent-gold)"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
          </div>
          <p className="text-xs font-bold text-(--color-ink)">Deal Board</p>
          <p className="text-[10px] text-(--color-muted)">
            Live intro statuses, stale alerts
          </p>
        </Link>
      </div>

      <Link
        href="/ecosystem"
        className="mt-auto flex items-center justify-between rounded-xl border border-[#ff6b1f]/30 bg-[#ff6b1f]/10 px-4 py-3 transition-colors hover:border-[#ff6b1f]/50"
      >
        <p className="text-xs font-medium text-[#ffa04f]">
          Invite startups to the platform · Track mandate-matched deal flow
        </p>
        <svg
          className="h-4 w-4 shrink-0 text-(--color-primary)"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── PartnerDealOverviewCard ─────────────────────────────────────────────────

const PIPELINE_STAGES_CONFIG: { label: string; shortLabel: string; fill: string; textClass: string }[] = [
  { label: "Qualified",       shortLabel: "Qualified",   fill: "#ff6b1f",  textClass: "text-[#ff6b1f]" },
  { label: "Intro & Scoping", shortLabel: "Intro",       fill: "#c9a040",  textClass: "text-[#c9a040]" },
  { label: "Proposal",        shortLabel: "Proposal",    fill: "#ff2e93",  textClass: "text-[#ff2e93]" },
  { label: "Negotiation",     shortLabel: "Negotiation", fill: "#fbbf24",  textClass: "text-amber-400" },
  { label: "Closed Won",      shortLabel: "Won",         fill: "#34d399",  textClass: "text-emerald-400" },
  { label: "On Hold",         shortLabel: "On Hold",     fill: "#64748b",  textClass: "text-slate-400" },
];

type PartnerDealOverviewCardProps = {
  totalCollabs: number;
  totalProjects: number;
  activeMatches: number;
  introCount: number;
  staleCount: number;
  stageCounts: Record<string, number>;
  isLoading?: boolean;
};

export function PartnerDealOverviewCard({
  totalCollabs,
  totalProjects,
  activeMatches,
  introCount,
  staleCount,
  stageCounts,
  isLoading,
}: PartnerDealOverviewCardProps) {
  const kpis = [
    { label: "Collabs",  value: totalCollabs,  color: "text-(--color-primary)" },
    { label: "Projects", value: totalProjects, color: "text-(--color-accent-gold)" },
    { label: "Intros",   value: introCount,    color: "text-(--color-hot-pink)" },
    { label: "Active",   value: activeMatches, color: "text-emerald-400" },
    { label: "Stale",    value: staleCount,    color: staleCount > 0 ? "text-amber-400" : "text-(--color-muted)" },
  ];

  const pipelineTotal = PIPELINE_STAGES_CONFIG.reduce(
    (sum, s) => sum + (stageCounts[s.label] ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft)">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-(--color-hairline) px-6 py-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Portfolio Activity</p>
          <p className="mt-0.5 text-lg font-semibold text-(--color-ink)">Pipeline Overview</p>
        </div>
        <Link
          href="/ecosystem"
          className="inline-flex items-center gap-1.5 rounded-xl bg-(--color-primary)/10 px-3 py-2 text-xs font-semibold text-(--color-primary) transition hover:bg-(--color-primary)/20"
        >
          Ecosystem
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 divide-x divide-(--color-hairline) border-b border-(--color-hairline)">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-3 py-4">
            <p className={`font-mono text-2xl font-extrabold tabular-nums ${isLoading ? "text-(--color-muted)" : color}`}>
              {isLoading ? "…" : value > 0 ? value : "—"}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">{label}</p>
          </div>
        ))}
      </div>

      {/* Stage pipeline bars */}
      <div className="px-6 py-5">
        <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Stage breakdown</p>
        <div className="space-y-3">
          {PIPELINE_STAGES_CONFIG.map((s) => {
            const count = stageCounts[s.label] ?? 0;
            const pct = pipelineTotal > 0 ? Math.max((count / pipelineTotal) * 100, count > 0 ? 2 : 0) : 0;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-(--color-muted)">{s.shortLabel}</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-surface-strong)">
                  {!isLoading && pct > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: s.fill }}
                    />
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 animate-pulse rounded-full bg-(--color-surface-strong)" />
                  )}
                </div>
                <span className={`w-6 text-right font-mono text-xs font-bold tabular-nums ${count > 0 && !isLoading ? s.textClass : "text-(--color-muted)"}`}>
                  {isLoading ? "…" : count || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── DealBoardSnapshotCard ───────────────────────────────────────────────────

const DEAL_STAGES: { label: string; shortLabel: string; fill: string }[] = [
  { label: "Qualified",       shortLabel: "Qualified",   fill: "#ff6b1f" },
  { label: "Intro & Scoping", shortLabel: "Intro",       fill: "#c9a040" },
  { label: "Proposal",        shortLabel: "Proposal",    fill: "#ff2e93" },
  { label: "Negotiation",     shortLabel: "Negotiation", fill: "#FBBF24" },
  { label: "Closed Won",      shortLabel: "Closed Won",  fill: "#34D399" },
  { label: "On Hold",         shortLabel: "On Hold",     fill: "#94A3B8" },
];

// Chart geometry constants
const VW = 600;
const CHART_H = 130;
const TOP_PAD = 26;   // space above bars for count labels
const BOT_PAD = 34;   // space below baseline for stage labels
const VH = TOP_PAD + CHART_H + BOT_PAD; // 190
const SLOT_W = VW / DEAL_STAGES.length; // 100
const BAR_W = 52;
const BAR_R = 4;

type DealBoardSnapshotCardProps = {
  stageCounts: Record<string, number>;
  isLoading?: boolean;
};

export function DealBoardSnapshotCard({
  stageCounts,
  isLoading,
}: DealBoardSnapshotCardProps) {
  const maxCount = Math.max(
    ...DEAL_STAGES.map((s) => stageCounts[s.label] ?? 0),
    1,
  );

  const baselineY = TOP_PAD + CHART_H;

  return (
    <div className="flex flex-col rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-(--color-ink)">Projects by stage</p>
        <Link
          href="/deal-board"
          className="inline-flex min-h-[44px] items-center text-xs font-semibold text-(--color-primary) hover:underline"
        >
          Deal board →
        </Link>
      </div>

      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:overflow-visible sm:px-0">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full min-w-[480px]"
        role="img"
        focusable="false"
        aria-label="Deal stage distribution bar chart"
      >
        {/* Horizontal grid lines at 25 / 50 / 75 / 100 % */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = TOP_PAD + CHART_H * (1 - frac);
          return (
            <line
              key={frac}
              x1={0}
              y1={y}
              x2={VW}
              y2={y}
              stroke="var(--color-hairline)"
              strokeWidth={1}
            />
          );
        })}

        {/* Baseline */}
        <line
          x1={0}
          y1={baselineY}
          x2={VW}
          y2={baselineY}
          stroke="var(--color-hairline)"
          strokeWidth={1.5}
        />

        {/* Bars + labels */}
        {DEAL_STAGES.map((s, i) => {
          const count = stageCounts[s.label] ?? 0;
          const barH = isLoading ? 0 : (count / maxCount) * CHART_H;
          const barX = i * SLOT_W + (SLOT_W - BAR_W) / 2;
          const barY = baselineY - barH;
          const cx = i * SLOT_W + SLOT_W / 2;

          return (
            <g key={s.label}>
              {/* Bar */}
              {barH > 0 && (
                <rect
                  x={barX}
                  y={barY}
                  width={BAR_W}
                  height={barH}
                  rx={BAR_R}
                  fill={s.fill}
                  opacity={0.88}
                >
                  <title>
                    {s.label}: {count} project{count !== 1 ? "s" : ""}
                  </title>
                </rect>
              )}

              {/* Count above bar (or at baseline if zero) */}
              <text
                x={cx}
                y={barH > 0 ? barY - 6 : baselineY - 6}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fontFamily="'JetBrains Mono', monospace"
                fill={barH > 0 ? "var(--color-ink)" : "var(--color-muted)"}
              >
                {isLoading ? "" : count}
              </text>

              {/* Stage label below baseline */}
              <text
                x={cx}
                y={baselineY + 20}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="var(--color-muted)"
              >
                {s.shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
    </div>
  );
}

// ─── NotificationsCard ───────────────────────────────────────────────────────

export type NotificationItem = {
  id: string;
  kind: "match" | "invite" | "member" | "request";
  type: "match" | "accepted" | "intro" | "declined";
  title: string;
  body: string;
  href: string;
  date: string;
};

const NOTIF_DOT: Record<NotificationItem["type"], string> = {
  match:    "bg-[#ff6b1f]",
  accepted: "bg-emerald-500",
  intro:    "bg-[#ff2e93]",
  declined: "bg-rose-500",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type NotificationsCardProps = {
  notifications: NotificationItem[];
  isLoading?: boolean;
};

export function NotificationsCard({ notifications, isLoading }: NotificationsCardProps) {
  const shown = notifications.slice(0, 3);

  return (
    <div className="flex flex-col rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-(--color-ink)">Recent activity</p>
        <Link
          href="/notifications"
          className="inline-flex min-h-[44px] items-center text-xs font-semibold text-(--color-primary) hover:underline"
        >
          All notifications →
        </Link>
      </div>

      <div className="flex-1" aria-live="polite">
      {isLoading ? (
        <p className="text-sm text-(--color-muted)">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-(--color-muted)">No notifications yet.</p>
      ) : (
        <ul className="space-y-0">
          {shown.map((n, i) => {
            const dot = NOTIF_DOT[n.type] ?? "bg-[#ff6b1f]";
            const isLast = i === shown.length - 1;
            return (
              <li key={n.id} className="relative flex gap-3">
                {!isLast && (
                  <span className="absolute left-[8px] top-5 h-full w-px bg-(--color-hairline)" aria-hidden="true" />
                )}
                <span
                  className={`mt-1 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full ${dot}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 pb-4">
                  <p className="text-sm font-medium leading-snug text-(--color-ink)">
                    {n.title}
                  </p>
                  <p className="truncate text-xs text-(--color-muted)">{n.body}</p>
                  <p className="mt-0.5 text-[0.65rem] text-(--color-muted)">
                    {relativeTime(n.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
    </div>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

type ActivityEvent = {
  id: string;
  label: string;
  subtext?: string;
  time: string;
  type: "match" | "deal" | "intro" | "general";
};

type ActivityFeedProps = {
  events: ActivityEvent[];
};

const DOT_MAP: Record<
  ActivityEvent["type"],
  { color: string; Icon: LucideIcon }
> = {
  match:   { color: "bg-[#ff6b1f]",   Icon: Star },
  deal:    { color: "bg-emerald-500",  Icon: Handshake },
  intro:   { color: "bg-[#ff2e93]",   Icon: CheckCircle2 },
  general: { color: "bg-(--color-muted)",  Icon: Bell },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  const shown = events.slice(0, 4);

  return (
    <div className="rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <p className="text-sm font-semibold text-(--color-ink)">Activity</p>
      <ul className="mt-5 space-y-0">
        {shown.length === 0 && (
          <li className="text-sm text-(--color-muted)">No recent activity.</li>
        )}
        {shown.map((event, i) => {
          const { color, Icon } = DOT_MAP[event.type];
          const isLast = i === shown.length - 1;
          return (
            <li key={event.id} className="relative flex gap-4">
              {/* vertical connector */}
              {!isLast && (
                <span className="absolute left-[9px] top-5 h-full w-px bg-(--color-hairline)" aria-hidden="true" />
              )}
              {/* dot */}
              <span
                className={`mt-1 h-[18px] w-[18px] shrink-0 rounded-full ${color} flex items-center justify-center`}
                aria-hidden="true"
              >
                <Icon className="h-2.5 w-2.5 text-white" />
              </span>
              <div className="pb-5 min-w-0">
                <p className="text-sm font-medium text-(--color-ink) leading-snug">
                  {event.label}
                </p>
                {event.subtext && (
                  <p className="text-xs text-(--color-muted)">{event.subtext}</p>
                )}
                <p className="mt-0.5 text-[11px] text-(--color-muted-soft)">
                  {event.time}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
