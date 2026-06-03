"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import { fetchUserMatches, fetchUserProjects } from "@/lib/app-data";
import type { MatchRecord, ProjectRecord } from "@/lib/app-data";
import PieScore from "@/components/PieScore";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchRow = MatchRecord & {
  counterpart_name: string | null;
  counterpart_sector: string | null;
};

type ProjectScore = {
  id: string;
  project_id: string;
  investor_profile_id: string;
  fit_score: number;
  generated_at: string;
  investor_name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColorClass(s: number) {
  if (s >= 75) return "text-(--color-primary)";
  if (s >= 50) return "text-amber-400";
  return "text-(--color-muted)";
}

function statusStyle(status: string) {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        pill: "rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400",
      };
    case "accepted":
      return {
        label: "Accepted",
        pill: "rounded-full bg-(--color-primary)/20 px-2 py-0.5 text-[10px] font-bold text-(--color-primary)",
      };
    case "introduced":
      return {
        label: "Introduced",
        pill: "rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-bold text-(--color-muted)",
      };
    case "declined":
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        pill: "rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-bold text-(--color-muted)",
      };
  }
}

function scoreBarClass(s: number) {
  if (s >= 75) return "bg-(--color-primary)";
  if (s >= 50) return "bg-amber-400";
  return "bg-(--color-hairline)";
}

function getProjectNextStep(project: ProjectRecord, scores: ProjectScore[]) {
  if (!project.description) {
    return {
      label: "Add a project description to attract investors",
      href: `/projects/${project.id}`,
      cta: "Edit project",
    };
  }
  if (scores.length === 0) {
    return {
      label: "Awaiting investor matches — check back soon",
      href: `/projects/${project.id}`,
      cta: "View project",
    };
  }
  return {
    label: `${scores.length} investor${scores.length > 1 ? "s" : ""} matched — request an intro to connect`,
    href: `/projects/${project.id}`,
    cta: "View project",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [projects, setProjects] = useState<
    (ProjectRecord & { owner_name?: string })[]
  >([]);
  const [projectScores, setProjectScores] = useState<ProjectScore[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [introRequests, setIntroRequests] = useState<
    Map<string, "requesting" | "done">
  >(new Map());
  const [respondingMatchId, setRespondingMatchId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);

    const load = async () => {
      const [rawMatches, { data: profile }] = await Promise.all([
        fetchUserMatches(supabase, user.id),
        supabase
          .from("profiles")
          .select("member_role, subscription_plan, subscription_ends_at")
          .eq("id", user.id)
          .single(),
      ]);

      const role = profile?.member_role ?? null;
      setMemberRole(role);
      setHasActiveSub(
        !!profile?.subscription_plan &&
          (!profile.subscription_ends_at ||
            new Date(profile.subscription_ends_at) > new Date()),
      );

      // Enrich matches with counterpart sector
      const cpIds = [
        ...new Set(
          rawMatches.map((m) =>
            m.member_a_id === user.id ? m.member_b_id : m.member_a_id,
          ),
        ),
      ];
      let sectorMap = new Map<string, string | null>();
      if (cpIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, sector")
          .in("id", cpIds);
        sectorMap = new Map((data ?? []).map((p) => [p.id, p.sector ?? null]));
      }
      setMatches(
        rawMatches.map((m) => {
          const cpId =
            m.member_a_id === user.id ? m.member_b_id : m.member_a_id;
          return { ...m, counterpart_sector: sectorMap.get(cpId) ?? null };
        }),
      );

      // Startup: projects + project match scores
      if (role === "startup") {
        const userProjects = await fetchUserProjects(supabase, user.id);
        setProjects(userProjects);

        if (userProjects.length > 0) {
          const { data: scores } = await supabase
            .from("project_match_scores")
            .select(
              "id, project_id, investor_profile_id, fit_score, generated_at",
            )
            .in(
              "project_id",
              userProjects.map((p) => p.id),
            )
            .order("fit_score", { ascending: false });

          const investorIds = [
            ...new Set((scores ?? []).map((s) => s.investor_profile_id)),
          ];
          let nameMap = new Map<string, string>();
          if (investorIds.length > 0) {
            const { data: investors } = await supabase
              .from("profiles")
              .select("id, full_name, business_name")
              .in("id", investorIds);
            nameMap = new Map(
              (investors ?? []).map((p) => [
                p.id,
                p.business_name || p.full_name || "Verified investor",
              ]),
            );
          }
          setProjectScores(
            (scores ?? []).map((s) => ({
              ...s,
              investor_name:
                nameMap.get(s.investor_profile_id) ?? "Verified investor",
            })),
          );
        }
      }

      // Investor: project match scores → projects + owner names
      if (role === "investor") {
        const { data: scores } = await supabase
          .from("project_match_scores")
          .select(
            "id, project_id, investor_profile_id, fit_score, generated_at",
          )
          .eq("investor_profile_id", user.id)
          .order("fit_score", { ascending: false });

        if (scores && scores.length > 0) {
          const projectIds = [...new Set(scores.map((s) => s.project_id))];
          const { data: projs } = await supabase
            .from("projects")
            .select(
              "id, owner_id, name, description, stage, sector, is_active, created_at, updated_at",
            )
            .in("id", projectIds);

          const ownerIds = [...new Set((projs ?? []).map((p) => p.owner_id))];
          let ownerNameMap = new Map<string, string>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase
              .from("profiles")
              .select("id, full_name, business_name")
              .in("id", ownerIds);
            ownerNameMap = new Map(
              (owners ?? []).map((p) => [
                p.id,
                p.business_name || p.full_name || "Verified startup",
              ]),
            );
          }
          setProjects(
            (projs ?? []).map((p) => ({
              ...p,
              owner_name: ownerNameMap.get(p.owner_id),
            })),
          );
          setProjectScores(scores.map((s) => ({ ...s, investor_name: "" })));
        }
      }

      setIsLoading(false);
    };

    load().catch(() => setIsLoading(false));
  }, [supabase, user?.id, reloadKey]);

  const isStartup = memberRole === "startup";
  const isInvestor = memberRole === "investor";

  const existingMatchPartnerIds = useMemo(
    () =>
      new Set(
        matches.map((m) =>
          m.member_a_id === user?.id ? m.member_b_id : m.member_a_id,
        ),
      ),
    [matches, user?.id],
  );

  const handleRespond = async (
    match: MatchRow,
    decision: "accepted" | "declined",
  ) => {
    if (!user?.id) return;
    setRespondingMatchId(match.id);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setReloadKey((k) => k + 1);
      }
    } finally {
      setRespondingMatchId(null);
    }
  };

  const handleRequestIntro = async (
    projectId: string,
    investorProfileId: string,
  ) => {
    const key = `${projectId}:${investorProfileId}`;
    setIntroRequests((prev) => new Map(prev).set(key, "requesting"));
    try {
      const res = await fetch("/api/matches/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          investor_profile_id: investorProfileId,
        }),
      });
      if (res.ok) {
        setIntroRequests((prev) => new Map(prev).set(key, "done"));
        setReloadKey((k) => k + 1);
      } else {
        setIntroRequests((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    } catch {
      setIntroRequests((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const pendingMatches = matches.filter((m) => {
    const myStatus =
      m.member_a_id === user?.id ? m.member_a_status : m.member_b_status;
    return myStatus === "pending" && ["pending", "approved"].includes(m.status);
  });

  const activeMatches = matches.filter((m) =>
    ["accepted", "introduced"].includes(m.status),
  );

  const pendingCount = pendingMatches.length;

  return (
    <div className="min-h-screen bg-(--color-canvas) text-(--color-ink)">
      {/* Header */}
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-(--color-ink)">
            Your Pipeline
          </h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            {isLoading
              ? "Loading…"
              : pendingCount > 0
                ? `${pendingCount} pending response${pendingCount > 1 ? "s" : ""} · ${matches.length} total intro${matches.length !== 1 ? "s" : ""}`
                : `${matches.length} intro${matches.length !== 1 ? "s" : ""} · all reviewed`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-[5%] py-10">
        {/* Urgent banner */}
        {!isLoading && pendingCount > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-300">
                {pendingCount} intro{pendingCount > 1 ? "s" : ""} awaiting your
                response
              </p>
              <p className="mt-0.5 text-xs text-(--color-muted)">
                Respond to keep your pipeline moving
              </p>
            </div>
          </div>
        )}

        {/* ── STARTUP VIEW ──────────────────────────────────────────────────── */}
        {isStartup && (
          <>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Your Projects
                </h2>
                <Link
                  href="/projects"
                  className="text-xs font-semibold text-(--color-primary) hover:underline"
                >
                  Manage projects →
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={i}
                      className="h-44 animate-pulse rounded-2xl bg-(--color-surface-soft)"
                    />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) py-12 text-center">
                  <p className="text-sm font-semibold text-(--color-ink)">
                    No active projects
                  </p>
                  <p className="mt-1 text-xs text-(--color-muted)">
                    Create a project to start getting matched with investors.
                  </p>
                  <Link
                    href="/projects"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-95"
                  >
                    Create a project
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const scores = projectScores.filter(
                      (s) => s.project_id === project.id,
                    );
                    const bestScore =
                      scores.length > 0 ? scores[0].fit_score : null;
                    const nextStep = getProjectNextStep(project, scores);

                    return (
                      <div
                        key={project.id}
                        className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6"
                      >
                        {/* Project header */}
                        <div className="mb-5 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-(--color-ink)">
                                {project.name}
                              </h3>
                              <span className="rounded-full bg-(--color-primary)/20 px-2 py-0.5 text-[10px] font-bold text-(--color-primary)">
                                Active
                              </span>
                              {project.stage && (
                                <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-bold text-(--color-muted)">
                                  {project.stage}
                                </span>
                              )}
                            </div>
                            {project.sector && (
                              <p className="mt-1 text-xs text-(--color-muted)">
                                {project.sector}
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/projects/${project.id}`}
                            className="shrink-0 text-xs font-semibold text-(--color-primary) hover:underline"
                          >
                            View →
                          </Link>
                        </div>

                        {/* Stats */}
                        <div className="mb-5 grid grid-cols-3 gap-3">
                          <Stat
                            label="Investor matches"
                            value={String(scores.length)}
                          />
                          <Stat
                            label="Pending intros"
                            value={String(pendingCount)}
                            accent={
                              pendingCount > 0 ? "text-amber-400" : undefined
                            }
                          />
                          <Stat
                            label="Best fit"
                            value={bestScore !== null ? `${bestScore}%` : "—"}
                            accent={
                              bestScore !== null
                                ? scoreColorClass(bestScore)
                                : "text-(--color-muted)"
                            }
                          />
                        </div>

                        {/* Investor score rows */}
                        {scores.length > 0 && (
                          <div className="mb-4 space-y-2">
                            {scores.map((score, scoreIdx) => {
                              const scoreLocked = !hasActiveSub && scoreIdx >= 2;
                              const requestKey = `${project.id}:${score.investor_profile_id}`;
                              const reqState = introRequests.get(requestKey);
                              const isDone =
                                existingMatchPartnerIds.has(
                                  score.investor_profile_id,
                                ) || reqState === "done";

                              return (
                                <div key={score.id} className="relative">
                                  <div
                                    className={`flex items-center gap-3 rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-4 py-2.5 ${scoreLocked ? "blur-sm pointer-events-none select-none" : ""}`}
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-surface-soft) text-[10px] font-bold text-(--color-ink)">
                                      {scoreLocked ? "?" : score.investor_name.charAt(0)}
                                    </div>
                                    <p className="flex-1 truncate text-sm text-(--color-ink)">
                                      {scoreLocked ? "Upgrade to unlock" : score.investor_name}
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 flex items-center justify-center">
                                        <PieScore
                                          score={score.fit_score}
                                          size={44}
                                          large
                                        />
                                      </div>
                                      <Link
                                        href={`/matches/breakdown?a=${user?.id ?? ""}&b=${score.investor_profile_id}&score=${score.fit_score}`}
                                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-(--color-surface-soft) text-(--color-muted) transition hover:bg-(--color-hairline) hover:text-(--color-primary)"
                                        aria-label="View compatibility breakdown"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                      </Link>
                                      {isDone ? (
                                        <span className="rounded-lg bg-(--color-primary)/20 px-2.5 py-1 text-[10px] font-bold text-(--color-primary)">
                                          Requested
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleRequestIntro(
                                              project.id,
                                              score.investor_profile_id,
                                            )
                                          }
                                          disabled={reqState === "requesting"}
                                          className="rounded-lg bg-(--color-primary)/30 px-2.5 py-1 text-[10px] font-bold text-(--color-primary) transition hover:bg-(--color-primary)/50 disabled:opacity-50"
                                        >
                                          {reqState === "requesting"
                                            ? "Sending…"
                                            : "Request Intro"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {scoreLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                                      <span className="flex items-center gap-1.5 rounded-full border border-(--color-hairline) bg-(--color-canvas) px-3 py-1 text-xs font-semibold text-(--color-ink) shadow-sm">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-(--color-muted)">
                                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        Upgrade to unlock
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {!hasActiveSub && scores.length > 2 && (
                              <p className="pt-1 text-center text-xs text-(--color-muted)">
                                {scores.length - 2} more match{scores.length - 2 !== 1 ? "es" : ""} hidden.{" "}
                                <Link href="/payments" className="font-semibold text-(--color-primary) hover:underline">
                                  Upgrade to unlock
                                </Link>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Next step */}
                        <div className="flex items-center justify-between rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-4 py-3">
                          <p className="text-xs text-(--color-muted)">
                            <span className="font-bold text-(--color-ink)">
                              Next:{" "}
                            </span>
                            {nextStep.label}
                          </p>
                          <Link
                            href={nextStep.href}
                            className="shrink-0 text-xs font-semibold text-(--color-primary) hover:underline"
                          >
                            {nextStep.cta} →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {!isLoading && pendingCount > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Pending Responses
                </h2>
                <MatchList
                  matches={pendingMatches}
                  userId={user?.id ?? ""}
                  onRespond={handleRespond}
                  respondingId={respondingMatchId}
                  subscriptionActive={hasActiveSub}
                />
              </section>
            )}

            {!isLoading && activeMatches.length > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Active Intros
                </h2>
                <MatchList
                  matches={activeMatches}
                  userId={user?.id ?? ""}
                  subscriptionActive={hasActiveSub}
                />
              </section>
            )}
          </>
        )}

        {/* ── INVESTOR VIEW ─────────────────────────────────────────────────── */}
        {isInvestor && (
          <>
            <section>
              <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Deal flow
                </p>
                <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                  Browse &amp; score founder projects
                </h2>
                <p className="mt-1 text-sm text-(--color-body)">
                  Score individual projects or run AI matching to get your
                  personalised top 5 ranked by fit.
                </p>
                <Link
                  href="/projects"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  Get top 5 matches
                </Link>
              </div>
            </section>

            {!isLoading && pendingCount > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Pending Responses
                </h2>
                <MatchList
                  matches={pendingMatches}
                  userId={user?.id ?? ""}
                  onRespond={handleRespond}
                  respondingId={respondingMatchId}
                />
              </section>
            )}

            {!isLoading && activeMatches.length > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
                  Active Intros
                </h2>
                <MatchList matches={activeMatches} userId={user?.id ?? ""} />
              </section>
            )}
          </>
        )}

        {/* ── FALLBACK (ecosystem partner / unknown role) ────────────────────── */}
        {!isStartup && !isInvestor && (
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-(--color-muted)">
              Your Intros
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-(--color-surface-soft)"
                  />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) py-12 text-center">
                <p className="text-sm font-semibold text-(--color-ink)">
                  No intros yet
                </p>
                <p className="mt-1 text-xs text-(--color-muted)">
                  When you get matched with a counterpart, they'll appear here.
                </p>
              </div>
            ) : (
              <MatchList
                matches={matches}
                userId={user?.id ?? ""}
                onRespond={handleRespond}
                respondingId={respondingMatchId}
              />
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score, barClass }: { score: number; barClass: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.width = `${score}%`;
  }, [score]);
  return (
    <div
      ref={ref}
      className={`h-full w-0 rounded-full transition-all duration-500 ${barClass}`}
    />
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3 text-center">
      <p className={`text-2xl font-bold ${accent ?? "text-(--color-ink)"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
        {label}
      </p>
    </div>
  );
}

function MatchList({
  matches,
  userId,
  onRespond,
  respondingId,
  subscriptionActive = true,
}: {
  matches: MatchRow[];
  userId: string;
  onRespond?: (
    match: MatchRow,
    decision: "accepted" | "declined",
  ) => Promise<void>;
  respondingId?: string | null;
  subscriptionActive?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {matches.map((m) => {
        const sc = statusStyle(m.status);
        const score = m.fit_score ?? 0;
        const name = m.counterpart_name ?? "Verified member";
        const myStatus =
          m.member_a_id === userId ? m.member_a_status : m.member_b_status;
        const canRespond = myStatus === "pending" && !!onRespond;
        const isResponding = respondingId === m.id;

        return (
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-hairline) text-xs font-bold text-(--color-ink)">
              {!subscriptionActive ? "U" : name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-(--color-ink)">
                  {subscriptionActive ? name : "Upgrade to unlock"}
                </p>
                {!canRespond && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.pill}`}
                  >
                    {sc.label}
                  </span>
                )}
              </div>
              {subscriptionActive && m.counterpart_sector && (
                <p className="mb-1.5 text-[11px] text-(--color-muted)">
                  {m.counterpart_sector}
                </p>
              )}
              {subscriptionActive && score > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-hairline)">
                    <ScoreBar score={score} barClass={scoreBarClass(score)} />
                  </div>
                  <span
                    className={`w-9 text-right text-xs font-bold ${scoreColorClass(score)}`}
                  >
                    {score}%
                  </span>
                </div>
              ) : !subscriptionActive ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-hairline)" />
                  <span className="w-9 text-right text-xs font-bold text-(--color-muted)">
                    Match limit reached
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canRespond && (
                <>
                  <button
                    type="button"
                    disabled={isResponding}
                    onClick={() => void onRespond(m, "accepted")}
                    className="rounded-lg bg-(--color-primary)/20 px-3 py-1.5 text-xs font-bold text-(--color-primary) transition hover:bg-(--color-primary)/30 disabled:opacity-50"
                  >
                    {isResponding ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    disabled={isResponding}
                    onClick={() => void onRespond(m, "declined")}
                    className="rounded-lg bg-(--color-surface-soft) px-3 py-1.5 text-xs font-bold text-(--color-muted) transition hover:bg-(--color-hairline) disabled:opacity-50"
                  >
                    Decline
                  </button>
                </>
              )}
              <Link
                href={`/matches/${m.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-(--color-surface-soft) text-(--color-muted) transition hover:bg-(--color-hairline) hover:text-(--color-primary)"
                aria-label="View compatibility details"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
