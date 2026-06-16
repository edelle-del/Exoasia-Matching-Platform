"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DiscoverProject, DiscoverInvestor } from "@/app/api/ecosystem/discover/route";

type MemberFilter = "all" | "startups" | "investors";

type Props = {
  projects: DiscoverProject[];
  investors: DiscoverInvestor[];
  unlockedMatchIds: Set<string>;
  isLoading: boolean;
  adding: Record<string, boolean>;
  scoring: Record<string, boolean>;
  memberFilter: MemberFilter;
  onMemberFilterChange: (mode: MemberFilter) => void;
  generatingTop3: boolean;
  top3Progress: number;
  top3Total: number;
  userId: string;
  onAdd: (ownerId: string) => void;
  onCancelInvite: (ownerId: string) => void;
  onScore: (ownerId: string) => void;
  onGetTop3: () => void;
  onUnlockMatch: (targetId: string) => void;
};

type FounderDetail = {
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  city: string | null;
  short_bio: string | null;
  role_title: string | null;
  verification_status: string | null;
  years_in_operation: string | null;
  employee_band: string | null;
  linkedin_url: string | null;
  asks_summary: string | null;
};

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-400";
  if (s >= 50) return "text-amber-400";
  return "text-rose-400";
}

function scoreBg(s: number) {
  if (s >= 75) return "bg-emerald-500/15 border-emerald-500/30";
  if (s >= 50) return "bg-amber-500/15 border-amber-500/30";
  return "bg-rose-500/15 border-rose-500/30";
}

// ─── Startup project modal ────────────────────────────────────────────────────

function ProjectModal({
  project,
  adding,
  scoring,
  userId,
  onAdd,
  onCancelInvite,
  onScore,
  onClose,
  setConfirmInvite,
}: {
  project: DiscoverProject;
  adding: Record<string, boolean>;
  scoring: Record<string, boolean>;
  userId: string;
  onAdd: (ownerId: string) => void;
  onCancelInvite: (ownerId: string) => void;
  onScore: (ownerId: string) => void;
  onClose: () => void;
  setConfirmInvite: (p: DiscoverProject) => void;
}) {
  const supabase    = useMemo(() => createClient(), []);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [founder, setFounder]           = useState<FounderDetail | null>(null);
  const [loadingFounder, setLoadingFounder] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, business_name, sector, city, short_bio, role_title, verification_status, years_in_operation, employee_band, linkedin_url, asks_summary")
        .eq("id", project.owner_id)
        .single();
      setFounder(data as FounderDetail ?? null);
      setLoadingFounder(false);
    })();
  }, [supabase, project.owner_id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose(); },
    [onClose],
  );

  let v2: Record<string, unknown> | null = null;
  try {
    const p = JSON.parse(founder?.asks_summary ?? "");
    if (p?._v === 2) v2 = p;
  } catch { /* */ }

  const fundraisingStage = v2?.fundraising_stage as string | null ?? null;
  const productStage     = v2?.product_stage     as string | null ?? null;
  const targetRaiseMin   = v2?.target_raise_min  != null ? Number(v2.target_raise_min) : null;
  const targetRaiseMax   = v2?.target_raise_max  != null ? Number(v2.target_raise_max) : null;
  const targetRegions    = (v2?.target_regions   as string[] | null) ?? [];
  const targetIndustries = (v2?.target_industries as string[] | null) ?? [];

  const raiseLabel = (min: number | null, max: number | null) => {
    if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    if (min != null) return `From $${min.toLocaleString()}`;
    if (max != null) return `Up to $${max.toLocaleString()}`;
    return null;
  };

  const initials = (founder?.full_name ?? project.owner_name ?? "?")
    .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2A3E] bg-[#12121A] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A3E] bg-[#1A1A26] text-[#8B8BA7] hover:bg-[#2A2A3E] transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          <div className="pr-8">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {project.stage && (
                <span className="rounded-full bg-[#2A2A3E] px-2.5 py-0.5 text-[10px] font-medium text-[#8B8BA7]">
                  {project.stage}
                </span>
              )}
              {project.sector && (
                <span className="rounded-full border border-[#2A2A3E] px-2.5 py-0.5 text-[10px] font-medium text-[#8B8BA7]">
                  {project.sector}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#F4F4FF]">{project.project_name}</h2>
          </div>

          {project.eco_score !== null && (
            <div className={`rounded-xl border px-4 py-3 ${scoreBg(project.eco_score)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Mandate Fit Score</p>
                <p className={`text-lg font-extrabold tabular-nums ${scoreColor(project.eco_score)}`}>
                  {project.eco_score}%
                </p>
              </div>
              {project.eco_summary && (
                <p className="mt-1 text-xs text-[#C4C4D4] leading-relaxed">{project.eco_summary}</p>
              )}
            </div>
          )}

          {project.description && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">About the project</p>
              <p className="text-sm text-[#C4C4D4] leading-relaxed">{project.description}</p>
            </div>
          )}

          {(fundraisingStage || productStage || targetRaiseMin != null || targetRaiseMax != null || targetRegions.length > 0 || targetIndustries.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {fundraisingStage && (
                <div className="rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#8B8BA7]">Fundraising stage</p>
                  <p className="mt-0.5 text-sm font-medium text-[#F4F4FF]">{fundraisingStage}</p>
                </div>
              )}
              {productStage && (
                <div className="rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#8B8BA7]">Product stage</p>
                  <p className="mt-0.5 text-sm font-medium text-[#F4F4FF]">{productStage}</p>
                </div>
              )}
              {raiseLabel(targetRaiseMin, targetRaiseMax) && (
                <div className="col-span-2 rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#8B8BA7]">Target raise</p>
                  <p className="mt-0.5 text-sm font-medium text-[#F4F4FF]">{raiseLabel(targetRaiseMin, targetRaiseMax)}</p>
                </div>
              )}
              {targetRegions.length > 0 && (
                <div className="col-span-2 rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#8B8BA7]">Target regions</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {targetRegions.map((r) => (
                      <span key={r} className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-xs text-[#8B8BA7]">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {targetIndustries.length > 0 && (
                <div className="col-span-2 rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-[#8B8BA7]">Target industries</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {targetIndustries.map((i) => (
                      <span key={i} className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-400">{i}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Founder</p>
            {loadingFounder ? (
              <div className="h-20 animate-pulse rounded-xl bg-[#1A1A26]" />
            ) : founder ? (
              <div className="rounded-xl border border-[#2A2A3E] bg-[#0F0F17] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-400">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#F4F4FF]">{founder.full_name || "—"}</p>
                    {founder.business_name && <p className="text-xs text-[#8B8BA7]">{founder.business_name}</p>}
                    {founder.role_title && <p className="text-xs text-[#4A4A6A]">{founder.role_title}</p>}
                    {founder.verification_status === "verified" && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        ✓ Verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[#8B8BA7]">
                  {founder.city && <span>📍 {founder.city}</span>}
                  {founder.sector && <span>🏭 {founder.sector}</span>}
                  {founder.years_in_operation && <span>🕐 {founder.years_in_operation} yrs</span>}
                  {founder.employee_band && <span>👥 {founder.employee_band}</span>}
                </div>
                {founder.short_bio && <p className="text-sm text-[#C4C4D4] leading-relaxed">{founder.short_bio}</p>}
                {founder.linkedin_url && (
                  <a href={founder.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn profile
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#8B8BA7]">Founder details unavailable.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {project.eco_score !== null && (
              <Link
                href={`/matches/breakdown?a=${userId}&b=${project.owner_id}&score=${project.eco_score}&project=${project.project_id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                View compatibility breakdown
              </Link>
            )}
            <button
              type="button"
              disabled={scoring[project.owner_id]}
              onClick={() => { onScore(project.owner_id); onClose(); }}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
            >
              {scoring[project.owner_id] ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scoring…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  {project.eco_score !== null ? "Rescore" : "Score against mandate"}
                </>
              )}
            </button>
            {project.already_in_portfolio ? (
              <button
                type="button"
                disabled={adding[project.owner_id]}
                onClick={() => onCancelInvite(project.owner_id)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A3E] bg-[#12121A] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF] disabled:opacity-50"
              >
                {adding[project.owner_id] ? "Canceling…" : "Cancel Invite"}
              </button>
            ) : (
              <button
                type="button"
                disabled={adding[project.owner_id]}
                onClick={() => setConfirmInvite(project)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {adding[project.owner_id] ? "Sending…" : "Invite to portfolio"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Investor profile modal ───────────────────────────────────────────────────

function InvestorModal({
  investor,
  userId,
  onClose,
}: {
  investor: DiscoverInvestor;
  userId: string;
  onClose: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose(); },
    [onClose],
  );

  const displayName = investor.business_name || investor.full_name || "Investor";
  const initials = displayName.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2A3E] bg-[#12121A] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A3E] bg-[#1A1A26] text-[#8B8BA7] hover:bg-[#2A2A3E] transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="pr-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-lg font-bold text-indigo-400">
              {initials || "?"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#F4F4FF]">{displayName}</h2>
                {investor.verification_status === "verified" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    ✓ Verified
                  </span>
                )}
              </div>
              {investor.role_title && <p className="text-xs text-[#8B8BA7] mt-0.5">{investor.role_title}</p>}
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#8B8BA7]">
                {investor.city && <span>📍 {investor.city}</span>}
                {investor.sector && <span>🏭 {investor.sector}</span>}
              </div>
            </div>
          </div>

          {/* Bio */}
          {investor.short_bio && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">About</p>
              <p className="text-sm text-[#C4C4D4] leading-relaxed">{investor.short_bio}</p>
            </div>
          )}

          {/* Offers */}
          {investor.offer_categories && investor.offer_categories.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Offers</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.offer_categories.map((c) => (
                  <span key={c} className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Asks */}
          {investor.ask_categories && investor.ask_categories.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Looking for</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.ask_categories.map((c) => (
                  <span key={c} className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-400">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/matches/breakdown?a=${userId}&b=${investor.profile_id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              View compatibility breakdown
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Discover list ────────────────────────────────────────────────────────────

const RANK_STYLE = [
  "border-amber-400/60 bg-amber-400/10 text-amber-300",
  "border-slate-400/60 bg-slate-400/10 text-slate-300",
  "border-orange-400/60 bg-orange-400/10 text-orange-300",
];

export function DiscoverView({
  projects, investors, unlockedMatchIds, isLoading, adding, scoring,
  memberFilter, onMemberFilterChange,
  generatingTop3, top3Progress, top3Total,
  userId,
  onAdd, onCancelInvite, onScore, onGetTop3, onUnlockMatch,
}: Props) {
  const [selectedProject,  setSelectedProject]  = useState<DiscoverProject | null>(null);
  const [selectedInvestor, setSelectedInvestor] = useState<DiscoverInvestor | null>(null);
  const [confirmInvite, setConfirmInvite] = useState<DiscoverProject | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const displayedProjects = [...projects]
    .sort((a, b) => (b.eco_score ?? 0) - (a.eco_score ?? 0));

  const showStartups  = memberFilter === "all" || memberFilter === "startups";
  const showInvestors = memberFilter === "all" || memberFilter === "investors";

  const handleUnlock = async () => {
    if (!unlockTarget) return;
    setIsUnlocking(true);
    try {
      const res = await fetch("/api/ecosystem/unlock-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: unlockTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          window.alert(`Insufficient credits. You need ${data.needed} cr but have ${data.balance} cr.`);
        } else {
          window.alert(data.error || "Failed to unlock.");
        }
      } else {
        onUnlockMatch(unlockTarget.id);
      }
    } catch (err) {
      window.alert("Network error.");
    } finally {
      setIsUnlocking(false);
      setUnlockTarget(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
        {/* Header */}
        <div className="border-b border-[#2A2A3E] px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Discover</p>
              <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Browse investors and startup projects on the platform</p>
            </div>
            <button
              type="button"
              disabled={generatingTop3}
              onClick={onGetTop3}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 disabled:opacity-60 transition-colors shrink-0"
            >
              {generatingTop3 ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {top3Total > 0 ? `Scoring ${top3Progress}/${top3Total}…` : "Scoring…"}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  {(projects.some((p) => p.eco_score !== null) || investors.some((i) => i.eco_score !== null)) ? "Regenerate Matches (8cr)" : "Create Matches (Free)"}
                </>
              )}
            </button>
          </div>

          {/* Member type filter */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex rounded-xl border border-[#2A2A3E] overflow-hidden text-xs font-semibold">
              {(["all", "startups", "investors"] as MemberFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onMemberFilterChange(f)}
                  className={`px-4 py-1.5 capitalize transition-colors ${memberFilter === f ? "bg-violet-600 text-white" : "bg-[#12121A] text-[#8B8BA7] hover:bg-[#1A1A26]"}`}
                >
                  {f === "all" ? "All members" : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-[#0F0F17]" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A3E]">

            {/* ── Startups ── */}
            {showStartups && (
              <>
                {memberFilter === "all" && (
                  <div className="px-5 py-2.5 bg-[#0F0F17]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
                      Startups · {displayedProjects.length} project{displayedProjects.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {displayedProjects.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-[#F4F4FF]">
                      No active startup projects yet
                    </p>
                  </div>
                ) : (
                  displayedProjects.map((p, idx) => {
                    const isLocked = idx >= 5 && !unlockedMatchIds.has(p.project_id);
                    return (
                    <div key={p.project_id} className="relative">
                      <div className={isLocked ? "blur-sm select-none pointer-events-none" : ""}>
                        <div
                          className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#0F0F17] transition-colors"
                          onClick={() => setSelectedProject(p)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && setSelectedProject(p)}
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${RANK_STYLE[idx] ?? RANK_STYLE[2]}`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-[#F4F4FF]">{p.project_name}</p>
                              {p.stage && <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">{p.stage}</span>}
                              {p.sector && <span className="rounded-full border border-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">{p.sector}</span>}
                              {p.eco_score !== null && (
                                <span className={`text-xs font-bold tabular-nums ${scoreColor(p.eco_score)}`}>{p.eco_score}% fit</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-[#8B8BA7]">{p.owner_name}</p>
                            {p.eco_summary && <p className="mt-1 line-clamp-1 text-xs text-[#6B6B8A] italic">{p.eco_summary}</p>}
                            {!p.eco_summary && p.description && <p className="mt-1 line-clamp-1 text-xs text-[#4A4A6A]">{p.description}</p>}
                          </div>
                          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={scoring[p.owner_id]}
                              onClick={() => onScore(p.owner_id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {scoring[p.owner_id] ? (
                                <>
                                  <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Scoring…
                                </>
                              ) : (
                                <>{p.eco_score !== null ? "Rescore" : "Score"}</>
                              )}
                            </button>
                            {p.eco_score !== null && (
                              <Link
                                href={`/matches/breakdown?a=${userId}&b=${p.owner_id}&score=${p.eco_score}&project=${p.project_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/15 transition-colors"
                              >
                                Breakdown
                              </Link>
                            )}
                            {p.already_in_portfolio ? (
                              <button
                                type="button"
                                disabled={adding[p.owner_id]}
                                onClick={() => onCancelInvite(p.owner_id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A3E] bg-[#12121A] px-3 py-2 text-xs font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
                              >
                                {adding[p.owner_id] ? "Canceling…" : "Cancel Invite"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={adding[p.owner_id]}
                                onClick={() => setConfirmInvite(p)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {adding[p.owner_id] ? "Sending…" : "Invite"}
                              </button>
                            )}
                            <svg className="h-4 w-4 text-[#4A4A6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      {isLocked && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto bg-[#12121A]/10">
                          <button
                            type="button"
                            onClick={() => setUnlockTarget({ id: p.project_id, name: p.project_name })}
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl hover:bg-violet-500 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Unlock for 3cr
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── Investors ── */}
            {showInvestors && (
              <>
                {memberFilter === "all" && (
                  <div className="px-5 py-2.5 bg-[#0F0F17]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">
                      Investors · {investors.length} profile{investors.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
                {investors.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-[#F4F4FF]">No investor profiles yet</p>
                  </div>
                ) : (
                  investors.map((inv, idx) => {
                    const isLocked = idx >= 5 && !unlockedMatchIds.has(inv.profile_id);
                    const displayName = inv.business_name || inv.full_name || "Investor";
                    return (
                      <div key={inv.profile_id} className="relative">
                        <div className={isLocked ? "blur-sm select-none pointer-events-none" : ""}>
                          <div
                            className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#0F0F17] transition-colors"
                            onClick={() => setSelectedInvestor(inv)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && setSelectedInvestor(inv)}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${RANK_STYLE[idx] ?? RANK_STYLE[2]}`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-[#F4F4FF]">{displayName}</p>
                                {inv.verification_status === "verified" && (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Verified</span>
                                )}
                                {inv.sector && (
                                  <span className="rounded-full border border-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">{inv.sector}</span>
                                )}
                                {inv.eco_score !== null && (
                                  <span className={`text-xs font-bold tabular-nums ${scoreColor(inv.eco_score)}`}>{inv.eco_score}% fit</span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-[#8B8BA7]">
                                {inv.role_title && <span>{inv.role_title}</span>}
                                {inv.role_title && inv.city && " · "}
                                {inv.city && <span>📍 {inv.city}</span>}
                              </p>
                              {inv.eco_summary && <p className="mt-1 line-clamp-1 text-xs text-[#6B6B8A] italic">{inv.eco_summary}</p>}
                              {!inv.eco_summary && inv.short_bio && <p className="mt-1 line-clamp-1 text-xs text-[#4A4A6A]">{inv.short_bio}</p>}
                              {inv.offer_categories && inv.offer_categories.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {inv.offer_categories.slice(0, 3).map((c) => (
                                    <span key={c} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400">{c}</span>
                                  ))}
                                  {inv.offer_categories.length > 3 && (
                                    <span className="text-[9px] text-[#4A4A6A]">+{inv.offer_categories.length - 3} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={scoring[inv.profile_id]}
                                onClick={() => onScore(inv.profile_id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {scoring[inv.profile_id] ? (
                                  <>
                                    <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Scoring…
                                  </>
                                ) : (
                                  <>{inv.eco_score !== null ? "Rescore" : "Score"}</>
                                )}
                              </button>
                              {inv.eco_score !== null && (
                                <Link
                                  href={`/matches/breakdown?a=${userId}&b=${inv.profile_id}&score=${inv.eco_score}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/8 px-3 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/15 transition-colors"
                                >
                                  Breakdown
                                </Link>
                              )}
                              {inv.already_in_portfolio ? (
                                <button
                                  type="button"
                                  disabled={adding[inv.profile_id]}
                                  onClick={() => onCancelInvite(inv.profile_id)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A3E] bg-[#12121A] px-3 py-2 text-xs font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
                                >
                                  {adding[inv.profile_id] ? "Canceling…" : "Cancel Invite"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={adding[inv.profile_id]}
                                  onClick={() => setConfirmInvite({ ...inv, owner_id: inv.profile_id, project_name: displayName, owner_name: displayName } as any)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {adding[inv.profile_id] ? "Sending…" : "Invite"}
                                </button>
                              )}
                              <svg className="h-4 w-4 text-[#4A4A6A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        {isLocked && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto bg-[#12121A]/10">
                            <button
                              type="button"
                              onClick={() => setUnlockTarget({ id: inv.profile_id, name: inv.business_name || inv.full_name || "Investor" })}
                              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl hover:bg-violet-500 transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Unlock for 3cr
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}

          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          adding={adding}
          scoring={scoring}
          userId={userId}
          onAdd={onAdd}
          onCancelInvite={onCancelInvite}
          onScore={onScore}
          onClose={() => setSelectedProject(null)}
          setConfirmInvite={setConfirmInvite}
        />
      )}
      {selectedInvestor && (
        <InvestorModal
          investor={selectedInvestor}
          userId={userId}
          onClose={() => setSelectedInvestor(null)}
        />
      )}
      {confirmInvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => setConfirmInvite(null)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-sm font-semibold text-[#F4F4FF]">Confirm Invitation</p>
              <p className="mt-1 text-xs text-[#8B8BA7]">You are about to invite the following member to collaborate:</p>
            </div>
            
            <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Name</p>
                <p className="text-sm font-medium text-[#F4F4FF]">{confirmInvite.owner_name}</p>
              </div>
              {confirmInvite.project_name && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Business</p>
                  <p className="text-sm font-medium text-[#F4F4FF]">{confirmInvite.project_name}</p>
                </div>
              )}
              {confirmInvite.sector && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Sector</p>
                  <p className="text-sm font-medium text-[#F4F4FF]">{confirmInvite.sector}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmInvite(null)}
                className="flex-1 rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adding[confirmInvite.owner_id]}
                onClick={() => {
                  onAdd(confirmInvite.owner_id);
                  setConfirmInvite(null);
                  if (selectedProject?.owner_id === confirmInvite.owner_id) setSelectedProject(null);
                }}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding[confirmInvite.owner_id] ? "Sending…" : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
      {unlockTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={() => !isUnlocking && setUnlockTarget(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-[#F4F4FF]">Unlock Match</p>
              <p className="mt-1 text-sm text-[#8B8BA7]">
                You are about to unlock the full profile for <strong className="text-white">{unlockTarget.name}</strong>.
              </p>
              <p className="mt-4 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2 text-xs font-medium text-violet-300">
                This will deduct <strong className="text-white">3 credits</strong> from your account.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                disabled={isUnlocking}
                className="flex-1 rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] hover:bg-[#1A1A26] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {isUnlocking ? "Unlocking…" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
