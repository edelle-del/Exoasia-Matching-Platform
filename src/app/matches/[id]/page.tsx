"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../providers";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  stage: string | null;
  city: string | null;
  verification_status: string | null;
  member_role: string | null;
  role_title: string | null;
  ask_categories: string[] | null;
  offer_categories: string[] | null;
  asks_summary: string | null;
  offers_summary: string | null;
  employee_band: string | null;
  annual_revenue_estimate: string | null;
  years_in_operation: string | null;
  short_bio: string | null;
  phone_whatsapp: string | null;
};

type Match = {
  id: string;
  member_a_id: string;
  member_b_id: string;
  fit_score: number | null;
  summary: string | null;
  status: string;
  member_a_status: string;
  member_b_status: string;
  created_at: string;
};

type ParamStatus = "matched" | "partial" | "mismatch";

type Param = {
  name: string;
  myVal: string;
  theirVal: string;
  status: ParamStatus;
};

type Category = {
  id: string;
  label: string;
  score: number;
  color: string;
  params: Param[];
};

// ─── Canvas radar ─────────────────────────────────────────────────────────────

function useRadar(
  ref: React.RefObject<HTMLCanvasElement | null>,
  axes: string[],
  values: number[],
  size = 260,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2, cy = size / 2, R = size * 0.33, n = axes.length, LEVELS = 4;
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
    grad.addColorStop(0, "rgba(99,102,241,0.38)");
    grad.addColorStop(1, "rgba(99,102,241,0.04)");
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const p = pt(i, values[i] / 100); i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.85)"; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#6366F1"; ctx.fill();
      ctx.strokeStyle = "#0A0A0F"; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.font = "10px system-ui,sans-serif"; ctx.fillStyle = "#8B8BA7"; ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const a = ang(i), lx = cx + R * 1.38 * Math.cos(a), ly = cy + R * 1.38 * Math.sin(a);
      const words = axes[i].split(" ");
      words.length <= 2
        ? ctx.fillText(axes[i], lx, ly + 4)
        : (ctx.fillText(words.slice(0, 2).join(" "), lx, ly - 1), ctx.fillText(words.slice(2).join(" "), lx, ly + 12));
    }
  }, [axes, values, size, ref]);
}

// ─── Analytics computation ────────────────────────────────────────────────────

function clamp(v: number) { return Math.min(100, Math.max(30, Math.round(v))); }

function displayName(p: Profile | null) {
  return p?.business_name || p?.full_name || "Verified member";
}

function computeCategories(
  mine: Profile | null,
  theirs: Profile | null,
  fitScore: number,
): Category[] {
  const stageA = parseInt(mine?.stage ?? "1") || 1;
  const stageB = parseInt(theirs?.stage ?? "1") || 1;
  const stageDiff = Math.abs(stageA - stageB);

  const sectorMatch = !!(mine?.sector && mine.sector === theirs?.sector);
  const askSet  = new Set(mine?.ask_categories ?? []);
  const offerSet = new Set(theirs?.offer_categories ?? []);
  const overlap1 = [...askSet].filter((c) => offerSet.has(c)).length;
  const offerSetA = new Set(mine?.offer_categories ?? []);
  const askSetB  = new Set(theirs?.ask_categories ?? []);
  const overlap2 = [...offerSetA].filter((c) => askSetB.has(c)).length;

  const bothVerified =
    mine?.verification_status === "verified" && theirs?.verification_status === "verified";

  const fieldsA = [mine?.full_name, mine?.short_bio, mine?.city, mine?.role_title, mine?.phone_whatsapp].filter(Boolean).length;
  const fieldsB = [theirs?.full_name, theirs?.short_bio, theirs?.city, theirs?.role_title, theirs?.phone_whatsapp].filter(Boolean).length;

  const myName    = displayName(mine);
  const theirName = displayName(theirs);

  const paramStatus = (match: boolean, partial: boolean): ParamStatus =>
    match ? "matched" : partial ? "partial" : "mismatch";

  const financial: Category = {
    id: "financial", label: "Financial Alignment",
    score: clamp(fitScore + (stageDiff === 0 ? 8 : stageDiff === 1 ? 0 : -12)),
    color: "#6366F1",
    params: [
      {
        name: "Platform stage",
        myVal: `Stage ${mine?.stage ?? "—"}`,
        theirVal: `Stage ${theirs?.stage ?? "—"}`,
        status: paramStatus(stageDiff === 0, stageDiff === 1),
      },
      {
        name: "Revenue estimate",
        myVal: mine?.annual_revenue_estimate ?? "Not specified",
        theirVal: theirs?.annual_revenue_estimate ?? "Not specified",
        status: paramStatus(
          !!(mine?.annual_revenue_estimate && mine.annual_revenue_estimate === theirs?.annual_revenue_estimate),
          !!(mine?.annual_revenue_estimate || theirs?.annual_revenue_estimate),
        ),
      },
      {
        name: "Team size (band)",
        myVal: mine?.employee_band ?? "Not specified",
        theirVal: theirs?.employee_band ?? "Not specified",
        status: paramStatus(
          !!(mine?.employee_band && mine.employee_band === theirs?.employee_band),
          !!(mine?.employee_band || theirs?.employee_band),
        ),
      },
    ],
  };

  const market: Category = {
    id: "market", label: "Market & Sector Fit",
    score: clamp(fitScore + (sectorMatch ? 12 : -8) + overlap1 * 3),
    color: "#10B981",
    params: [
      {
        name: "Primary sector",
        myVal: mine?.sector ?? "Not specified",
        theirVal: theirs?.sector ?? "Not specified",
        status: paramStatus(sectorMatch, !!(mine?.sector || theirs?.sector)),
      },
      {
        name: "City / Region",
        myVal: mine?.city ?? "Not specified",
        theirVal: theirs?.city ?? "Not specified",
        status: paramStatus(
          !!(mine?.city && mine.city === theirs?.city),
          !!(mine?.city || theirs?.city),
        ),
      },
      {
        name: "Ask categories",
        myVal: (mine?.ask_categories ?? []).slice(0, 2).join(", ") || "None",
        theirVal: (theirs?.ask_categories ?? []).slice(0, 2).join(", ") || "None",
        status: paramStatus(overlap1 >= 2, overlap1 >= 1),
      },
    ],
  };

  const tech: Category = {
    id: "technology", label: "Technology Stack",
    score: clamp(fitScore + overlap2 * 5 - 8),
    color: "#8B5CF6",
    params: [
      {
        name: "Offer categories",
        myVal: (mine?.offer_categories ?? []).slice(0, 2).join(", ") || "None",
        theirVal: (theirs?.offer_categories ?? []).slice(0, 2).join(", ") || "None",
        status: paramStatus(overlap2 >= 2, overlap2 >= 1),
      },
      {
        name: "Offer–Ask overlap",
        myVal: `${overlap2} shared`,
        theirVal: `${overlap1} shared`,
        status: paramStatus(overlap2 >= 2 && overlap1 >= 2, overlap2 >= 1 || overlap1 >= 1),
      },
    ],
  };

  const timeline: Category = {
    id: "timeline", label: "Operational Timeline",
    score: clamp(fitScore + (bothVerified ? 6 : -4) + (stageDiff <= 1 ? 4 : -8)),
    color: "#F59E0B",
    params: [
      {
        name: "Verification status",
        myVal: mine?.verification_status ?? "unverified",
        theirVal: theirs?.verification_status ?? "unverified",
        status: paramStatus(bothVerified, !!(mine?.verification_status || theirs?.verification_status)),
      },
      {
        name: "Stage proximity",
        myVal: `Stage ${mine?.stage ?? "?"}`,
        theirVal: `Stage ${theirs?.stage ?? "?"}`,
        status: paramStatus(stageDiff === 0, stageDiff === 1),
      },
      {
        name: "Years in operation",
        myVal: mine?.years_in_operation ?? "Not specified",
        theirVal: theirs?.years_in_operation ?? "Not specified",
        status: paramStatus(
          !!(mine?.years_in_operation && mine.years_in_operation === theirs?.years_in_operation),
          !!(mine?.years_in_operation || theirs?.years_in_operation),
        ),
      },
    ],
  };

  const avgCompleteness = (fieldsA + fieldsB) / 10;
  const team: Category = {
    id: "team", label: "Team Dynamics",
    score: clamp(fitScore + Math.round(avgCompleteness * 15) - 5),
    color: "#EC4899",
    params: [
      {
        name: "Role title",
        myVal: mine?.role_title ?? "Not specified",
        theirVal: theirs?.role_title ?? "Not specified",
        status: paramStatus(
          !!(mine?.role_title && theirs?.role_title),
          !!(mine?.role_title || theirs?.role_title),
        ),
      },
      {
        name: "Bio completeness",
        myVal: mine?.short_bio ? "Provided" : "Missing",
        theirVal: theirs?.short_bio ? "Provided" : "Missing",
        status: paramStatus(!!(mine?.short_bio && theirs?.short_bio), !!(mine?.short_bio || theirs?.short_bio)),
      },
      {
        name: "Profile fields filled",
        myVal: `${fieldsA} / 5`,
        theirVal: `${fieldsB} / 5`,
        status: paramStatus(fieldsA >= 4 && fieldsB >= 4, fieldsA >= 3 || fieldsB >= 3),
      },
    ],
  };

  return [financial, market, tech, timeline, team];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColorClass(s: number) { return s >= 80 ? "text-emerald-400" : s >= 65 ? "text-indigo-400" : "text-amber-400"; }

const CAT_BG: Record<string, string> = {
  financial:  "bg-indigo-500",
  market:     "bg-emerald-500",
  technology: "bg-violet-500",
  timeline:   "bg-amber-500",
  team:       "bg-pink-500",
};

const CAT_GLOW: Record<string, string> = {
  financial:  "shadow-[0_0_8px_rgba(99,102,241,0.4)]",
  market:     "shadow-[0_0_8px_rgba(16,185,129,0.4)]",
  technology: "shadow-[0_0_8px_rgba(139,92,246,0.4)]",
  timeline:   "shadow-[0_0_8px_rgba(245,158,11,0.4)]",
  team:       "shadow-[0_0_8px_rgba(236,72,153,0.4)]",
};

function StatusBadge({ status }: { status: ParamStatus }) {
  const map: Record<ParamStatus, string> = {
    matched:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    partial:  "bg-amber-500/15  text-amber-400  border-amber-500/30",
    mismatch: "bg-red-500/15    text-red-400    border-red-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider ${map[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchDeepDivePage() {
  const { id }       = useParams<{ id: string }>();
  const supabase     = useMemo(() => createClient(), []);
  const { user, role } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [match,  setMatch]  = useState<Match | null>(null);
  const [mine,   setMine]   = useState<Profile | null>(null);
  const [theirs, setTheirs] = useState<Profile | null>(null);
  const [openCat, setOpenCat] = useState<number | null>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user?.id || !id) return;

    const load = async () => {
      setIsLoading(true);

      const { data: m } = await supabase
        .from("matches")
        .select("id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at")
        .eq("id", id)
        .single();

      if (!m) { setIsLoading(false); return; }
      setMatch(m);

      const isAdvisor = role && ["advisor", "admin"].includes(role);
      if (!isAdvisor && user.id !== m.member_a_id && user.id !== m.member_b_id) {
        setIsLoading(false);
        return;
      }

      const myId    = (isAdvisor ? m.member_a_id : user.id);
      const theirId = myId === m.member_a_id ? m.member_b_id : m.member_a_id;

      const FIELDS = "id, full_name, business_name, sector, stage, city, verification_status, member_role, role_title, ask_categories, offer_categories, asks_summary, offers_summary, employee_band, annual_revenue_estimate, years_in_operation, short_bio";

      const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
        supabase.from("profiles").select(FIELDS).eq("id", myId).single(),
        supabase.from("profiles").select(FIELDS).eq("id", theirId).single(),
      ]);

      setMine(myProfile as Profile ?? null);
      setTheirs(theirProfile as Profile ?? null);
      setIsLoading(false);
    };

    void load();
  }, [supabase, user?.id, id, role]);

  const fitScore   = match?.fit_score ?? 70;
  const categories = useMemo(() => computeCategories(mine, theirs, fitScore), [mine, theirs, fitScore]);
  const catScores  = categories.map((c) => c.score);
  const catAxes    = categories.map((c) => c.label);

  useRadar(canvasRef, catAxes, catScores, 260);

  const overall    = Math.round(catScores.reduce((a, b) => a + b, 0) / (catScores.length || 1));
  const circumf    = 2 * Math.PI * 28;
  const ringOffset = circumf - (overall / 100) * circumf;
  const overallLabel = overall >= 80 ? "Strong Match" : overall >= 60 ? "Good Match" : "Developing Match";

  const matchedCount  = categories.flatMap((c) => c.params).filter((p) => p.status === "matched").length;
  const partialCount  = categories.flatMap((c) => c.params).filter((p) => p.status === "partial").length;
  const mismatchCount = categories.flatMap((c) => c.params).filter((p) => p.status === "mismatch").length;

  const myName    = displayName(mine);
  const theirName = displayName(theirs);

  function statusConfig(status: string) {
    switch (status) {
      case "introduced": return "bg-violet-500/20 text-violet-300 border-violet-500/30";
      case "accepted":   return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "declined":   return "bg-[#2A2A3E] text-[#8B8BA7] border-[#2A2A3E]";
      default:           return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F4F4FF]">

      {/* Header */}
      <section className="border-b border-[#2A2A3E] bg-[#12121A] px-[5%] py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/matches" className="text-sm text-indigo-400 hover:underline">
            ← Back to analytics
          </Link>
          <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">
                Deep-Dive Analytics
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#F4F4FF]">Compatibility Breakdown</h1>
              {!isLoading && (
                <p className="mt-1 text-sm text-[#8B8BA7]">
                  <span className="text-[#F4F4FF] font-medium">{myName}</span>
                  <span className="mx-2 text-[#2A2A3E]">×</span>
                  <span className="text-[#F4F4FF] font-medium">{theirName}</span>
                  {match && (
                    <span className={`ml-3 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig(match.status)}`}>
                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Overall fit ring */}
            {!isLoading && (
              <div className="flex items-center gap-4 rounded-2xl border border-[#2A2A3E] bg-[#1A1A26] px-5 py-4">
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="28" fill="none" stroke="#2A2A3E" strokeWidth="5.5" />
                  <circle
                    cx="34" cy="34" r="28" fill="none"
                    stroke="#6366F1" strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray={circumf}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 34 34)"
                  />
                  <text x="34" y="39" textAnchor="middle" fill="#F4F4FF" fontSize="12" fontWeight="700" fontFamily="system-ui,sans-serif">
                    {overall}%
                  </text>
                </svg>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Overall Fit</p>
                  <p className="mt-1 text-sm font-bold text-[#F4F4FF]">{overallLabel}</p>
                  <p className="text-[11px] text-[#8B8BA7]">
                    {matchedCount} matched · {partialCount} partial · {mismatchCount} gap{mismatchCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-[5%] py-10 space-y-8">

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#12121A]" />
            ))}
          </div>
        ) : !match ? (
          <div className="rounded-2xl bg-[#12121A] border border-[#2A2A3E] px-8 py-16 text-center">
            <p className="text-base font-semibold text-[#F4F4FF]">Match not found</p>
            <p className="mt-1 text-sm text-[#8B8BA7]">This match may have been removed or you don't have access.</p>
          </div>
        ) : (
          <>
            {/* Match summary */}
            {match.summary && (
              <div className="rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7] mb-2">Advisor Summary</p>
                <p className="text-sm text-[#C4C4D4] leading-relaxed">{match.summary}</p>
              </div>
            )}

            {/* 5-axis radar + accordion */}
            <div className="grid lg:grid-cols-5 gap-6">

              {/* Radar */}
              <div className="lg:col-span-2 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-6 flex flex-col items-center">
                <p className="self-start text-xs font-bold text-[#F4F4FF]">5-Axis Compatibility</p>
                <p className="self-start text-[11px] text-[#8B8BA7] mt-0.5 mb-6">Per-category fit scores</p>
                <canvas ref={canvasRef} width={260} height={260} />
                <div className="mt-5 w-full space-y-2.5">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${CAT_BG[cat.id] ?? "bg-indigo-500"}`} />
                        <span className="text-[#8B8BA7]">{cat.label}</span>
                      </div>
                      <span className={`font-bold ${scoreColorClass(cat.score)}`}>{cat.score}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accordion */}
              <div className="lg:col-span-3">
                <p className="text-xs font-bold text-[#F4F4FF] mb-4">Parameter Breakdown</p>
                <div className="space-y-2">
                  {categories.map((cat, idx) => {
                    const isOpen   = openCat === idx;
                    const matched  = cat.params.filter((p) => p.status === "matched").length;
                    const partial  = cat.params.filter((p) => p.status === "partial").length;
                    const mismatch = cat.params.filter((p) => p.status === "mismatch").length;

                    return (
                      <div key={cat.id} className="rounded-xl border border-[#2A2A3E] bg-[#12121A] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenCat(isOpen ? null : idx)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#1A1A26] transition-colors text-left"
                        >
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${CAT_BG[cat.id] ?? "bg-indigo-500"} ${CAT_GLOW[cat.id] ?? ""}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#F4F4FF]">{cat.label}</p>
                            <p className="mt-0.5 text-[11px] text-[#8B8BA7]">
                              {matched} matched · {partial} partial · {mismatch} gap{mismatch !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className={`text-base font-extrabold shrink-0 ${scoreColorClass(cat.score)}`}>{cat.score}%</span>
                          <svg
                            className={`shrink-0 h-4 w-4 text-[#8B8BA7] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="overflow-hidden">
                          <div className="border-t border-[#2A2A3E] px-5 py-4">
                            {/* Column headers */}
                            <div className="grid grid-cols-12 gap-2 mb-2 pb-2 border-b border-[#2A2A3E]/50">
                              <p className="col-span-4 text-[9px] font-bold uppercase tracking-widest text-[#8B8BA7]">Parameter</p>
                              <p className="col-span-3 text-[9px] font-bold uppercase tracking-widest text-[#8B8BA7]">{myName.split(" ")[0]}</p>
                              <p className="col-span-3 text-[9px] font-bold uppercase tracking-widest text-[#8B8BA7]">{theirName.split(" ")[0]}</p>
                              <p className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-[#8B8BA7] text-right">Status</p>
                            </div>
                            {cat.params.map((p) => (
                              <div key={p.name} className="grid grid-cols-12 gap-2 py-2.5 border-b border-[#2A2A3E]/40 last:border-0 items-start">
                                <p className="col-span-4 text-[11px] text-[#C4C4D4] leading-snug">{p.name}</p>
                                <p className="col-span-3 text-[11px] font-semibold text-[#F4F4FF] leading-snug">{p.myVal}</p>
                                <p className="col-span-3 text-[11px] text-[#8B8BA7] leading-snug">{p.theirVal}</p>
                                <div className="col-span-2 flex justify-end">
                                  <StatusBadge status={p.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
