"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DiscoverProject } from "@/app/api/ecosystem/discover/route";

type Props = {
  projects: DiscoverProject[];
  isLoading: boolean;
  adding: Record<string, boolean>;
  scoring: Record<string, boolean>;
  viewMode: "all" | "top5";
  onViewModeChange: (mode: "all" | "top5") => void;
  generatingTop5: boolean;
  top5Progress: number;
  top5Total: number;
  userId: string;
  onAdd: (ownerId: string) => void;
  onScore: (ownerId: string) => void;
  onGetTop5: () => void;
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

// ─── Project detail modal ─────────────────────────────────────────────────────

function ProjectModal({
  project,
  adding,
  scoring,
  userId,
  onAdd,
  onScore,
  onClose,
}: {
  project: DiscoverProject;
  adding: Record<string, boolean>;
  scoring: Record<string, boolean>;
  userId: string;
  onAdd: (ownerId: string) => void;
  onScore: (ownerId: string) => void;
  onClose: () => void;
}) {
  const supabase   = useMemo(() => createClient(), []);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [founder, setFounder] = useState<FounderDetail | null>(null);
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

  // Parse structured startup asks_summary
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
        {/* Close */}
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
          {/* Project header */}
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

          {/* AI score banner */}
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

          {/* Project details */}
          {project.description && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">About the project</p>
              <p className="text-sm text-[#C4C4D4] leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Structured startup data */}
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

          {/* Founder profile */}
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
                    {founder.business_name && (
                      <p className="text-xs text-[#8B8BA7]">{founder.business_name}</p>
                    )}
                    {founder.role_title && (
                      <p className="text-xs text-[#4A4A6A]">{founder.role_title}</p>
                    )}
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
                {founder.short_bio && (
                  <p className="text-sm text-[#C4C4D4] leading-relaxed">{founder.short_bio}</p>
                )}
                {founder.linkedin_url && (
                  <a
                    href={founder.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
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

          {/* Actions */}
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
              <span className="inline-flex items-center rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7]">
                Already invited
              </span>
            ) : (
              <button
                type="button"
                disabled={adding[project.owner_id]}
                onClick={() => { onAdd(project.owner_id); onClose(); }}
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

// ─── Discover list ────────────────────────────────────────────────────────────

const RANK_STYLE = [
  "border-amber-400/60 bg-amber-400/10 text-amber-300",
  "border-slate-400/60 bg-slate-400/10 text-slate-300",
  "border-orange-400/60 bg-orange-400/10 text-orange-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
];

export function DiscoverView({
  projects, isLoading, adding, scoring,
  viewMode, onViewModeChange,
  generatingTop5, top5Progress, top5Total,
  userId,
  onAdd, onScore, onGetTop5,
}: Props) {
  const [selected, setSelected] = useState<DiscoverProject | null>(null);

  const top5 = [...projects]
    .filter((p) => p.eco_score !== null)
    .sort((a, b) => (b.eco_score ?? 0) - (a.eco_score ?? 0))
    .slice(0, 5);

  const displayed = viewMode === "top5" ? top5 : projects;

  return (
    <>
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
        {/* Header */}
        <div className="border-b border-[#2A2A3E] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Discover</p>
              <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Browse active startup projects on the platform</p>
            </div>
            <button
              type="button"
              disabled={generatingTop5}
              onClick={onGetTop5}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-400 hover:bg-violet-500/20 disabled:opacity-60 transition-colors shrink-0"
            >
              {generatingTop5 ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {top5Total > 0 ? `Scoring ${top5Progress}/${top5Total}…` : "Scoring…"}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  Get top 5 matches
                </>
              )}
            </button>
          </div>

          {/* View toggle — only when top 5 scores exist */}
          {top5.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex rounded-xl border border-[#2A2A3E] overflow-hidden text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onViewModeChange("all")}
                  className={`px-4 py-1.5 transition-colors ${viewMode === "all" ? "bg-violet-600 text-white" : "bg-[#12121A] text-[#8B8BA7] hover:bg-[#1A1A26]"}`}
                >
                  All projects
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("top5")}
                  className={`px-4 py-1.5 transition-colors ${viewMode === "top5" ? "bg-violet-600 text-white" : "bg-[#12121A] text-[#8B8BA7] hover:bg-[#1A1A26]"}`}
                >
                  Top 5 matches
                </button>
              </div>
              <p className="text-xs text-[#8B8BA7]">
                {viewMode === "top5" ? `${top5.length} scored` : `${projects.length} total`}
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse bg-[#0F0F17]" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#F4F4FF]">
              {viewMode === "top5" ? "No scored projects yet — click ‘Get top 5 matches’ to start." : "No projects to discover yet"}
            </p>
            <p className="mt-1 text-xs text-[#8B8BA7]">
              {viewMode === "all" && "When startups publish active projects, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A3E]">
            {displayed.map((p, idx) => (
              <div
                key={p.project_id}
                className="flex flex-wrap items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#0F0F17] transition-colors"
                onClick={() => setSelected(p)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(p)}
              >
                {viewMode === "top5" ? (
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${RANK_STYLE[idx] ?? RANK_STYLE[4]}`}>
                    {idx + 1}
                  </div>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E] text-xs font-bold text-[#F4F4FF]">
                    {p.owner_name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#F4F4FF]">{p.project_name}</p>
                    {p.stage && (
                      <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">
                        {p.stage}
                      </span>
                    )}
                    {p.sector && (
                      <span className="rounded-full border border-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">
                        {p.sector}
                      </span>
                    )}
                    {p.eco_score !== null && (
                      <span className={`text-xs font-bold tabular-nums ${scoreColor(p.eco_score)}`}>
                        {p.eco_score}% fit
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#8B8BA7]">{p.owner_name}</p>
                  {p.eco_summary && (
                    <p className="mt-1 line-clamp-1 text-xs text-[#6B6B8A] italic">{p.eco_summary}</p>
                  )}
                  {!p.eco_summary && p.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-[#4A4A6A]">{p.description}</p>
                  )}
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
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        </svg>
                        {p.eco_score !== null ? "Rescore" : "Score"}
                      </>
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
                    <span className="inline-flex items-center rounded-xl border border-[#2A2A3E] px-3 py-2 text-xs font-semibold text-[#8B8BA7]">
                      Invited
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={adding[p.owner_id]}
                      onClick={() => onAdd(p.owner_id)}
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
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ProjectModal
          project={selected}
          adding={adding}
          scoring={scoring}
          userId={userId}
          onAdd={onAdd}
          onScore={onScore}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
