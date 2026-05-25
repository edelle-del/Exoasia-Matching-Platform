"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  Building2,
  Zap,
} from "lucide-react";
import type { AdvisorCompanyRecord, AdvisorMatchRecord } from "@/lib/app-data";

// ─── Shared types ─────────────────────────────────────────────────────────────

type MatchChip = {
  matchId: string;
  counterpartId: string;
  counterpartName: string;
  status: AdvisorMatchRecord["status"];
  fitScore: number | null;
};

export type CompanyWithMatches = AdvisorCompanyRecord & { matches: MatchChip[] };

// ─── SystemPulseHeader ────────────────────────────────────────────────────────

type SystemPulseHeaderProps = {
  displayName: string;
  role: string | null;
  urgentCount: number;
};

export function SystemPulseHeader({ displayName, role, urgentCount }: SystemPulseHeaderProps) {
  const [query, setQuery] = useState("");

  return (
    <section className="rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

        {/* Left: greeting + status */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
            Advisor Console
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#F4F4FF]">
            Hello,{" "}
            <span className="text-indigo-400">{displayName || "there"}</span>
          </h1>
          <p className="mt-1 text-sm text-[#8B8BA7]">
            Managing as{" "}
            <span className="font-medium text-[#C4C4D4]">
              {role === "admin" ? "Admin" : "Advisor"}
            </span>
          </p>
          {urgentCount > 0 && (
            <div className="mt-3 flex w-fit items-center gap-2 rounded-xl bg-rose-500/15 px-4 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-sm font-medium text-rose-400">
                {urgentCount}{" "}
                {urgentCount === 1 ? "company requires" : "companies require"}{" "}
                manual intervention
              </p>
            </div>
          )}
        </div>

        {/* Right: search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B8BA7]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a company or match..."
            className="w-full rounded-xl border border-[#2A2A3E] bg-[#1A1A26] py-3 pl-9 pr-4 text-sm text-[#F4F4FF] placeholder:text-[#8B8BA7] transition focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </section>
  );
}

// ─── AdvisorMetricCard ────────────────────────────────────────────────────────

type SparkDatum = { value: number };

type AdvisorMetricCardProps = {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  sparkData?: SparkDatum[];
  sparkColor?: string;
};

export function AdvisorMetricCard({
  label,
  value,
  accent = "text-[#F4F4FF]",
  sub,
  sparkData,
  sparkColor = "#6366F1",
}: AdvisorMetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
        {label}
      </p>
      <p className={`text-4xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-[#8B8BA7]">{sub}</p>}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-1 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── UrgencyQueuePanel ────────────────────────────────────────────────────────

type UrgencyQueuePanelProps = {
  companies: AdvisorCompanyRecord[];
  isLoading: boolean;
};

const STAGE_PRIORITY: Record<string, { label: string; labelColor: string; labelBg: string }> = {
  "0": { label: "High Priority",   labelColor: "text-rose-400",   labelBg: "bg-rose-500/20"   },
  "1": { label: "Medium Priority", labelColor: "text-amber-400",  labelBg: "bg-amber-500/20"  },
};

function getPriority(stage: string | null) {
  return (
    STAGE_PRIORITY[stage ?? ""] ?? {
      label:      "Standard",
      labelColor: "text-indigo-400",
      labelBg:    "bg-indigo-500/20",
    }
  );
}

export function UrgencyQueuePanel({ companies, isLoading }: UrgencyQueuePanelProps) {
  return (
    <div className="flex h-[480px] flex-col rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
            Urgency Queue
          </p>
          <p className="mt-0.5 text-sm text-[#8B8BA7]">
            Companies without any match records
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
        </span>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-[#8B8BA7]">Loading...</p>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#2A2A3E] py-10">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
            <p className="text-sm font-medium text-[#8B8BA7]">
              All companies have matches
            </p>
          </div>
        ) : (
          companies.map((company) => {
            const priority = getPriority(company.stage);
            const name = company.business_name || company.full_name || "Unnamed";
            return (
              <div
                key={company.id}
                className="flex items-center gap-3 rounded-2xl border border-[#2A2A3E] bg-[#1A1A26] p-4 transition hover:border-[#3A3A5E]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2A3E]">
                  <Building2 className="h-4 w-4 text-[#8B8BA7]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#F4F4FF]">
                    {name}
                  </p>
                  <p className="truncate text-xs text-[#8B8BA7]">
                    {company.sector || "No sector"} · Stage{" "}
                    {company.stage ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priority.labelBg} ${priority.labelColor}`}
                  >
                    {priority.label}
                  </span>
                  <span className="text-[11px] text-[#8B8BA7]">
                    {company.verification_status ?? "unverified"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── MatchingFunnelPanel ──────────────────────────────────────────────────────

type MatchingFunnelPanelProps = {
  companies: CompanyWithMatches[];
  isLoading: boolean;
};

function fitDotClass(score: number | null) {
  if (score === null) return "bg-[#4A4A6A]";
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

export function MatchingFunnelPanel({ companies, isLoading }: MatchingFunnelPanelProps) {
  return (
    <div className="flex h-[480px] flex-col rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
            Matching Funnel
          </p>
          <p className="mt-0.5 text-sm text-[#8B8BA7]">
            Active relationships by company
          </p>
        </div>
        <Link
          href="/advisor/manual-match"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          <Zap className="h-3.5 w-3.5" />
          Manual match
        </Link>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-[#8B8BA7]">Loading...</p>
        ) : companies.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#2A2A3E] py-10">
            <p className="text-sm text-[#8B8BA7]">No active match relationships yet.</p>
          </div>
        ) : (
          companies.map((company) => {
            const name = company.business_name || company.full_name || "Unnamed";
            return (
              <div
                key={company.id}
                className="rounded-2xl border border-[#2A2A3E] bg-[#1A1A26] p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F4F4FF]">
                      {name}
                    </p>
                    <p className="text-xs text-[#8B8BA7]">
                      {company.sector || "No sector"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.matches.map((match) => (
                    <Link
                      key={match.matchId}
                      href={`/advisor/manual-match/${match.matchId}`}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${
                        match.status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-[#2A2A3E] text-[#8B8BA7]"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${fitDotClass(match.fitScore)}`}
                      />
                      {match.counterpartName}
                      {typeof match.fitScore === "number" && (
                        <span className="ml-0.5 text-[#8B8BA7]">
                          · {match.fitScore}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── SectorPieChart ───────────────────────────────────────────────────────────

type SectorPieChartProps = {
  companies: AdvisorCompanyRecord[];
};

const PIE_COLORS = [
  "#6366F1", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#06B6D4", "#F97316",
];

const PIE_DOT_CLASSES = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-400",
  "bg-red-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
];

export function SectorPieChart({ companies }: SectorPieChartProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    companies.forEach((c) => {
      const sector = c.sector || "Unknown";
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [companies]);

  if (data.length === 0) return null;

  return (
    <div className="flex h-[480px] flex-col rounded-3xl bg-[#12121A] border border-[#2A2A3E] p-6">
      <div className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B8BA7]">
          Sector distribution
        </p>
        <p className="mt-0.5 text-sm text-[#8B8BA7]">Member industries at a glance</p>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 flex-1 overflow-y-auto">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1A1A26",
                  border: "1px solid #2A2A3E",
                  borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  fontSize: 12,
                  color: "#F4F4FF",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="w-full flex flex-col gap-1.5">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PIE_DOT_CLASSES[i % PIE_DOT_CLASSES.length]}`} />
              <span className="text-xs text-[#8B8BA7] truncate">
                {d.name}
                <span className="ml-1 font-semibold text-[#F4F4FF]">{d.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
