"use client";

import { useEffect, useRef } from "react";
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

// ─── MatchFactorsChart ───────────────────────────────────────────────────────

type FitDatum = { subject: string; value: number; fullMark: number };

type MatchFactorsChartProps = {
  fitData: FitDatum[];
};

const RADAR_COLORS = ["#6366F1", "#10B981", "#8B5CF6"];

export function MatchFactorsChart({ fitData }: MatchFactorsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axes   = fitData.map((d) => d.subject);
  const values = fitData.map((d) => d.value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE   = 200;
    const cx     = SIZE / 2;
    const cy     = SIZE / 2;
    const R      = SIZE * 0.36;
    const n      = axes.length;
    const LEVELS = 4;

    ctx.clearRect(0, 0, SIZE, SIZE);

    const ang = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
    const pt  = (i: number, r: number) => ({
      x: cx + R * r * Math.cos(ang(i)),
      y: cy + R * r * Math.sin(ang(i)),
    });

    for (let l = 1; l <= LEVELS; l++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pt(i, l / LEVELS);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth   = 1;
      ctx.stroke();
      if (l === LEVELS) { ctx.fillStyle = "rgba(255,255,255,0.015)"; ctx.fill(); }
    }

    for (let i = 0; i < n; i++) {
      const p = pt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.stroke();
    }

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, "rgba(99,102,241,0.42)");
    grad.addColorStop(1, "rgba(99,102,241,0.04)");
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.9)"; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#6366F1"; ctx.fill();
      ctx.strokeStyle = "#12121A"; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.font = "10px system-ui,sans-serif";
    ctx.fillStyle = "#8B8BA7";
    ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const a  = ang(i);
      const lx = cx + R * 1.28 * Math.cos(a);
      const ly = cy + R * 1.28 * Math.sin(a);
      const words = axes[i].split(" ");
      if (words.length <= 2) { ctx.fillText(axes[i], lx, ly + 4); }
      else { ctx.fillText(words.slice(0, 2).join(" "), lx, ly - 1); ctx.fillText(words.slice(2).join(" "), lx, ly + 12); }
    }
  }, [axes, values]);

  const legendColorClass = (i: number) =>
    i === 0 ? "text-indigo-500" : i === 1 ? "text-emerald-500" : "text-violet-500";

  return (
    <div className="rounded-[20px] bg-[#12121A] border border-[#2A2A3E] p-6 flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
            Match quality
          </p>
          <p className="mt-1 text-sm font-semibold text-[#F4F4FF]">
            Your performance metrics
          </p>
        </div>
        <Link
          href="/matches"
          className="text-xs font-semibold text-indigo-500 hover:underline"
        >
          View all →
        </Link>
      </div>

      <div className="flex items-center justify-center gap-6 flex-1">
        <canvas ref={canvasRef} width={200} height={200} />
        <div className="space-y-4">
          {fitData.map((d, i) => (
            <div key={d.subject}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
                {d.subject}
              </p>
              <p className={`text-2xl font-extrabold ${legendColorClass(i)}`}>
                {d.value}<span className="text-sm font-semibold text-[#8B8BA7]">%</span>
              </p>
            </div>
          ))}
        </div>
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
