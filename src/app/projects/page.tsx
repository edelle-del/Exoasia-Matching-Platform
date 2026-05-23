"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchUserProjects, fetchAllStartupProjects, type ProjectRecord } from "@/lib/app-data";
import { useAuth } from "../providers";

type MatchScore = {
  project_id: string;
  fit_score: number;
  summary: string | null;
  generated_at: string;
};

function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 75
      ? "bg-green-500 text-white ring-2 ring-green-300"
      : score >= 50
        ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200"
        : "bg-gray-200 text-gray-600 ring-1 ring-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${style}`}>
      {score}/100
    </span>
  );
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // investor-only: existing scores keyed by project_id
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map());
  const [scoring, setScoring] = useState<Set<string>>(new Set());

  // startup-only: generating state per project
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generatedProjects, setGeneratedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single()
      .then(({ data: profile }) => {
        const role = profile?.member_role ?? null;
        setMemberRole(role);

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
      const res = await fetch(`/api/projects/${projectId}/generate-match`, { method: "POST" });
      const data = (await res.json()) as {
        score?: { project_id: string; fit_score: number; summary: string; generated_at?: string };
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
      await fetch(`/api/projects/${projectId}/generate-match`, { method: "POST" });
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
            <Link href="/dashboard" className="text-sm text-(--color-primary) hover:underline">
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">Projects</h1>
            <p className="mt-2 text-sm text-(--color-body)">
              {isInvestor
                ? "All active startup projects on the platform. Score projects to see fit."
                : "Your active projects shared with potential investors."}
            </p>
          </div>
          {!isInvestor && (
            <Link href="/projects/new" className="gn-btn-primary">
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
              <p className="text-sm text-(--color-body)">No startup projects on the platform yet.</p>
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
          projects.map((p) => {
            const existingScore = scoreMap.get(p.id);
            const isScoringThis = scoring.has(p.id);
            const isGeneratingThis = generating.has(p.id);
            const alreadyGenerated = generatedProjects.has(p.id);

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6 transition-shadow hover:shadow-md"
              >
                <Link href={`/projects/${p.id}`} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-(--color-ink)">{p.name}</h2>
                      {p.description && (
                        <p className="mt-1 text-sm text-(--color-body) line-clamp-2">{p.description}</p>
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
                        <>
                          <ScoreBadge score={existingScore.fit_score} />
                          {existingScore.summary && (
                            <span className="text-xs font-medium text-green-600 hidden sm:inline line-clamp-1">
                              {existingScore.summary}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-(--color-muted)">Not yet scored</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isScoringThis}
                      onClick={() => handleScoreProject(p.id)}
                      className="rounded-xl border border-(--color-hairline) px-3 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-surface-soft) disabled:opacity-50 transition-colors"
                    >
                      {isScoringThis
                        ? "Scoring…"
                        : existingScore
                          ? "Rescore"
                          : "Score this project"}
                    </button>
                  </div>
                )}

                {/* ── Startup: find investors row ── */}
                {!isInvestor && (
                  <div className="mt-4 flex items-center justify-between border-t border-(--color-hairline) pt-3">
                    <span className={`text-xs font-medium ${alreadyGenerated ? "text-green-600" : "text-(--color-muted)"}`}>
                      {alreadyGenerated
                        ? "✓ Investor matches generated"
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
                        className="rounded-xl border border-(--color-hairline) px-3 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-surface-soft) disabled:opacity-50 transition-colors"
                      >
                        {isGeneratingThis ? "Generating…" : alreadyGenerated ? "Regenerate" : "Find investors"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
