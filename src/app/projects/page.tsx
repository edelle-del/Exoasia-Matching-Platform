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

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "fa-score-excellent"
      : score >= 65
        ? "fa-score-strong"
        : score >= 50
          ? "fa-score-moderate"
          : "fa-score-low";
  return (
    <span
      className={`${cls} inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-bold`}
    >
      {score}/100
    </span>
  );
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [loading, setLoading] = useState(true);

  // investor-only: existing scores keyed by project_id
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map());
  const [scoring, setScoring] = useState<Set<string>>(new Set());

  // startup-only: generating state per project
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

  // Fetch existing investor scores after projects load
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

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
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
                ? "All active startup projects on the platform. Score projects to see fit."
                : "Your active projects shared with potential investors."}
            </p>
          </div>
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
      </section>

      <div className="mx-auto max-w-7xl space-y-4 px-[5%] py-10">
        {loading ? (
          <div className="text-sm text-(--color-muted)">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8">
            {isInvestor ? (
              <p className="text-sm text-(--color-body)">
                No startup projects on the platform yet.
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
        ) : (
          (() => {
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
                            <ScoreBadge score={existingScore.fit_score} />
                            {existingScore.summary && (
                              <span className="text-xs font-medium text-green-600 hidden sm:inline line-clamp-1">
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
                              <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              AI is scoring…
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden="true">
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
                        className={`text-xs font-medium ${alreadyGenerated ? "text-green-600" : "text-(--color-muted)"}`}
                      >
                        {alreadyGenerated
                          ? "Investor matches generated"
                          : "Find investors that match this project"}
                      </span>
                      <div className="flex items-center gap-2">
                        {alreadyGenerated && (
                          <Link
                            href={`/projects/${p.id}#investor-matches`}
                            className="text-xs text-(--color-primary) hover:underline"
                          >
                            View matches →
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
                              <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              AI is matching…
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden="true">
                                <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                              </svg>
                              {alreadyGenerated ? "Regenerate" : "Find investors"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
}
