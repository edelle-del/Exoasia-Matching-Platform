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
    <section className="rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

        {/* Left: greeting + status */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
            Advisor Console
          </p>
          <h1 className="mt-1 text-balance text-4xl font-bold tracking-tight text-(--color-ink)">
            Hello,{" "}
            <span className="text-(--color-primary)">{displayName || "there"}</span>
          </h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            Managing as{" "}
            <span className="font-medium text-(--color-body)">
              {role === "admin" ? "Admin" : "Advisor"}
            </span>
          </p>
          {urgentCount > 0 && (
            <div className="mt-3 flex w-fit items-center gap-2 rounded-xl bg-rose-500/15 px-4 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-muted)" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a company or match..."
            aria-label="Search companies and matches"
            className="w-full rounded-xl border border-(--color-hairline) bg-(--color-surface-strong) py-3 pl-9 pr-4 text-sm text-(--color-ink) placeholder:text-(--color-muted) transition focus:border-(--color-primary) focus:outline-none"
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
  accent = "text-(--color-ink)",
  sub,
  sparkData,
  sparkColor = "#ff6b1f",
}: AdvisorMetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">
        {label}
      </p>
      <p className={`font-mono text-4xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-(--color-muted)">{sub}</p>}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-1 h-10" aria-hidden="true">
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
  "0": { label: "High Priority",   labelColor: "text-rose-400",    labelBg: "bg-rose-500/20"    },
  "1": { label: "Medium Priority", labelColor: "text-amber-400",   labelBg: "bg-amber-500/20"   },
};

function getPriority(stage: string | null) {
  return (
    STAGE_PRIORITY[stage ?? ""] ?? {
      label:      "Standard",
      labelColor: "text-[#ff6b1f]",
      labelBg:    "bg-[#ff6b1f]/20",
    }
  );
}

export function UrgencyQueuePanel({ companies, isLoading }: UrgencyQueuePanelProps) {
  return (
    <div className="flex h-[480px] flex-col rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-(--color-ink)">Urgency queue</p>
          <p className="mt-0.5 text-xs text-(--color-muted)">Companies without match records</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20" aria-hidden="true">
          <AlertTriangle className="h-4 w-4 text-rose-400" />
        </span>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1" aria-live="polite">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-(--color-muted)">Loading...</p>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-(--color-hairline) py-10">
            <CheckCircle className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            <p className="text-sm font-medium text-(--color-muted)">
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
                className="flex items-center gap-3 rounded-2xl border border-(--color-hairline) bg-(--color-surface-strong) p-4 transition hover:border-(--color-border-strong)"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-hairline)">
                  <Building2 className="h-4 w-4 text-(--color-muted)" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-(--color-ink)">
                    {name}
                  </p>
                  <p className="truncate text-xs text-(--color-muted)">
                    {company.sector || "No sector"} · Stage{" "}
                    {company.stage ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold ${priority.labelBg} ${priority.labelColor}`}
                  >
                    {priority.label}
                  </span>
                  <span className="text-[0.65rem] text-(--color-muted)">
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
  if (score === null) return "bg-(--color-muted-soft)";
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

export function MatchingFunnelPanel({ companies, isLoading }: MatchingFunnelPanelProps) {
  return (
    <div className="flex h-[480px] flex-col rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-(--color-ink)">Matching funnel</p>
          <p className="mt-0.5 text-xs text-(--color-muted)">Active relationships by company</p>
        </div>
        <Link
          href="/advisor/manual-match"
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-(--color-primary) px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#e55919]"
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Manual match
        </Link>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1" aria-live="polite">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-(--color-muted)">Loading...</p>
        ) : companies.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-(--color-hairline) py-10">
            <p className="text-sm text-(--color-muted)">No active match relationships yet.</p>
          </div>
        ) : (
          companies.map((company) => {
            const name = company.business_name || company.full_name || "Unnamed";
            return (
              <div
                key={company.id}
                className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-strong) p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff6b1f]/20">
                    <Building2 className="h-4 w-4 text-(--color-primary)" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-(--color-ink)">
                      {name}
                    </p>
                    <p className="text-xs text-(--color-muted)">
                      {company.sector || "No sector"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.matches.map((match) => (
                    <Link
                      key={match.matchId}
                      href={`/advisor/manual-match/${match.matchId}`}
                      className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-medium transition hover:opacity-80 ${
                        match.status === "accepted"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-(--color-hairline) text-(--color-muted)"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${fitDotClass(match.fitScore)}`}
                      />
                      {match.counterpartName}
                      {typeof match.fitScore === "number" && (
                        <span className="ml-0.5 text-(--color-muted)">
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
  "#ff6b1f", "#10B981", "#F59E0B",
  "#EF4444", "#ff2e93", "#06B6D4", "#F97316",
];

const PIE_DOT_CLASSES = [
  "bg-[#ff6b1f]",
  "bg-emerald-500",
  "bg-amber-400",
  "bg-red-500",
  "bg-[#ff2e93]",
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
    <div className="flex h-[480px] flex-col rounded-3xl bg-(--color-surface-soft) border border-(--color-hairline) p-6">
      <div className="shrink-0">
        <p className="text-sm font-semibold text-(--color-ink)">Sector distribution</p>
        <p className="mt-0.5 text-xs text-(--color-muted)">Member industries at a glance</p>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 flex-1 overflow-y-auto">
        <div className="h-44 w-44 shrink-0" role="img" aria-label={`Sector distribution: ${data.map(d => `${d.name} ${d.value}`).join(", ")}`}>
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
                  background: "var(--color-surface-strong)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  fontSize: 12,
                  color: "var(--color-ink)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="w-full flex flex-col gap-1.5">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PIE_DOT_CLASSES[i % PIE_DOT_CLASSES.length]}`} aria-hidden="true" />
              <span className="text-xs text-(--color-muted) truncate">
                {d.name}
                <span className="ml-1 font-semibold text-(--color-ink)">{d.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
