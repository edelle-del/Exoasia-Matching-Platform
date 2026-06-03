"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUserProjects,
  fetchAllStartupProjects,
  type ProjectRecord,
} from "@/lib/app-data";
import { useAuth } from "../providers";

type MatchScore = {
  project_id: string;
  fit_score: number;
  summary: string | null;
  generated_at: string;
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
  asks_summary: string | null;
};

import PieScore from "@/components/PieScore";

const RANK_STYLE = [
  "border-amber-400/60 bg-amber-400/10 text-amber-300",
  "border-slate-400/60 bg-slate-400/10 text-slate-300",
  "border-orange-400/60 bg-orange-400/10 text-orange-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
];

function scoreColorClass(s: number) {
  return s >= 80
    ? "text-emerald-500"
    : s >= 65
      ? "text-indigo-500"
      : "text-amber-500";
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [loading, setLoading] = useState(true);

  // investor: scores
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map());
  const [scoring, setScoring] = useState<Set<string>>(new Set());

  // investor: top 5
  const [view, setView] = useState<"all" | "top5">("all");
  const [generatingTop5, setGeneratingTop5] = useState(false);
  const [top5Progress, setTop5Progress] = useState(0);
  const [top5Total, setTop5Total] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [founderProfiles, setFounderProfiles] = useState<
    Map<string, FounderProfile>
  >(new Map());
  const [loadingFounders, setLoadingFounders] = useState<Set<string>>(
    new Set(),
  );

  // startup: generating state
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generatedProjects, setGeneratedProjects] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("member_role, subscription_plan, subscription_ends_at")
      .eq("id", user.id)
      .single()
      .then(({ data: profile }) => {
        const role = profile?.member_role ?? null;
        setMemberRole(role);
        setHasActiveSub(
          !!profile?.subscription_plan &&
            (!profile.subscription_ends_at ||
              new Date(profile.subscription_ends_at) > new Date()),
        );

        const projectFetch =
          role === "investor"
            ? fetchAllStartupProjects(supabase)
            : fetchUserProjects(supabase, user.id!);

        return projectFetch;
      })
      .then((data) => {
        setProjects(data);
        setLoading(false);
      });
  }, [user?.id, supabase]);

  useEffect(() => {
    if (memberRole !== "investor" || projects.length === 0) return;
    fetch("/api/projects/my-match-scores")
      .then((r) => r.json())
      .then((data: { scores?: MatchScore[] }) => {
        const map = new Map<string, MatchScore>();
        (data.scores ?? []).forEach((s) => map.set(s.project_id, s));
        setScoreMap(map);
      });
  }, [memberRole, projects]);

  useEffect(() => {
    if (memberRole === "investor" || projects.length === 0) return;

    void (async () => {
      try {
        const results = await Promise.all(
          projects.map(async (p) => {
            try {
              const res = await fetch(`/api/projects/${p.id}/investor-matches`);
              if (!res.ok) return { id: p.id, has: false };
              const json = await res.json();
              const has =
                Array.isArray(json.matches) && json.matches.length > 0;
              return { id: p.id, has };
            } catch {
              return { id: p.id, has: false };
            }
          }),
        );

        const set = new Set<string>();
        results.forEach((r) => {
          if (r.has) set.add(r.id);
        });
        if (set.size > 0) setGeneratedProjects(set);
      } catch {
        // ignore
      }
    })();
  }, [memberRole, projects]);

  const handleScoreProject = useCallback(async (projectId: string) => {
    setScoring((prev) => new Set(prev).add(projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-match`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        score?: {
          project_id: string;
          fit_score: number;
          summary: string;
          generated_at?: string;
        };
      };
      if (data.score) {
        setScoreMap((prev) => {
          const next = new Map(prev);
          next.set(projectId, {
            project_id: projectId,
            fit_score: data.score!.fit_score,
            summary: data.score!.summary,
            generated_at: data.score!.generated_at ?? new Date().toISOString(),
          });
          return next;
        });
      }
    } finally {
      setScoring((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, []);

  const handleGetTop5 = useCallback(async () => {
    setGeneratingTop5(true);
    setTop5Progress(0);

    const unscored = projects.filter((p) => !scoreMap.has(p.id));
    setTop5Total(unscored.length);

    let done = 0;
    const newScores = new Map(scoreMap);

    await Promise.all(
      unscored.map(async (p) => {
        try {
          const res = await fetch(`/api/projects/${p.id}/generate-match`, {
            method: "POST",
          });
          const data = await res.json();
          if (data.score) {
            newScores.set(p.id, {
              project_id: p.id,
              fit_score: data.score.fit_score,
              summary: data.score.summary,
              generated_at: data.score.generated_at ?? new Date().toISOString(),
            });
          }
        } catch {
          // skip failed
        } finally {
          done += 1;
          setTop5Progress(done);
        }
      }),
    );

    setScoreMap(newScores);
    setGeneratingTop5(false);
    setView("top5");
  }, [projects, scoreMap]);

  const fetchFounderProfile = useCallback(
    async (ownerId: string) => {
      if (founderProfiles.has(ownerId) || loadingFounders.has(ownerId)) return;
      setLoadingFounders((prev) => new Set(prev).add(ownerId));
      try {
        const { data } = await supabase
          .from("profiles")
          .select(
            "id, full_name, business_name, sector, city, short_bio, role_title, years_in_operation, employee_band, asks_summary",
          )
          .eq("id", ownerId)
          .single();
        if (data) {
          setFounderProfiles((prev) => {
            const next = new Map(prev);
            next.set(ownerId, data as FounderProfile);
            return next;
          });
        }
      } finally {
        setLoadingFounders((prev) => {
          const next = new Set(prev);
          next.delete(ownerId);
          return next;
        });
      }
    },
    [supabase, founderProfiles, loadingFounders],
  );

  const handleToggleExpand = useCallback(
    (p: ProjectRecord) => {
      setExpandedId((prev) => (prev === p.id ? null : p.id));
      void fetchFounderProfile(p.owner_id);
    },
    [fetchFounderProfile],
  );

  const handleFindInvestors = useCallback(async (projectId: string) => {
    setGenerating((prev) => new Set(prev).add(projectId));
    try {
      await fetch(`/api/projects/${projectId}/generate-match`, {
        method: "POST",
      });
      setGeneratedProjects((prev) => new Set(prev).add(projectId));
    } finally {
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, []);

  const isInvestor = memberRole === "investor";

  const top5Projects = useMemo(() => {
    if (!isInvestor) return [];
    return [...projects]
      .filter((p) => scoreMap.has(p.id))
      .sort(
        (a, b) =>
          (scoreMap.get(b.id)?.fit_score ?? 0) -
          (scoreMap.get(a.id)?.fit_score ?? 0),
      )
      .slice(0, 5);
  }, [projects, scoreMap, isInvestor]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/dashboard"
                className="text-sm text-(--color-primary) hover:underline"
              >
                ← Back to dashboard
              </Link>
              <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
                Projects
              </h1>
              <p className="mt-2 text-sm text-(--color-body)">
                {isInvestor
                  ? "Browse all active founder projects. Score individual projects or get your top 5 AI matches."
                  : "Your active projects shared with potential investors."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isInvestor && !loading && (
                <>
                  {/* View toggle */}
                  {top5Projects.length > 0 && (
                    <div className="flex rounded-xl border border-(--color-hairline) overflow-hidden text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setView("all")}
                        className={`px-4 py-2 transition-colors ${
                          view === "all"
                            ? "bg-(--color-primary) text-white"
                            : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"
                        }`}
                      >
                        All projects
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("top5")}
                        className={`px-4 py-2 transition-colors ${
                          view === "top5"
                            ? "bg-(--color-primary) text-white"
                            : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"
                        }`}
                      >
                        Top 5 matches
                      </button>
                    </div>
                  )}
                  {/* Get Top 5 button */}
                  <button
                    type="button"
                    disabled={generatingTop5}
                    onClick={() => void handleGetTop5()}
                    className="inline-flex items-center gap-2 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/10 px-4 py-2 text-sm font-semibold text-(--color-primary) hover:bg-(--color-primary)/20 disabled:opacity-60 transition-colors"
                  >
                    {generatingTop5 ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        {top5Total > 0
                          ? `Scoring ${top5Progress}/${top5Total}…`
                          : "Scoring…"}
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        >
                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        </svg>
                        Get top 5 matches
                      </>
                    )}
                  </button>
                </>
              )}
              {!isInvestor && (
                <Link
                  href={
                    !loading && !hasActiveSub && projects.length >= 1
                      ? "/payments"
                      : "/projects/new"
                  }
                  className="gn-btn-primary"
                >
                  + New project
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-[5%] py-10">
        {loading ? (
          <div className="text-sm text-(--color-muted)">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8">
            {isInvestor ? (
              <p className="text-sm text-(--color-body)">
                No founder projects on the platform yet.
              </p>
            ) : (
              <>
                <p className="text-sm text-(--color-body)">No projects yet.</p>
                <Link
                  href="/projects/new"
                  className="mt-3 inline-block text-sm text-(--color-primary) hover:underline"
                >
                  Add your first project →
                </Link>
              </>
            )}
          </div>
        ) : isInvestor && view === "top5" ? (
          /* ── TOP 5 VIEW ──────────────────────────────────────────────────── */
          <div className="space-y-4">
            {top5Projects.length === 0 ? (
              <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8 text-center">
                <p className="text-sm text-(--color-body)">
                  Click "Get top 5 matches" to score and rank projects.
                </p>
              </div>
            ) : (
              top5Projects.map((p, idx) => {
                const score = scoreMap.get(p.id)!;
                const isExpanded = expandedId === p.id;
                const founder = founderProfiles.get(p.owner_id) ?? null;
                const founderLoading = loadingFounders.has(p.owner_id);
                let fundraisingStage: string | null = null;
                try {
                  const parsed = JSON.parse(founder?.asks_summary ?? "");
                  if (parsed?._v === 2)
                    fundraisingStage = parsed.fundraising_stage ?? null;
                } catch {
                  /* ignore */
                }

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* Card header — always visible, click to expand */}
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(p)}
                      className="w-full text-left p-5"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank badge */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${RANK_STYLE[idx] ?? RANK_STYLE[4]}`}
                        >
                          {idx + 1}
                        </div>

                        {/* Project name + tags */}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-(--color-ink) truncate">
                            {p.name}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {p.stage && (
                              <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)">
                                {p.stage}
                              </span>
                            )}
                            {p.sector && (
                              <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)">
                                {p.sector}
                              </span>
                            )}
                            {fundraisingStage && (
                              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500">
                                {fundraisingStage}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${scoreColorClass(score.fit_score)}`}
                            >
                              {score.fit_score}%
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-(--color-muted)">
                              Fit score
                            </p>
                          </div>
                          <PieScore score={score.fit_score} />
                          <svg
                            className={`h-4 w-4 text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* AI summary */}
                      {score.summary && (
                        <p className="mt-2 ml-12 text-xs text-(--color-primary) line-clamp-1">
                          {score.summary}
                        </p>
                      )}
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t border-(--color-hairline) bg-(--color-surface-soft) p-5 space-y-5">
                        {/* Project details */}
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
                            Project details
                          </p>
                          {p.description && (
                            <p className="text-sm text-(--color-body) leading-relaxed">
                              {p.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-4">
                            {p.stage && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                  Stage
                                </p>
                                <p className="text-sm font-medium text-(--color-ink)">
                                  {p.stage}
                                </p>
                              </div>
                            )}
                            {p.sector && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                  Sector
                                </p>
                                <p className="text-sm font-medium text-(--color-ink)">
                                  {p.sector}
                                </p>
                              </div>
                            )}
                            {fundraisingStage && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                  Fundraising stage
                                </p>
                                <p className="text-sm font-medium text-(--color-ink)">
                                  {fundraisingStage}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Founder profile */}
                        <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
                            Founder profile
                          </p>
                          {founderLoading ? (
                            <div className="h-16 animate-pulse rounded-lg bg-(--color-surface-soft)" />
                          ) : founder ? (
                            <div className="space-y-3">
                              <div>
                                <p className="font-semibold text-(--color-ink)">
                                  {founder.business_name ||
                                    founder.full_name ||
                                    "Unnamed founder"}
                                </p>
                                {founder.role_title && (
                                  <p className="text-xs text-(--color-muted)">
                                    {founder.role_title}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-(--color-muted)">
                                {founder.city && (
                                  <span>📍 {founder.city}</span>
                                )}
                                {founder.sector && (
                                  <span>🏭 {founder.sector}</span>
                                )}
                                {founder.years_in_operation && (
                                  <span>
                                    🕐 {founder.years_in_operation} in operation
                                  </span>
                                )}
                                {founder.employee_band && (
                                  <span>👥 {founder.employee_band} employees</span>
                                )}
                              </div>
                              {founder.short_bio && (
                                <p className="text-sm text-(--color-body) leading-relaxed">
                                  {founder.short_bio}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-(--color-muted)">
                              Founder details unavailable.
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/matches/breakdown?a=${user?.id ?? ""}&b=${p.owner_id}&score=${score.fit_score}`}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-500 hover:bg-indigo-500/25 transition-colors"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            View compatibility breakdown
                          </Link>
                          <Link
                            href={`/projects/${p.id}/investor`}
                            className="inline-flex items-center gap-2 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                          >
                            View full project →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── ALL PROJECTS VIEW ───────────────────────────────────────────── */
          <div className="space-y-4">
            {(() => {
              const scoredProjects = projects.filter((p) => scoreMap.has(p.id));
              const freeScoreIds = new Set(
                scoredProjects.slice(0, 3).map((p) => p.id),
              );
              const totalScored = scoredProjects.length;
              return projects.map((p) => {
                const existingScore = scoreMap.get(p.id);
                const isScoringThis = scoring.has(p.id);
                const isGeneratingThis = generating.has(p.id);
                const alreadyGenerated = generatedProjects.has(p.id);
                const scoreLocked =
                  !hasActiveSub && !!existingScore && !freeScoreIds.has(p.id);
                const cannotScoreMore =
                  !hasActiveSub && !existingScore && totalScored >= 3;

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6 transition-shadow hover:shadow-md"
                  >
                    <Link href={`/projects/${p.id}`} className="block">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold text-(--color-ink)">
                            {p.name}
                          </h2>
                          {p.description && (
                            <p className="mt-1 text-sm text-(--color-body) line-clamp-2">
                              {p.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {p.stage && (
                              <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                                {p.stage}
                              </span>
                            )}
                            {p.sector && (
                              <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                                {p.sector}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm text-(--color-muted)">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>

                    {/* ── Investor: match score row ── */}
                    {isInvestor && (
                      <div className="mt-4 flex items-center justify-between border-t border-(--color-hairline) pt-3">
                        <div className="flex items-center gap-3">
                          {existingScore ? (
                            <div
                              className={`flex items-center gap-3 ${scoreLocked ? "blur-sm pointer-events-none select-none" : ""}`}
                            >
                              <PieScore score={existingScore.fit_score} />
                              {existingScore.summary && (
                                <span className="text-xs font-medium text-(--color-primary) hidden sm:inline line-clamp-1">
                                  {existingScore.summary}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-(--color-muted)">
                              Not yet scored
                            </span>
                          )}
                          {scoreLocked && (
                            <span className="flex items-center gap-1 rounded-full border border-(--color-hairline) bg-(--color-canvas) px-2.5 py-1 text-xs font-semibold text-(--color-ink) shadow-sm">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="h-3 w-3 text-(--color-muted)"
                              >
                                <rect
                                  x="3"
                                  y="11"
                                  width="18"
                                  height="11"
                                  rx="2"
                                  ry="2"
                                />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Pro
                            </span>
                          )}
                        </div>
                        {cannotScoreMore ? (
                          <span className="rounded-xl border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-primary)">
                            Upgrade to score more
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isScoringThis}
                            onClick={() => handleScoreProject(p.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-3 py-1.5 text-xs font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                          >
                            {isScoringThis ? (
                              <>
                                <svg
                                  className="animate-spin h-3 w-3 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                                AI is scoring…
                              </>
                            ) : (
                              <>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                </svg>
                                {existingScore ? "Rescore" : "Score this project"}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Startup: find investors row ── */}
                    {!isInvestor && (
                      <div className="mt-4 flex items-center justify-between border-t border-(--color-hairline) pt-3">
                        <span
                          className={`text-xs font-medium ${alreadyGenerated ? "text-(--color-primary)" : "text-(--color-muted)"}`}
                        >
                          {alreadyGenerated
                            ? "Investor found"
                            : "Find investors that match this project"}
                        </span>
                        <div className="flex items-center gap-2">
                          {alreadyGenerated && (
                            <Link
                              href={`/projects/${p.id}#investor-matches`}
                              className="text-xs text-(--color-primary) hover:underline"
                            >
                              View matches
                            </Link>
                          )}
                          <button
                            type="button"
                            disabled={isGeneratingThis}
                            onClick={() => handleFindInvestors(p.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-3 py-1.5 text-xs font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                          >
                            {isGeneratingThis ? (
                              <>
                                <svg
                                  className="animate-spin h-3 w-3 shrink-0"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                                AI is matching…
                              </>
                            ) : (
                              <>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-3 w-3 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                </svg>
                                {alreadyGenerated
                                  ? "Regenerate"
                                  : "Find investors"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
