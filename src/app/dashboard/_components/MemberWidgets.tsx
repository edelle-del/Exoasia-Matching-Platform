"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
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
    <section className="flex flex-col gap-6 rounded-3xl bg-white p-8 shadow-md sm:flex-row sm:items-center sm:justify-between">
      {/* Left — greeting */}
      <div>
        <p className="text-sm font-medium text-gray-400">{greeting}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight text-gray-900">
          {name || "there"} <span className="text-[#1a2744]">👋</span>
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isVerified
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isVerified ? "bg-emerald-500" : "bg-amber-400"
              }`}
            />
            {badgeLabel}
          </span>
          <span className="text-xs text-gray-400">
            Verification: {verificationStatus ?? "unverified"}
          </span>
        </div>
      </div>

      {/* Right — Next Step nudge */}
      {nextStep && (
        <div className="flex shrink-0 items-start gap-3 rounded-2xl bg-[#F7F3FF] px-5 py-4 sm:max-w-xs">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1a2744]/10">
            <ArrowRight className="h-4 w-4 text-[#1a2744]" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1a2744]/70">
              Next step
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-700">{nextStep}</p>
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
    <div className="flex flex-col items-center justify-center gap-1 rounded-3xl bg-white py-8 shadow-md text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`text-5xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
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
    <div className="flex flex-col items-center gap-5 rounded-3xl bg-white p-6 shadow-md">
      <p className="self-start text-xs font-semibold uppercase tracking-widest text-gray-400">
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
            stroke="#F3F4F6"
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
          <span className="text-3xl font-bold text-gray-900">{percent}%</span>
          <span className="text-[11px] font-medium text-gray-400">complete</span>
        </div>
      </div>

      {nextStep && (
        <p className="text-center text-xs text-gray-500">
          <span className="font-semibold text-gray-700">Tip: </span>
          {nextStep}
        </p>
      )}
    </div>
  );
}

// ─── MatchFactorsChart ───────────────────────────────────────────────────────

type FitDatum = { subject: string; value: number; fullMark: number };

type MatchFactorsChartProps = {
  fitData: FitDatum[];
};

export function MatchFactorsChart({ fitData }: MatchFactorsChartProps) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Match quality
      </p>
      <p className="mt-1 text-sm text-gray-500">
        How your profile maps to current matches
      </p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={fitData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#F3F4F6" radialLines={false} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
            />
            <Radar
              dataKey="value"
              stroke="#1a2744"
              fill="#1a2744"
              fillOpacity={0.08}
              strokeWidth={1.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
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
    <div className="rounded-3xl bg-white px-4 py-3 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Peer benchmark
      </p>
      <p className="text-[11px] text-gray-400">
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
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              contentStyle={{
                border: "none",
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
                fontSize: 12,
              }}
              formatter={(v) => [typeof v === "number" ? v : 0, label]}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.name === "You" ? "#1a2744" : "#E5E7EB"}
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
    <div className="rounded-3xl bg-white p-6 shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        Activity
      </p>
      <ul className="mt-5 space-y-0">
        {shown.length === 0 && (
          <li className="text-sm text-gray-400">No recent activity.</li>
        )}
        {shown.map((event, i) => {
          const { color, Icon } = DOT_MAP[event.type];
          const isLast = i === shown.length - 1;
          return (
            <li key={event.id} className="relative flex gap-4">
              {/* vertical connector */}
              {!isLast && (
                <span className="absolute left-[9px] top-5 h-full w-px bg-gray-100" />
              )}
              {/* dot */}
              <span className={`mt-1 h-[18px] w-[18px] shrink-0 rounded-full ${color} flex items-center justify-center`}>
                <Icon className={`h-2.5 w-2.5 text-white`} />
              </span>
              <div className="pb-5 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-snug">{event.label}</p>
                {event.subtext && (
                  <p className="text-xs text-gray-400">{event.subtext}</p>
                )}
                <p className="mt-0.5 text-[11px] text-gray-300">{event.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
