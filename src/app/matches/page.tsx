"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import { fetchUserMatches, fetchUserProjects } from "@/lib/app-data";
import type { MatchRecord, ProjectRecord } from "@/lib/app-data";

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
  return s >= 80 ? "text-emerald-400" : s >= 65 ? "text-indigo-400" : "text-amber-400";
}

function scoreBarClass(s: number) {
  return s >= 80 ? "bg-emerald-400" : s >= 65 ? "bg-indigo-400" : "bg-amber-400";
}

function statusStyle(status: string) {
  switch (status) {
    case "introduced": return { pill: "bg-violet-500/20 text-violet-300 border-violet-500/30", label: "Introduced" };
    case "accepted":   return { pill: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Accepted" };
    case "declined":   return { pill: "bg-[#2A2A3E] text-[#8B8BA7] border-[#2A2A3E]", label: "Declined" };
    default:           return { pill: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Pending" };
  }
}

function getProjectNextStep(project: ProjectRecord, scores: ProjectScore[]) {
  if (!project.description) {
    return { label: "Add a project description to attract investors", href: `/projects/${project.id}`, cta: "Edit project" };
  }
  if (scores.length === 0) {
    return { label: "Awaiting investor matches — check back soon", href: `/projects/${project.id}`, cta: "View project" };
  }
  return { label: `${scores.length} investor${scores.length > 1 ? "s" : ""} matched — request an intro to connect`, href: `/projects/${project.id}`, cta: "View project" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const supabase      = useMemo(() => createClient(), []);
  const { user }      = useAuth();
  const [isLoading,     setIsLoading]     = useState(true);
  const [memberRole,    setMemberRole]    = useState<string | null>(null);
  const [matches,       setMatches]       = useState<MatchRow[]>([]);
  const [projects,      setProjects]      = useState<(ProjectRecord & { owner_name?: string })[]>([]);
  const [projectScores, setProjectScores] = useState<ProjectScore[]>([]);
  const [reloadKey,        setReloadKey]        = useState(0);
  const [introRequests,    setIntroRequests]    = useState<Map<string, "requesting" | "done">>(new Map());
  const [respondingMatchId, setRespondingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);

    const load = async () => {
      const [rawMatches, { data: profile }] = await Promise.all([
        fetchUserMatches(supabase, user.id),
        supabase.from("profiles").select("member_role").eq("id", user.id).single(),
      ]);

      const role = profile?.member_role ?? null;
      setMemberRole(role);

      // Enrich matches with counterpart sector
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

      // Startup: projects + project match scores
      if (role === "startup") {
        const userProjects = await fetchUserProjects(supabase, user.id);
        setProjects(userProjects);

        if (userProjects.length > 0) {
          const { data: scores } = await supabase
            .from("project_match_scores")
            .select("id, project_id, investor_profile_id, fit_score, generated_at")
            .in("project_id", userProjects.map((p) => p.id))
            .order("fit_score", { ascending: false });

          const investorIds = [...new Set((scores ?? []).map((s) => s.investor_profile_id))];
          let nameMap = new Map<string, string>();
          if (investorIds.length > 0) {
            const { data: investors } = await supabase
              .from("profiles")
              .select("id, full_name, business_name")
              .in("id", investorIds);
            nameMap = new Map(
              (investors ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified investor"]),
            );
          }
          setProjectScores((scores ?? []).map((s) => ({
            ...s,
            investor_name: nameMap.get(s.investor_profile_id) ?? "Verified investor",
          })));
        }
      }

      // Investor: project match scores → projects + owner names
      if (role === "investor") {
        const { data: scores } = await supabase
          .from("project_match_scores")
          .select("id, project_id, investor_profile_id, fit_score, generated_at")
          .eq("investor_profile_id", user.id)
          .order("fit_score", { ascending: false });

        if (scores && scores.length > 0) {
          const projectIds = [...new Set(scores.map((s) => s.project_id))];
          const { data: projs } = await supabase
            .from("projects")
            .select("id, owner_id, name, description, stage, sector, is_active, created_at, updated_at")
            .in("id", projectIds);

          const ownerIds = [...new Set((projs ?? []).map((p) => p.owner_id))];
          let ownerNameMap = new Map<string, string>();
          if (ownerIds.length > 0) {
            const { data: owners } = await supabase
              .from("profiles")
              .select("id, full_name, business_name")
              .in("id", ownerIds);
            ownerNameMap = new Map(
              (owners ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified startup"]),
            );
          }
          setProjects((projs ?? []).map((p) => ({ ...p, owner_name: ownerNameMap.get(p.owner_id) })));
          setProjectScores(scores.map((s) => ({ ...s, investor_name: "" })));
        }
      }

      setIsLoading(false);
    };

    load().catch(() => setIsLoading(false));
  }, [supabase, user?.id, reloadKey]);

  const isStartup  = memberRole === "startup";
  const isInvestor = memberRole === "investor";

  const existingMatchPartnerIds = useMemo(
    () => new Set(matches.map((m) => m.member_a_id === user?.id ? m.member_b_id : m.member_a_id)),
    [matches, user?.id],
  );

  const handleRespond = async (match: MatchRow, decision: "accepted" | "declined") => {
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

  const handleRequestIntro = async (projectId: string, investorProfileId: string) => {
    const key = `${projectId}:${investorProfileId}`;
    setIntroRequests((prev) => new Map(prev).set(key, "requesting"));
    try {
      const res = await fetch("/api/matches/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, investor_profile_id: investorProfileId }),
      });
      if (res.ok) {
        setIntroRequests((prev) => new Map(prev).set(key, "done"));
        setReloadKey((k) => k + 1);
      } else {
        setIntroRequests((prev) => { const next = new Map(prev); next.delete(key); return next; });
      }
    } catch {
      setIntroRequests((prev) => { const next = new Map(prev); next.delete(key); return next; });
    }
  };

  const pendingMatches = matches.filter((m) => {
    const myStatus = m.member_a_id === user?.id ? m.member_a_status : m.member_b_status;
    return myStatus === "pending" && ["pending", "approved"].includes(m.status);
  });

  const activeMatches = matches.filter((m) =>
    ["accepted", "introduced"].includes(m.status),
  );

  const pendingCount = pendingMatches.length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F4F4FF]">

      {/* Header */}
      <section className="border-b border-[#2A2A3E] bg-[#12121A] px-[5%] py-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-[#F4F4FF]">Your Pipeline</h1>
          <p className="mt-1 text-sm text-[#8B8BA7]">
            {isLoading ? "Loading…" : (
              pendingCount > 0
                ? `${pendingCount} pending response${pendingCount > 1 ? "s" : ""} · ${matches.length} total intro${matches.length !== 1 ? "s" : ""}`
                : `${matches.length} intro${matches.length !== 1 ? "s" : ""} · all reviewed`
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-[5%] py-10">

        {/* Urgent banner */}
        {!isLoading && pendingCount > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-300">
                {pendingCount} intro{pendingCount > 1 ? "s" : ""} awaiting your response
              </p>
              <p className="mt-0.5 text-xs text-[#8B8BA7]">Respond to keep your pipeline moving</p>
            </div>
          </div>
        )}

        {/* ── STARTUP VIEW ──────────────────────────────────────────────────── */}
        {isStartup && (
          <>
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Your Projects</h2>
                <Link href="/projects" className="text-xs font-semibold text-indigo-400 hover:underline">
                  Manage projects →
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-44 animate-pulse rounded-2xl bg-[#12121A]" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] py-12 text-center">
                  <p className="text-sm font-semibold text-[#F4F4FF]">No active projects</p>
                  <p className="mt-1 text-xs text-[#8B8BA7]">Create a project to start getting matched with investors.</p>
                  <Link href="/projects" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
                    Create a project
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const scores   = projectScores.filter((s) => s.project_id === project.id);
                    const bestScore = scores.length > 0 ? scores[0].fit_score : null;
                    const nextStep  = getProjectNextStep(project, scores);

                    return (
                      <div key={project.id} className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-6">
                        {/* Project header */}
                        <div className="mb-5 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-[#F4F4FF]">{project.name}</h3>
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Active</span>
                              {project.stage && (
                                <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-[10px] font-bold text-[#8B8BA7]">{project.stage}</span>
                              )}
                            </div>
                            {project.sector && (
                              <p className="mt-1 text-xs text-[#8B8BA7]">{project.sector}</p>
                            )}
                          </div>
                          <Link href={`/projects/${project.id}`} className="shrink-0 text-xs font-semibold text-indigo-400 hover:underline">
                            View →
                          </Link>
                        </div>

                        {/* Stats */}
                        <div className="mb-5 grid grid-cols-3 gap-3">
                          <Stat label="Investor matches" value={String(scores.length)} />
                          <Stat label="Pending intros"   value={String(pendingCount)} accent={pendingCount > 0 ? "text-amber-400" : undefined} />
                          <Stat label="Best fit"         value={bestScore !== null ? `${bestScore}%` : "—"} accent={bestScore !== null ? scoreColorClass(bestScore) : "text-[#4A4A6A]"} />
                        </div>

                        {/* Investor score rows */}
                        {scores.length > 0 && (
                          <div className="mb-4 space-y-2">
                            {scores.map((score) => {
                              const requestKey = `${project.id}:${score.investor_profile_id}`;
                              const reqState   = introRequests.get(requestKey);
                              const isDone     = existingMatchPartnerIds.has(score.investor_profile_id) || reqState === "done";

                              return (
                                <div key={score.id} className="flex items-center gap-3 rounded-xl bg-[#1A1A26] px-4 py-2.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2A2A3E] text-[10px] font-bold text-[#F4F4FF]">
                                    {score.investor_name.charAt(0)}
                                  </div>
                                  <p className="flex-1 truncate text-sm text-[#F4F4FF]">{score.investor_name}</p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#2A2A3E]">
                                        <ScoreBar score={score.fit_score} barClass={scoreBarClass(score.fit_score)} />
                                      </div>
                                      <span className={`w-8 text-right text-xs font-bold ${scoreColorClass(score.fit_score)}`}>{score.fit_score}%</span>
                                    </div>
                                    {isDone ? (
                                      <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">Requested</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => void handleRequestIntro(project.id, score.investor_profile_id)}
                                        disabled={reqState === "requesting"}
                                        className="rounded-lg bg-indigo-600/30 px-2.5 py-1 text-[10px] font-bold text-indigo-300 transition hover:bg-indigo-600/50 disabled:opacity-50"
                                      >
                                        {reqState === "requesting" ? "Sending…" : "Request Intro"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Next step */}
                        <div className="flex items-center justify-between rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-4 py-3">
                          <p className="text-xs text-[#8B8BA7]">
                            <span className="font-bold text-[#C4C4D4]">Next: </span>{nextStep.label}
                          </p>
                          <Link href={nextStep.href} className="shrink-0 text-xs font-semibold text-indigo-400 hover:underline">
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
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Pending Responses</h2>
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
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Active Intros</h2>
                <MatchList matches={activeMatches} userId={user?.id ?? ""} />
              </section>
            )}
          </>
        )}

        {/* ── INVESTOR VIEW ─────────────────────────────────────────────────── */}
        {isInvestor && (
          <>
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Matched Projects</h2>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#12121A]" />
                  ))}
                </div>
              ) : projectScores.length === 0 ? (
                <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] py-12 text-center">
                  <p className="text-sm font-semibold text-[#F4F4FF]">No matched projects yet</p>
                  <p className="mt-1 text-xs text-[#8B8BA7]">When you're matched with a startup project, it'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectScores.map((score) => {
                    const project = projects.find((p) => p.id === score.project_id);
                    const correspondingMatch = matches.find((m) =>
                      (m.member_a_id === user?.id || m.member_b_id === user?.id) &&
                      project &&
                      (m.member_a_id === project.owner_id || m.member_b_id === project.owner_id),
                    );
                    const myMatchStatus = correspondingMatch
                      ? (correspondingMatch.member_a_id === user?.id
                        ? correspondingMatch.member_a_status
                        : correspondingMatch.member_b_status)
                      : null;

                    const requestKey = `${score.project_id}:${user?.id ?? ""}`;
                    const reqState   = introRequests.get(requestKey);
                    const isDone     = !!correspondingMatch || reqState === "done";

                    return (
                      <div key={score.id} className="flex items-center gap-4 rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-4 transition-all hover:border-indigo-500/40">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E] text-sm font-bold text-[#F4F4FF]">
                          {(project?.name ?? "P").charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#F4F4FF]">{project?.name ?? "Project"}</p>
                          <p className="text-xs text-[#8B8BA7]">
                            {[project?.owner_name, project?.sector, project?.stage].filter(Boolean).join(" · ") || "Startup project"}
                          </p>
                          {myMatchStatus && (
                            <p className="mt-0.5 text-[10px] text-[#8B8BA7]">
                              Your status:{" "}
                              <span className={
                                myMatchStatus === "accepted" ? "text-emerald-400"
                                  : myMatchStatus === "pending" ? "text-amber-400"
                                    : "text-[#8B8BA7]"
                              }>{myMatchStatus}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-lg font-bold ${scoreColorClass(score.fit_score)}`}>{score.fit_score}%</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B8BA7]">Fit score</p>
                          </div>
                          {correspondingMatch ? (
                            <Link
                              href={`/matches/${correspondingMatch.id}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 transition hover:bg-indigo-500/30"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          ) : isDone ? (
                            <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400">Sent</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRequestIntro(score.project_id, user?.id ?? "")}
                              disabled={reqState === "requesting"}
                              className="rounded-lg bg-indigo-600/30 px-2.5 py-1.5 text-[10px] font-bold text-indigo-300 transition hover:bg-indigo-600/50 disabled:opacity-50"
                            >
                              {reqState === "requesting" ? "Sending…" : "Express Interest"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {!isLoading && pendingCount > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Pending Responses</h2>
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
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Active Intros</h2>
                <MatchList matches={activeMatches} userId={user?.id ?? ""} />
              </section>
            )}
          </>
        )}

        {/* ── FALLBACK (ecosystem partner / unknown role) ────────────────────── */}
        {!isStartup && !isInvestor && (
          <section>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[.15em] text-[#8B8BA7]">Your Intros</h2>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#12121A]" />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] py-12 text-center">
                <p className="text-sm font-semibold text-[#F4F4FF]">No intros yet</p>
                <p className="mt-1 text-xs text-[#8B8BA7]">When you get matched with a counterpart, they'll appear here.</p>
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
  return <div ref={ref} className={`h-full w-0 rounded-full transition-all duration-500 ${barClass}`} />;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] p-3 text-center">
      <p className={`text-2xl font-bold ${accent ?? "text-[#F4F4FF]"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">{label}</p>
    </div>
  );
}

function MatchList({
  matches,
  userId,
  onRespond,
  respondingId,
}: {
  matches: MatchRow[];
  userId: string;
  onRespond?: (match: MatchRow, decision: "accepted" | "declined") => Promise<void>;
  respondingId?: string | null;
}) {
  return (
    <div className="space-y-2.5">
      {matches.map((m) => {
        const sc         = statusStyle(m.status);
        const score      = m.fit_score ?? 0;
        const name       = m.counterpart_name ?? "Verified member";
        const myStatus   = m.member_a_id === userId ? m.member_a_status : m.member_b_status;
        const canRespond = myStatus === "pending" && !!onRespond;
        const isResponding = respondingId === m.id;

        return (
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-xl border border-[#2A2A3E] bg-[#12121A] p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E] text-xs font-bold text-[#F4F4FF]">
              {name.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#F4F4FF]">{name}</p>
                {!canRespond && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.pill}`}>
                    {sc.label}
                  </span>
                )}
              </div>
              {m.counterpart_sector && (
                <p className="mb-1.5 text-[11px] text-[#8B8BA7]">{m.counterpart_sector}</p>
              )}
              {score > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#2A2A3E]">
                    <ScoreBar score={score} barClass={scoreBarClass(score)} />
                  </div>
                  <span className={`w-9 text-right text-xs font-bold ${scoreColorClass(score)}`}>{score}%</span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canRespond && (
                <>
                  <button
                    type="button"
                    disabled={isResponding}
                    onClick={() => void onRespond(m, "accepted")}
                    className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {isResponding ? "…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    disabled={isResponding}
                    onClick={() => void onRespond(m, "declined")}
                    className="rounded-lg bg-[#1A1A26] px-3 py-1.5 text-xs font-bold text-[#8B8BA7] transition hover:bg-[#2A2A3E] disabled:opacity-50"
                  >
                    Decline
                  </button>
                </>
              )}
              <Link
                href={`/matches/${m.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1A1A26] text-[#8B8BA7] transition hover:bg-[#2A2A3E] hover:text-indigo-400"
                aria-label="View compatibility details"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
