"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Star, Handshake, CheckCircle2, Bell, ArrowRight, LucideIcon } from "lucide-react";

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

export function HeroSection({ name, stage, verificationStatus, nextStep }: HeroSectionProps) {
  const greeting = getGreeting();
  const isVerified = verificationStatus === "verified";
  const badgeLabel = isVerified ? "Verified Founder" : `Stage ${stage ?? "0"} Member`;

  return (
    <section className="flex flex-col gap-6 rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-8 sm:flex-row sm:items-center sm:justify-between">
      {/* Left — greeting */}
      <div>
        <p className="text-sm font-medium text-[#8B8BA7]">{greeting}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#F4F4FF]">
          {name || "there"} 👋
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
          <span className="text-xs text-[#8B8BA7]">
            Verification: {verificationStatus ?? "unverified"}
          </span>
        </div>
      </div>

      {/* Right — Next Step nudge */}
      {nextStep && (
        <div className="flex shrink-0 items-start gap-3 rounded-2xl bg-[#1A1A26] border border-[#2A2A3E] px-5 py-4 sm:max-w-xs">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
            <ArrowRight className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B8BA7]">
              Next step
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#C4C4D4]">{nextStep}</p>
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
  accent: string;  // Tailwind text color class
  sub?: string;
};

export function AirbnbMetricCard({ label, value, accent, sub }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-[#12121A] border border-[#2A2A3E] py-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">{label}</p>
      <p className={`text-5xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-[#8B8BA7]">{sub}</p>}
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
    <div className="flex flex-col items-center gap-5 rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <p className="self-start text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
        Profile strength
      </p>

      <div className="relative flex items-center justify-center">
        <svg width={140} height={140} className="-rotate-90">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#FB7185" />
              <stop offset="100%" stopColor="#FB923C" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={70} cy={70} r={r}
            fill="none"
            stroke="#2A2A3E"
            strokeWidth={12}
          />
          {/* Progress */}
          <circle
            cx={70} cy={70} r={r}
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
          <span className="text-3xl font-bold text-[#F4F4FF]">{percent}%</span>
          <span className="text-[11px] font-medium text-[#8B8BA7]">complete</span>
        </div>
      </div>

      {nextStep && (
        <p className="text-center text-xs text-[#8B8BA7]">
          <span className="font-semibold text-[#C4C4D4]">Tip: </span>
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
  const fitColor = bestFit >= 80 ? "text-emerald-400" : bestFit >= 65 ? "text-indigo-400" : "text-amber-400";

  return (
    <div className="flex flex-col rounded-[20px] border border-[#2A2A3E] bg-[#12121A] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Project pipeline</p>
          <p className="mt-1 text-sm font-semibold text-[#F4F4FF]">
            {isInvestor ? "Your matched opportunities" : "Your active projects"}
          </p>
        </div>
        <Link href="/matches" className="text-xs font-semibold text-indigo-400 hover:underline">
          Next steps →
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 text-center">
          <p className={`text-3xl font-extrabold ${!isLoading && activeProjects > 0 ? "text-indigo-400" : "text-[#4A4A6A]"}`}>
            {isLoading ? "…" : activeProjects > 0 ? activeProjects : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
            {isInvestor ? "Opportunities" : "Projects"}
          </p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 text-center">
          <p className={`text-3xl font-extrabold ${!isLoading && investorMatches > 0 ? "text-violet-400" : "text-[#4A4A6A]"}`}>
            {isLoading ? "…" : investorMatches > 0 ? investorMatches : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
            {isInvestor ? "Score cards" : "Inv. matches"}
          </p>
        </div>
        <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 text-center">
          <p className={`text-3xl font-extrabold ${isLoading || bestFit === 0 ? "text-[#4A4A6A]" : fitColor}`}>
            {isLoading ? "…" : bestFit > 0 ? `${bestFit}%` : "—"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Best fit</p>
        </div>
      </div>

      {/* Bottom CTA — always links to /matches for per-project next steps */}
      <Link
        href="/matches"
        className="mt-auto flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 transition-colors hover:border-indigo-500/50"
      >
        <p className="text-xs font-medium text-indigo-300">
          {isLoading
            ? "Loading…"
            : activeProjects > 0
              ? `View next steps for your ${isInvestor ? "opportunities" : "projects"}`
              : "Set up your first project to get matched"}
        </p>
        <svg className="h-4 w-4 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── PartnerPortfolioCard ────────────────────────────────────────────────────

export function PartnerPortfolioCard() {
  return (
    <div className="flex flex-col rounded-[20px] border border-[#2A2A3E] bg-[#12121A] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Portfolio</p>
          <p className="mt-1 text-sm font-semibold text-[#F4F4FF]">Your portfolio command center</p>
        </div>
        <Link href="/ecosystem" className="text-xs font-semibold text-violet-400 hover:underline">
          Open →
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/ecosystem"
          className="flex flex-col gap-1.5 rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 transition hover:border-violet-500/40"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
            <svg className="h-3.5 w-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-xs font-bold text-[#F4F4FF]">Portfolio overview</p>
          <p className="text-[10px] text-[#8B8BA7]">Stats, company feed, deep-dive</p>
        </Link>

        <Link
          href="/ecosystem"
          className="flex flex-col gap-1.5 rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 transition hover:border-indigo-500/40"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20">
            <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </div>
          <p className="text-xs font-bold text-[#F4F4FF]">Co-Pilot Kanban</p>
          <p className="text-[10px] text-[#8B8BA7]">Live intro statuses, stale alerts</p>
        </Link>
      </div>

      <Link
        href="/ecosystem"
        className="mt-auto flex items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 transition-colors hover:border-violet-500/50"
      >
        <p className="text-xs font-medium text-violet-300">
          Nominate a startup or track your pipeline
        </p>
        <svg className="h-4 w-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── BenchmarkingChart ───────────────────────────────────────────────────────

type BenchmarkDatum = { name: string; value: number };

type BenchmarkingChartProps = {
  data: BenchmarkDatum[];
  label?: string;
};

export function BenchmarkingChart({ data, label = "Active deals" }: BenchmarkingChartProps) {
  return (
    <div className="rounded-[16px] bg-[#12121A] border border-[#2A2A3E] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
        Peer benchmark
      </p>
      <p className="text-[11px] text-[#8B8BA7]">
        Your {label.toLowerCase()} vs. sector avg
      </p>
      <div className="mt-2 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            barSize={10}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 12, fill: "#8B8BA7" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              contentStyle={{
                background: "#1A1A26",
                border: "1px solid #2A2A3E",
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                fontSize: 12,
                color: "#F4F4FF",
              }}
              formatter={(v) => [typeof v === "number" ? v : 0, label]}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.name === "You" ? "#6366F1" : "#2A2A3E"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
  match:   { color: "bg-indigo-500",  Icon: Star         },
  deal:    { color: "bg-emerald-500", Icon: Handshake    },
  intro:   { color: "bg-purple-500",  Icon: CheckCircle2 },
  general: { color: "bg-gray-300",    Icon: Bell         },
};

export function ActivityFeed({ events }: ActivityFeedProps) {
  const shown = events.slice(0, 4);

  return (
    <div className="rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
        Activity
      </p>
      <ul className="mt-5 space-y-0">
        {shown.length === 0 && (
          <li className="text-sm text-[#8B8BA7]">No recent activity.</li>
        )}
        {shown.map((event, i) => {
          const { color, Icon } = DOT_MAP[event.type];
          const isLast = i === shown.length - 1;
          return (
            <li key={event.id} className="relative flex gap-4">
              {/* vertical connector */}
              {!isLast && (
                <span className="absolute left-[9px] top-5 h-full w-px bg-[#2A2A3E]" />
              )}
              {/* dot */}
              <span className={`mt-1 h-[18px] w-[18px] shrink-0 rounded-full ${color} flex items-center justify-center`}>
                <Icon className="h-2.5 w-2.5 text-white" />
              </span>
              <div className="pb-5 min-w-0">
                <p className="text-sm font-medium text-[#F4F4FF] leading-snug">{event.label}</p>
                {event.subtext && (
                  <p className="text-xs text-[#8B8BA7]">{event.subtext}</p>
                )}
                <p className="mt-0.5 text-[11px] text-[#4A4A6A]">{event.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
