"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import { fetchUserMatches } from "@/lib/app-data";
import type { MatchRecord } from "@/lib/app-data";

type MatchRow = MatchRecord & {
  counterpart_name: string | null;
  counterpart_sector: string | null;
};

// ─── Canvas radar hook ────────────────────────────────────────────────────────

type Palette = { inner: string; outer: string; stroke: string; dot: string };

function useRadar(
  ref: React.RefObject<HTMLCanvasElement | null>,
  axes: string[],
  values: number[],
  pal: Palette,
  size = 260,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2, cy = size / 2, R = size * 0.36, n = axes.length, LEVELS = 4;
    ctx.clearRect(0, 0, size, size);

    const ang = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
    const pt  = (i: number, r: number) => ({ x: cx + R * r * Math.cos(ang(i)), y: cy + R * r * Math.sin(ang(i)) });

    for (let l = 1; l <= LEVELS; l++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const p = pt(i, l / LEVELS); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.stroke();
      if (l === LEVELS) { ctx.fillStyle = "rgba(255,255,255,0.015)"; ctx.fill(); }
    }
    for (let i = 0; i < n; i++) {
      const p = pt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.stroke();
    }

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, pal.inner); grad.addColorStop(1, pal.outer);
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const p = pt(i, values[i] / 100); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = pal.stroke; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = pal.dot; ctx.fill();
      ctx.strokeStyle = "#0A0A0F"; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.font = "10.5px system-ui,sans-serif"; ctx.fillStyle = "#8B8BA7"; ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const a = ang(i), lx = cx + R * 1.26 * Math.cos(a), ly = cy + R * 1.26 * Math.sin(a);
      const words = axes[i].split(" ");
      words.length <= 2
        ? ctx.fillText(axes[i], lx, ly + 4)
        : (ctx.fillText(words.slice(0, 2).join(" "), lx, ly - 1), ctx.fillText(words.slice(2).join(" "), lx, ly + 13));
    }
  }, [axes, values, pal, size, ref]);
}

function RadarChart({ axes, values, pal, size = 260 }: { axes: string[]; values: number[]; pal: Palette; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useRadar(ref, axes, values, pal, size);
  return <canvas ref={ref} width={size} height={size} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColorClass(s: number) { return s >= 80 ? "text-emerald-400" : s >= 65 ? "text-indigo-400" : "text-amber-400"; }
function scoreBarClass(s: number)   { return s >= 80 ? "bg-emerald-400"   : s >= 65 ? "bg-indigo-400"   : "bg-amber-400"; }

function statusStyle(status: string) {
  switch (status) {
    case "introduced": return { pill: "bg-violet-500/20 text-violet-300 border-violet-500/30", label: "Introduced" };
    case "accepted":   return { pill: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Accepted" };
    case "declined":   return { pill: "bg-[#2A2A3E] text-[#8B8BA7] border-[#2A2A3E]", label: "Declined" };
    default:           return { pill: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Pending" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const supabase   = useMemo(() => createClient(), []);
  const { user }   = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [matches,   setMatches]   = useState<MatchRow[]>([]);
  const [memberRole, setMemberRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);

    Promise.all([
      fetchUserMatches(supabase, user.id),
      supabase.from("profiles").select("member_role").eq("id", user.id).single(),
    ]).then(async ([rawMatches, { data: profile }]) => {
      setMemberRole(profile?.member_role ?? null);

      const cpIds = [...new Set(rawMatches.map((m) =>
        m.member_a_id === user.id ? m.member_b_id : m.member_a_id,
      ))];

      let sectorMap = new Map<string, string | null>();
      if (cpIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, sector").in("id", cpIds);
        sectorMap = new Map((data ?? []).map((p) => [p.id, p.sector ?? null]));
      }

      setMatches(rawMatches.map((m) => {
        const cpId = m.member_a_id === user.id ? m.member_b_id : m.member_a_id;
        return { ...m, counterpart_sector: sectorMap.get(cpId) ?? null };
      }));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [supabase, user?.id]);

  const isInvestor = memberRole === "investor";

  // Macro stats
  const scores      = matches.filter((m) => m.fit_score !== null).map((m) => m.fit_score!);
  const avgFit      = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const responded   = matches.filter((m) => (m.member_a_id === user?.id ? m.member_a_status : m.member_b_status) !== "pending");
  const responseRate = matches.length > 0 ? Math.round((responded.length / matches.length) * 100) : 0;
  const accepted    = responded.filter((m) => (m.member_a_id === user?.id ? m.member_a_status : m.member_b_status) === "accepted");
  const acceptRate  = responded.length > 0 ? Math.round((accepted.length / responded.length) * 100) : 0;
  const activeDeals = matches.filter((m) => ["accepted", "introduced"].includes(m.status)).length;

  const radarPal: Palette = isInvestor
    ? { inner: "rgba(99,102,241,0.42)",  outer: "rgba(99,102,241,0.04)",  stroke: "rgba(99,102,241,0.9)",  dot: "#6366F1" }
    : { inner: "rgba(16,185,129,0.42)", outer: "rgba(16,185,129,0.04)", stroke: "rgba(16,185,129,0.9)", dot: "#10B981" };

  const metrics = [
    { label: isInvestor ? "Avg Match Quality" : "Best Fit Score", value: isLoading ? "…" : `${avgFit}%`,       color: isInvestor ? "text-indigo-400" : "text-emerald-400" },
    { label: "Response Rate",                                       value: isLoading ? "…" : `${responseRate}%`, color: "text-amber-400" },
    { label: "Accept Rate",                                         value: isLoading ? "…" : `${acceptRate}%`,  color: "text-violet-400" },
    { label: "Active Deals",                                        value: isLoading ? "…" : String(activeDeals), color: "text-pink-400" },
  ];

  const legendRows = [
    { label: "Match Quality",  val: avgFit,       color: isInvestor ? "text-indigo-400" : "text-emerald-400" },
    { label: "Response Rate",  val: responseRate, color: "text-amber-400"  },
    { label: "Accept Rate",    val: acceptRate,   color: "text-violet-400" },
  ];

  const sorted = [...matches].sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F4F4FF]">

      {/* Page header */}
      <section className="border-b border-[#2A2A3E] bg-[#12121A] px-[5%] py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-[#F4F4FF]">Match Analytics</h1>
          <p className="mt-1 text-sm text-[#8B8BA7]">
            {isLoading ? "Loading…" : `${matches.length} match${matches.length !== 1 ? "es" : ""}`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-[5%] py-10 space-y-8">

        {/* Portal label */}
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[.2em] ${isInvestor ? "text-indigo-400" : "text-emerald-400"}`}>
            {isInvestor ? "Investor Portal" : "Startup Portal"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#F4F4FF]">
            {isInvestor ? "Portfolio Match Intelligence" : "Investor Match Intelligence"}
          </h2>
          <p className="mt-1 text-sm text-[#8B8BA7]">
            {isInvestor
              ? "Macro-averaged compatibility across your matched startup pipeline."
              : "Your project's compatibility against the matched investor pool."}
          </p>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">{label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Radar + Match list */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Radar */}
          <div className="lg:col-span-2 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-6 flex flex-col items-center">
            <p className="self-start text-xs font-bold text-[#F4F4FF]">Match Radar</p>
            <p className="self-start text-[11px] text-[#8B8BA7] mt-0.5 mb-6">3-axis macro average</p>

            {isLoading
              ? <div className="h-[260px] w-[260px] animate-pulse rounded-full bg-[#1A1A26]" />
              : <RadarChart axes={["Match Quality", "Response Rate", "Accept Rate"]} values={[avgFit, responseRate, acceptRate]} pal={radarPal} />
            }

            <div className="mt-5 w-full space-y-2.5">
              {legendRows.map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[#8B8BA7]">{label}</span>
                  <span className={`font-bold ${color}`}>{isLoading ? "…" : `${val}%`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Match list */}
          <div className="lg:col-span-3 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-6">
            <p className="text-xs font-bold text-[#F4F4FF]">
              {isInvestor ? "Matched Startups" : "Matched Investors"}
            </p>
            <p className="text-[11px] text-[#8B8BA7] mt-0.5 mb-5">
              Sorted by fit score · Click for deep-dive
            </p>

            <div className="space-y-2.5">
              {isLoading && [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-[#1A1A26]" />
              ))}

              {!isLoading && sorted.length === 0 && (
                <div className="rounded-xl bg-[#1A1A26] py-12 text-center">
                  <p className="text-sm font-semibold text-[#F4F4FF]">No matches yet</p>
                  <p className="mt-1 text-[11px] text-[#8B8BA7]">
                    When you get matched with a counterpart, they'll appear here.
                  </p>
                </div>
              )}

              {!isLoading && sorted.map((m) => {
                const sc    = statusStyle(m.status);
                const score = m.fit_score ?? 0;
                const name  = m.counterpart_name ?? "Verified member";
                return (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    className="flex items-center gap-4 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] hover:border-indigo-500/40 hover:bg-[#1E1E2E] p-4 transition-all group"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-[#2A2A3E] flex items-center justify-center text-xs font-bold text-[#F4F4FF]">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-[#F4F4FF]">{name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.pill}`}>
                          {sc.label}
                        </span>
                      </div>
                      {m.counterpart_sector && (
                        <p className="text-[11px] text-[#8B8BA7] mb-1.5">{m.counterpart_sector}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[#2A2A3E] overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${scoreBarClass(score)}`} style={{ width: `${score}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-9 text-right ${scoreColorClass(score)}`}>{score}%</span>
                      </div>
                    </div>
                    <svg className="shrink-0 h-4 w-4 text-[#2A2A3E] group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
