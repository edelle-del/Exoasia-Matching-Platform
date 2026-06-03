"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../../providers";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
};

type FounderProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  city: string | null;
  short_bio: string | null;
  role_title: string | null;
  years_in_operation: string | null;
  employee_band: string | null;
  verification_status: string | null;
  linkedin_url: string | null;
  asks_summary: string | null;
};

type MatchScore = {
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
};

function parseV2(raw: string | null | undefined) {
  try {
    const p = JSON.parse(raw ?? "");
    if (p?._v === 2) return p;
  } catch { /* */ }
  return null;
}

function ScoreRing({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 80 ? "#10B981" : score >= 65 ? "#6366F1" : "#F59E0B";
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx={40} cy={40} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle
        cx={40} cy={40} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      <text x={40} y={45} textAnchor="middle" fontSize={14} fontWeight={700} fill={color} fontFamily="system-ui,sans-serif">
        {score}%
      </text>
    </svg>
  );
}

export default function InvestorProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [founder, setFounder] = useState<FounderProfile | null>(null);
  const [score, setScore] = useState<MatchScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !id) return;
    void (async () => {
      setIsLoading(true);

      const { data: proj } = await supabase
        .from("projects")
        .select("id, owner_id, name, description, stage, sector, is_active, created_at")
        .eq("id", id)
        .single();

      if (!proj) { setIsLoading(false); return; }
      setProject(proj as Project);

      const [{ data: founderData }, { data: scoreData }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, business_name, sector, city, short_bio, role_title, years_in_operation, employee_band, verification_status, linkedin_url, asks_summary",
          )
          .eq("id", proj.owner_id)
          .single(),
        supabase
          .from("project_match_scores")
          .select("fit_score, summary, rationale, generated_at")
          .eq("project_id", id)
          .eq("investor_profile_id", user.id)
          .maybeSingle(),
      ]);

      setFounder(founderData as FounderProfile ?? null);
      setScore(scoreData as MatchScore ?? null);
      setIsLoading(false);
    })();
  }, [supabase, user?.id, id]);

  const v2 = parseV2(founder?.asks_summary);
  const fundraisingStage = v2?.fundraising_stage ?? null;
  const productStage = v2?.product_stage ?? null;
  const targetRaiseMin = v2?.target_raise_min ?? null;
  const targetRaiseMax = v2?.target_raise_max ?? null;
  const targetRegions: string[] = v2?.target_regions ?? [];
  const targetIndustries: string[] = v2?.target_industries ?? [];
  const totalCofounders = v2?.total_cofounders ?? null;
  const hasTechFounder = v2?.has_technical_founder ?? null;

  const founderName =
    founder?.business_name || founder?.full_name || "Unnamed founder";

  const scoreColor =
    score && score.fit_score >= 80
      ? "text-emerald-600"
      : score && score.fit_score >= 65
        ? "text-indigo-600"
        : "text-amber-600";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
        <div className="mx-auto max-w-4xl space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-(--color-surface-soft)" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-base font-semibold text-(--color-ink)">Project not found</p>
          <Link href="/matches" className="mt-3 inline-block text-sm text-(--color-primary) hover:underline">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-4xl">
          <Link href="/matches" className="text-sm text-(--color-primary) hover:underline">
            ← Back to projects
          </Link>
          <div className="mt-4 flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-(--color-ink)">{project.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.stage && (
                  <span className="rounded-full bg-(--color-primary)/10 px-3 py-1 text-xs font-semibold text-(--color-primary)">
                    {project.stage}
                  </span>
                )}
                {project.sector && (
                  <span className="rounded-full bg-(--color-surface-soft) border border-(--color-hairline) px-3 py-1 text-xs font-semibold text-(--color-muted)">
                    {project.sector}
                  </span>
                )}
                {fundraisingStage && (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                    {fundraisingStage}
                  </span>
                )}
                {productStage && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {productStage}
                  </span>
                )}
              </div>
            </div>
            {score && (
              <div className="flex items-center gap-4 rounded-2xl border border-(--color-hairline) bg-(--color-canvas) px-5 py-4 shrink-0">
                <ScoreRing score={score.fit_score} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
                    Your fit score
                  </p>
                  <p className={`mt-0.5 text-lg font-bold ${scoreColor}`}>
                    {score.fit_score >= 80
                      ? "Strong match"
                      : score.fit_score >= 65
                        ? "Good match"
                        : "Developing match"}
                  </p>
                  <p className="text-xs text-(--color-muted)">
                    Scored {new Date(score.generated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-[5%] py-10">

        {/* AI summary */}
        {score?.summary && (
          <section className="rounded-2xl border border-(--color-primary)/20 bg-(--color-primary)/5 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-primary) mb-2">
              AI match summary
            </p>
            <p className="text-sm text-(--color-body) leading-relaxed">{score.summary}</p>
            {score.rationale && Object.keys(score.rationale).length > 0 && (
              <dl className="mt-3 grid gap-y-1 gap-x-4 sm:grid-cols-2 text-xs">
                {Object.entries(score.rationale).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="capitalize text-(--color-muted) shrink-0">{k.replace(/_/g, " ")}:</dt>
                    <dd className="text-(--color-body)">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {/* Project details */}
        <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-4">
            Project details
          </p>

          {project.description && (
            <p className="text-sm text-(--color-body) leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {project.stage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Stage</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">{project.stage}</p>
              </div>
            )}
            {project.sector && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Sector</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">{project.sector}</p>
              </div>
            )}
            {fundraisingStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Fundraising stage</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">{fundraisingStage}</p>
              </div>
            )}
            {productStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Product stage</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">{productStage}</p>
              </div>
            )}
            {(targetRaiseMin || targetRaiseMax) && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Target raise</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                  {targetRaiseMin && targetRaiseMax
                    ? `$${Number(targetRaiseMin).toLocaleString()} – $${Number(targetRaiseMax).toLocaleString()}`
                    : targetRaiseMin
                      ? `From $${Number(targetRaiseMin).toLocaleString()}`
                      : `Up to $${Number(targetRaiseMax).toLocaleString()}`}
                </p>
              </div>
            )}
            {targetRegions.length > 0 && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3 sm:col-span-2">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Target regions</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                  {targetRegions.join(", ")}
                </p>
              </div>
            )}
            {targetIndustries.length > 0 && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3 sm:col-span-2 lg:col-span-4">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Target industries</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {targetIndustries.map((ind) => (
                    <span key={ind} className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Founder profile */}
        <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-4">
            Founder profile
          </p>

          {founder ? (
            <div className="space-y-4">
              {/* Identity */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-(--color-primary)/10 text-base font-bold text-(--color-primary)">
                  {founderName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-(--color-ink)">{founderName}</h2>
                  {founder.role_title && (
                    <p className="text-sm text-(--color-muted)">{founder.role_title}</p>
                  )}
                  {founder.verification_status === "verified" && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Quick facts */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {founder.city && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Location</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">{founder.city}</p>
                  </div>
                )}
                {founder.sector && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Industry</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">{founder.sector}</p>
                  </div>
                )}
                {founder.years_in_operation && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Years operating</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">{founder.years_in_operation}</p>
                  </div>
                )}
                {founder.employee_band && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Team size</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">{founder.employee_band}</p>
                  </div>
                )}
                {totalCofounders && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Co-founders</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink)">{totalCofounders}</p>
                  </div>
                )}
                {hasTechFounder && (
                  <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                    <p className="text-[10px] font-bold uppercase text-(--color-muted)">Technical founder</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink) capitalize">{hasTechFounder}</p>
                  </div>
                )}
              </div>

              {/* Bio */}
              {founder.short_bio && (
                <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-4">
                  <p className="text-[10px] font-bold uppercase text-(--color-muted) mb-2">About</p>
                  <p className="text-sm text-(--color-body) leading-relaxed">{founder.short_bio}</p>
                </div>
              )}

              {/* LinkedIn */}
              {founder.linkedin_url && (
                <a
                  href={founder.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-(--color-primary) hover:underline"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  LinkedIn profile
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-(--color-muted)">Founder details unavailable.</p>
          )}
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-3">
          {founder && (
            <Link
              href={`/matches/breakdown?a=${user?.id ?? ""}&b=${project.owner_id}&score=${score?.fit_score ?? 70}`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-500/20 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View compatibility breakdown
            </Link>
          )}
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 rounded-xl border border-(--color-hairline) px-5 py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
          >
            ← Back to projects
          </Link>
        </section>
      </div>
    </div>
  );
}
