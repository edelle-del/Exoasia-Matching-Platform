"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUserMatches,
  fetchUserProjects,
  fetchAllStartupProjects,
  type MatchRecord,
  type ProjectRecord,
} from "@/lib/app-data";
import PieScore from "@/components/PieScore";
import type { PortfolioInvite } from "@/app/api/ecosystem/portfolio-invites/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchRow = MatchRecord & {
  counterpart_name: string | null;
  counterpart_sector: string | null;
  is_locked?: boolean;
};

type ProjectScore = {
  id: string;
  project_id: string;
  investor_profile_id: string;
  fit_score: number;
  generated_at: string;
  investor_name: string;
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_STYLE = [
  "border-amber-400/60 bg-amber-400/10 text-amber-300",
  "border-slate-400/60 bg-slate-400/10 text-slate-300",
  "border-orange-400/60 bg-orange-400/10 text-orange-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
  "border-indigo-400/40 bg-indigo-400/8 text-indigo-300",
];

function scoreColorClass(s: number) {
  if (s >= 75) return "text-(--color-primary)";
  if (s >= 50) return "text-amber-400";
  return "text-(--color-muted)";
}

function scoreBarClass(s: number) {
  if (s >= 75) return "bg-(--color-primary)";
  if (s >= 50) return "bg-amber-400";
  return "bg-(--color-hairline)";
}

function statusStyle(status: string) {
  switch (status) {
    case "pending":
      return { label: "Pending", pill: "bg-amber-500/20 text-amber-400" };
    case "accepted":
      return { label: "Accepted", pill: "bg-(--color-primary)/20 text-(--color-primary)" };
    case "introduced":
      return { label: "Introduced", pill: "bg-(--color-surface-soft) text-(--color-muted)" };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        pill: "bg-(--color-surface-soft) text-(--color-muted)",
      };
  }
}

function getProjectNextStep(project: ProjectRecord, scores: ProjectScore[]) {
  if (!project.description)
    return { label: "Add a project description to attract investors", href: `/projects/${project.id}`, cta: "Edit project" };
  if (scores.length === 0)
    return { label: "Awaiting investor matches — check back soon", href: `/projects/${project.id}`, cta: "View project" };
  return {
    label: `${scores.length} investor${scores.length > 1 ? "s" : ""} matched — request an intro to connect`,
    href: `/projects/${project.id}`,
    cta: "View project",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);


  // Matches state
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [respondingMatchId, setRespondingMatchId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [introRequests, setIntroRequests] = useState<Map<string, "requesting" | "done">>(new Map());
  const [portfolioInvites, setPortfolioInvites] = useState<PortfolioInvite[]>([]);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null);

  // Projects state (shared startup + investor)
  const [projects, setProjects] = useState<(ProjectRecord & { owner_name?: string })[]>([]);
  const [scoring, setScoring] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  // Startup-specific
  const [projectScores, setProjectScores] = useState<ProjectScore[]>([]);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generatedProjects, setGeneratedProjects] = useState<Set<string>>(new Set());

  // Investor-specific
  const [scoreMap, setScoreMap] = useState<Map<string, MatchScore>>(new Map());
  const [activeTab, setActiveTab] = useState<"my_matches" | "create_matches">("my_matches");
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [founderProfiles, setFounderProfiles] = useState<Map<string, FounderProfile>>(new Map());
  const [loadingFounders, setLoadingFounders] = useState<Set<string>>(new Set());
  const [selectedFounder, setSelectedFounder] = useState<FounderProfile | null>(null);
  const [generatedMatches, setGeneratedMatches] = useState<any[]>([]);

  // ── Data loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);

    const load = async () => {
      const [matchesRes, { data: profile }] = await Promise.all([
        fetch("/api/matches/my-matches").then(r => r.json()),
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
        (!profile.subscription_ends_at || new Date(profile.subscription_ends_at) > new Date()),
      );

      setMatches(matchesRes.matches || []);

      // ── Collab invites (all roles) ───────────────────────────────────────────
      const invitesRes = await fetch("/api/ecosystem/portfolio-invites").then((r) => r.json());
      setPortfolioInvites((invitesRes as { invites?: PortfolioInvite[] }).invites ?? []);

      // ── Startup ──────────────────────────────────────────────────────────────
      if (role === "startup") {
        const userProjects = await fetchUserProjects(supabase, user.id, true);
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
          setProjectScores(
            (scores ?? []).map((s) => ({ ...s, investor_name: nameMap.get(s.investor_profile_id) ?? "Verified investor" })),
          );

          // Check which projects already have generated matches
          const results = await Promise.all(
            userProjects.map(async (p) => {
              try {
                const res = await fetch(`/api/projects/${p.id}/investor-matches`);
                if (!res.ok) return { id: p.id, has: false };
                const json = await res.json();
                return { id: p.id, has: Array.isArray(json.matches) && json.matches.length > 0 };
              } catch {
                return { id: p.id, has: false };
              }
            }),
          );
          const generated = new Set<string>();
          results.forEach((r) => { if (r.has) generated.add(r.id); });
          setGeneratedProjects(generated);
        }
      }

      // ── Investor ─────────────────────────────────────────────────────────────
      if (role === "investor") {
        const allProjects = await fetchAllStartupProjects(supabase);
        setProjects(allProjects);

        if (allProjects.length > 0) {
          const res = await fetch("/api/projects/my-match-scores");
          const data = (await res.json()) as { scores?: MatchScore[] };
          const map = new Map<string, MatchScore>();
          (data.scores ?? []).forEach((s) => map.set(s.project_id, s));
          setScoreMap(map);
        }
      }

      // Fetch generated matches globally (for "Create Matches" tab)
      try {
        const genRes = await fetch("/api/matches/generated");
        if (genRes.ok) {
          const genData = await genRes.json();
          setGeneratedMatches(genData.matches || []);
        }
      } catch (e) {
        console.error("Failed to fetch generated matches", e);
      }

      setIsLoading(false);
    };

    load().catch(() => setIsLoading(false));
  }, [supabase, user?.id, reloadKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRespond = async (match: MatchRow, decision: "accepted" | "declined") => {
    if (!user?.id) return;
    setRespondingMatchId(match.id);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) setReloadKey((k) => k + 1);
    } finally {
      setRespondingMatchId(null);
    }
  };

  const handleUnlockMatch = async (match: MatchRow) => {
    if (!user?.id) return;
    setUnlockingId(match.id);
    try {
      const res = await fetch(`/api/matches/${match.id}/unlock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          alert(`Insufficient credits: needed ${data.required}, have ${data.balance}`);
        } else {
          alert(`Error: ${data.error}`);
        }
        return;
      }
      setReloadKey(k => k + 1);
    } finally {
      setUnlockingId(null);
    }
  };

  const handlePortfolioInviteRespond = async (inviteId: string, decision: "accepted" | "declined") => {
    setRespondingInviteId(inviteId);
    try {
      const res = await fetch(`/api/ecosystem/portfolio-invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) setReloadKey((k) => k + 1);
    } finally {
      setRespondingInviteId(null);
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

  const handleFindInvestors = useCallback(async (projectId: string) => {
    setGenerating((prev) => new Set(prev).add(projectId));
    try {
      await fetch(`/api/projects/${projectId}/generate-match`, { method: "POST" });
      setGeneratedProjects((prev) => new Set(prev).add(projectId));

      // Reload scores for this project so names appear immediately
      const { data: scores } = await supabase
        .from("project_match_scores")
        .select("id, project_id, investor_profile_id, fit_score, generated_at")
        .eq("project_id", projectId)
        .order("fit_score", { ascending: false });

      if (scores && scores.length > 0) {
        const investorIds = [...new Set(scores.map((s) => s.investor_profile_id))];
        const { data: investors } = await supabase
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", investorIds);
        const nameMap = new Map(
          (investors ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified investor"]),
        );
        const enriched = scores.map((s) => ({
          ...s,
          investor_name: nameMap.get(s.investor_profile_id) ?? "Verified investor",
        }));
        setProjectScores((prev) => [
          ...prev.filter((s) => s.project_id !== projectId),
          ...enriched,
        ]);

      }
    } finally {
      setGenerating((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
    }
  }, [supabase]);

  const handleRestoreProject = async (projectId: string) => {
    if (!hasActiveSub && activeProjects.length >= 1) {
      window.alert("Free tier allows only 1 active project. Please archive your current active project before restoring this one.");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (res.ok) setReloadKey((k) => k + 1);
    } catch { /* ignore */ }
  };

  const handleScoreProject = useCallback(async (projectId: string) => {
    setScoring((prev) => new Set(prev).add(projectId));
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-match`, { method: "POST" });
      const data = (await res.json()) as { score?: { project_id: string; fit_score: number; summary: string; generated_at?: string } };
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
      setScoring((prev) => { const next = new Set(prev); next.delete(projectId); return next; });
    }
  }, []);

  const handleBulkSweep = useCallback(async () => {
    setIsSweeping(true);
    setSweepStatus("Initializing AI Sweep...");
    try {
      // Pass the user.id so the endpoint knows who is sweeping if token isn't passed perfectly
      const res = await fetch("/api/matches/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          alert(`Insufficient credits: needed ${data.required}, have ${data.balance}. Purchase a bundle to unlock AI matching.`);
        } else {
          alert(`Error: ${data.error}`);
        }
        setIsSweeping(false);
        setSweepStatus(null);
        return;
      }
      setSweepStatus("Sweeping database... (this may take a while)");

      const jobId = data.jobId;
      if (!jobId) {
        setIsSweeping(false);
        setSweepStatus(null);
        alert("AI Matching Sweep Started but no job ID returned.");
        setReloadKey(k => k + 1);
        setActiveTab("my_matches");
        return;
      }

      // Poll the job status
      const poll = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          const pollData = await pollRes.json();
          if (pollData.status === "completed") {
            clearInterval(poll);
            setIsSweeping(false);
            setSweepStatus("AI Matching Sweep Complete! Your matches have been updated.");
            setReloadKey(k => k + 1);
            // Hide the success message after 5 seconds
            setTimeout(() => setSweepStatus(null), 5000);
          } else if (pollData.status === "failed") {
            clearInterval(poll);
            setIsSweeping(false);
            setSweepStatus(`Sweep failed: ${pollData.error}`);
          }
        } catch (e) {
          // keep polling if transient error
        }
      }, 2000);

    } catch (e: any) {
      alert("Sweep failed: " + e.message);
      setIsSweeping(false);
      setSweepStatus(null);
    }
  }, [user?.id]);

  const fetchFounderProfile = useCallback(
    async (ownerId: string) => {
      if (founderProfiles.has(ownerId) || loadingFounders.has(ownerId)) return;
      setLoadingFounders((prev) => new Set(prev).add(ownerId));
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, business_name, sector, city, short_bio, role_title, years_in_operation, employee_band, asks_summary")
          .eq("id", ownerId)
          .single();
        if (data) setFounderProfiles((prev) => { const next = new Map(prev); next.set(ownerId, data as FounderProfile); return next; });
      } finally {
        setLoadingFounders((prev) => { const next = new Set(prev); next.delete(ownerId); return next; });
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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isStartup = memberRole === "startup";
  const isInvestor = memberRole === "investor";
  const isEcosystemPartner = memberRole === "ecosystem_partner";

  // Maps partner ID → { status, myStatus } so buttons can show accurate state
  const matchStatusByPartnerId = useMemo(
    () => new Map(matches.map((m) => {
      const partnerId = m.member_a_id === user?.id ? m.member_b_id : m.member_a_id;
      const myStatus = m.member_a_id === user?.id ? m.member_a_status : m.member_b_status;
      return [partnerId, { status: m.status, myStatus }];
    })),
    [matches, user?.id],
  );

  const pendingMatches = matches.filter((m) => {
    const myStatus = m.member_a_id === user?.id ? m.member_a_status : m.member_b_status;
    return myStatus === "pending" && ["pending", "approved"].includes(m.status);
  });
  const pendingCount = pendingMatches.length + portfolioInvites.length;

  const activeProjects = projects.filter((p) => p.is_active);
  const archivedProjects = projects.filter((p) => !p.is_active);
  const displayedProjects = showArchived ? archivedProjects : activeProjects;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-(--color-canvas) text-(--color-ink)">
      {/* Header */}
      <header className="ma-header">
        <div className="ma-header-inner">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">FOUNDERS ARENA</p>
              <h1 className="ma-header-title">
                {isInvestor ? "Projects & Pipeline" : "Your Matches"}
              </h1>
              <p className="ma-header-desc">
                {isLoading
                  ? "Loading…"
                  : isInvestor
                    ? `${projects.length} project${projects.length !== 1 ? "s" : ""} · ${matches.length} intro${matches.length !== 1 ? "s" : ""}`
                    : isStartup
                      ? pendingCount > 0
                        ? `${pendingCount} pending response${pendingCount > 1 ? "s" : ""} · ${matches.length} total intro${matches.length !== 1 ? "s" : ""}`
                        : `${projects.length} project${projects.length !== 1 ? "s" : ""} · ${matches.length} intro${matches.length !== 1 ? "s" : ""}`
                      : `${matches.length} intro${matches.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {isStartup && !isLoading && (
              <Link
                href={!hasActiveSub && projects.length >= 1 ? "/payments" : "/projects/new"}
                className="gn-btn-primary shrink-0"
              >
                + New project
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 sm:px-6 py-10">

        {/* ── Global Tabs ── */}
        {!isLoading && !isInvestor && (
          <div className="flex items-center justify-between gap-3 mb-6 border-b border-(--color-hairline) pb-4">
            <div className="flex rounded-xl border border-(--color-hairline) overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("my_matches")}
                className={`px-4 py-2 transition-colors ${activeTab === "my_matches" ? "bg-(--color-primary) text-white" : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"}`}
              >
                {isInvestor ? "All Startups" : "My Matches"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("create_matches")}
                className={`px-4 py-2 transition-colors ${activeTab === "create_matches" ? "bg-(--color-primary) text-white" : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"}`}
              >
                Create Matches
              </button>
            </div>
          </div>
        )}

        {/* ── CREATE MATCHES VIEW ───────────────────────────────────────────── */}
        {activeTab === "create_matches" && (
          <div className="space-y-6">
            {generatedMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-10 text-center space-y-6">
                <div className="rounded-full bg-(--color-primary)/10 p-4">
                  <svg className="h-8 w-8 text-(--color-primary)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-(--color-ink)">AI Match Generation Sweep</h2>
                  <p className="mt-2 max-w-lg text-sm text-(--color-body)">
                    Trigger an ecosystem-wide scan to analyze all {isInvestor ? "active startup projects" : "verified investors"} against your requirements.
                    This intensive computation costs a flat fee of 3 credits and processes in the background.
                  </p>
                </div>

                {sweepStatus && (
                  <p className="text-sm font-semibold text-amber-500 animate-pulse">{sweepStatus}</p>
                )}

                <button
                  onClick={handleBulkSweep}
                  disabled={isSweeping}
                  className="inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSweeping ? (
                    <>
                      <svg className="animate-spin h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Run Match Generation (3 Credits)"
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--color-hairline) pb-6">
                  <div>
                    <h3 className="text-xl font-bold text-(--color-ink)">Generated Matches</h3>
                    <p className="text-sm text-(--color-muted) mt-1">Here are your latest AI matches based on your profiles.</p>
                  </div>
                  <button
                    onClick={handleBulkSweep}
                    disabled={isSweeping}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {isSweeping ? (
                      <>
                        <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate (3 Credits)"
                    )}
                  </button>
                </div>

                {sweepStatus && (
                  <div className="rounded-xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-500 text-center animate-pulse">
                    {sweepStatus}
                  </div>
                )}

                <div className="space-y-4">
                  {generatedMatches.map((item, index) => {
                    const isLocked = item.is_locked;

                    if (isInvestor) {
                      const p = item;
                      const isScoringThis = scoring.has(p.id);
                      const isExpanded = expandedId === p.id;
                      const founder = founderProfiles.get(p.owner_id) ?? null;
                      const founderLoading = loadingFounders.has(p.owner_id);
                      let fundraisingStage: string | null = null;
                      try {
                        const parsed = JSON.parse(founder?.asks_summary ?? "");
                        if (parsed?._v === 2) fundraisingStage = parsed.fundraising_stage ?? null;
                      } catch { /* ignore */ }

                      return (
                        <div key={p.id} className="relative rounded-2xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden hover:shadow-md transition-shadow">
                          <div className={isLocked ? "blur-sm select-none pointer-events-none" : ""}>
                            <button type="button" onClick={() => handleToggleExpand(p)} className="w-full text-left p-5">
                              <div className="flex items-center gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-(--color-ink) truncate">{p.project_name}</p>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {p.stage && <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)">{p.stage}</span>}
                                    {p.sector && <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)">{p.sector}</span>}
                                    {fundraisingStage && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500">{fundraisingStage}</span>}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  {p.fit_score > 0 ? (
                                    <>
                                      <div className="text-right">
                                        <p className={`text-xl font-bold ${scoreColorClass(p.fit_score)}`}>{p.fit_score}%</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Fit score</p>
                                      </div>
                                      <PieScore score={p.fit_score} />
                                    </>
                                  ) : (
                                    <span className="text-xs text-(--color-muted)">Not yet scored</span>
                                  )}
                                  <svg className={`h-4 w-4 text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                              {p.summary && <p className="mt-2 text-xs text-(--color-primary) line-clamp-1">{p.summary}</p>}
                            </button>

                            {isExpanded && (
                              <div className="border-t border-(--color-hairline) bg-(--color-surface-soft) p-5 space-y-5">
                                <div>
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Project details</p>
                                  {p.description && <p className="text-sm text-(--color-body) leading-relaxed">{p.description}</p>}
                                  <div className="mt-3 flex flex-wrap gap-4">
                                    {p.stage && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Stage</p><p className="text-sm font-medium text-(--color-ink)">{p.stage}</p></div>}
                                    {p.sector && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Sector</p><p className="text-sm font-medium text-(--color-ink)">{p.sector}</p></div>}
                                    {fundraisingStage && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Fundraising stage</p><p className="text-sm font-medium text-(--color-ink)">{fundraisingStage}</p></div>}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Founder profile</p>
                                  {founderLoading ? (
                                    <div className="h-16 animate-pulse rounded-lg bg-(--color-surface-soft)" />
                                  ) : founder ? (
                                    <div className="space-y-3">
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedFounder(founder)}
                                          className="font-semibold text-(--color-ink) hover:text-(--color-primary) hover:underline text-left transition-colors"
                                        >
                                          {founder.full_name || "Unnamed founder"}
                                        </button>
                                        {founder.business_name && <p className="text-xs text-(--color-muted)">{founder.business_name}</p>}
                                        {founder.role_title && <p className="text-xs text-(--color-muted)">{founder.role_title}</p>}
                                      </div>
                                      <div className="flex flex-wrap gap-3 text-xs text-(--color-muted)">
                                        {founder.city && <span>📍 {founder.city}</span>}
                                        {founder.sector && <span>🏭 {founder.sector}</span>}
                                        {founder.years_in_operation && <span>🕐 {founder.years_in_operation} in operation</span>}
                                        {founder.employee_band && <span>👥 {founder.employee_band} employees</span>}
                                      </div>
                                      {founder.short_bio && <p className="text-sm text-(--color-body) leading-relaxed">{founder.short_bio}</p>}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-(--color-muted)">Founder details unavailable.</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <ConnectButton
                                    projectId={p.id}
                                    ownerId={p.owner_id}
                                    userId={user?.id ?? ""}
                                    matchStatusByPartnerId={matchStatusByPartnerId}
                                    introRequests={introRequests}
                                    onRequest={handleRequestIntro}
                                    size="md"
                                  />
                                  {p.fit_score > 0 && (
                                    <Link
                                      href={`/matches/breakdown?a=${user?.id ?? ""}&b=${p.owner_id}&score=${p.fit_score}&project=${p.id}`}
                                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-500 hover:bg-indigo-500/25 transition-colors"
                                    >
                                      View compatibility breakdown
                                    </Link>
                                  )}
                                  <Link href={`/projects/${p.id}/investor`} className="inline-flex items-center gap-2 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-canvas) transition-colors">
                                    View full project →
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={isScoringThis}
                                    onClick={(e) => { e.stopPropagation(); void handleScoreProject(p.id); }}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-3 py-1.5 text-xs font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                                  >
                                    {isScoringThis ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Exoasia Intelligence is scoring…
                                      </>
                                    ) : (
                                      <>
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
                                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                        </svg>
                                        {p.fit_score > 0 ? "Rescore" : "Score this project"}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-end px-4 bg-gradient-to-r from-transparent via-(--color-canvas)/80 to-(--color-canvas) pointer-events-auto">
                              <button
                                type="button"
                                onClick={() => router.push("/payments")}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
                              >
                                Upgrade to Unlock
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    } else if (isStartup) {
                      const s = item as ProjectScore;
                      return (
                        <div key={s.id} className="relative flex items-center justify-between gap-4 rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4 overflow-hidden hover:shadow-sm transition-shadow">
                          <div className={`flex-1 min-w-0 ${isLocked ? "blur-sm select-none" : ""}`}>
                            <p className="font-semibold text-(--color-ink) truncate">{s.investor_name}</p>
                            <p className="text-xs text-(--color-muted)">Project: {projects.find(p => p.id === s.project_id)?.name}</p>
                          </div>
                          <div className={`flex items-center gap-3 shrink-0 ${isLocked ? "blur-sm" : ""}`}>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${scoreColorClass(s.fit_score)}`}>{s.fit_score}%</p>
                              <p className="text-[10px] font-bold uppercase text-(--color-muted)">Fit score</p>
                            </div>
                          </div>
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-end px-4 bg-gradient-to-r from-transparent via-(--color-canvas)/80 to-(--color-canvas)">
                              <button
                                type="button"
                                onClick={() => router.push("/payments")}
                                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
                              >
                                Upgrade to Unlock
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MY MATCHES VIEW ────────────────────────────────────────────────── */}
        {activeTab === "my_matches" && isStartup && (
          <>
            {/* ── Pending responses ── */}
            {!isLoading && (pendingMatches.length > 0 || portfolioInvites.length > 0) && (
              <section>
                <h2 className="ma-section-label">
                  Pending responses
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-(--color-primary)/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-(--color-primary)">
                    {pendingCount}
                  </span>
                </h2>
                {pendingMatches.length > 0 && (
                  <div className="mb-3">
                    <MatchList
                      matches={pendingMatches}
                      userId={user?.id ?? ""}
                      userRole={memberRole}
                      onRespond={handleRespond}
                      onUnlock={handleUnlockMatch}
                      respondingId={respondingMatchId}
                      unlockingId={unlockingId}
                      subscriptionActive={hasActiveSub}
                    />
                  </div>
                )}
                {portfolioInvites.length > 0 && (
                  <div className="space-y-2.5">
                    {portfolioInvites.map((invite) => (
                      <CollabInviteCard
                        key={invite.id}
                        invite={invite}
                        userId={user?.id ?? ""}
                        isExpanded={expandedInviteId === invite.id}
                        onToggle={() => setExpandedInviteId((prev) => (prev === invite.id ? null : invite.id))}
                        isResponding={respondingInviteId === invite.id}
                        onAccept={() => void handlePortfolioInviteRespond(invite.id, "accepted")}
                        onDecline={() => void handlePortfolioInviteRespond(invite.id, "declined")}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="ma-section-label">Your Projects</h2>
                {(archivedProjects.length > 0 || showArchived) && (
                  <div className="flex rounded-xl border border-(--color-hairline) overflow-hidden text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setShowArchived(false)}
                      className={`px-4 py-2 transition-colors ${!showArchived ? "bg-(--color-primary) text-white" : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"}`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowArchived(true)}
                      className={`px-4 py-2 transition-colors ${showArchived ? "bg-(--color-primary) text-white" : "bg-(--color-canvas) text-(--color-muted) hover:bg-(--color-surface-soft)"}`}
                    >
                      Archived ({archivedProjects.length})
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="h-10 animate-pulse rounded-xl bg-(--color-surface-soft)" />
                      <div className="h-24 animate-pulse rounded-2xl bg-(--color-surface-soft)" />
                    </div>
                  ))}
                </div>
              ) : displayedProjects.length === 0 ? (
                <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) py-12 text-center">
                  <p className="text-sm font-semibold text-(--color-ink)">No {showArchived ? "archived" : "active"} projects</p>
                  {!showArchived && (
                    <>
                      <p className="mt-1 text-xs text-(--color-muted)">Create a project to start getting matched with investors.</p>
                      <Link href="/projects/new" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white hover:opacity-95">
                        Create a project
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {displayedProjects.map((project) => {
                    const scores = projectScores.filter((s) => s.project_id === project.id);
                    const bestScore = scores.length > 0 ? scores[0].fit_score : null;
                    const isGeneratingThis = generating.has(project.id);
                    const alreadyGenerated = generatedProjects.has(project.id);

                    return (
                      <div
                        key={project.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/projects/${project.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/projects/${project.id}`); }}
                        className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden cursor-pointer hover:border-(--color-primary)/40 hover:bg-(--color-surface-soft)/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 px-5 py-5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-(--color-ink)">{project.name}</h3>
                              {project.stage && (
                                <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)">{project.stage}</span>
                              )}
                              {project.sector && (
                                <span className="rounded-full bg-(--color-surface-soft) border border-(--color-hairline) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)">{project.sector}</span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-(--color-muted)">
                              {scores.length > 0
                                ? `${scores.length} investor match${scores.length !== 1 ? "es" : ""}${bestScore !== null ? ` · ${bestScore}% best fit` : ""}`
                                : "No investor matches yet"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {scores.length > 0 && (
                              <Link
                                href={`/projects/${project.id}?tab=matches`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-2.5 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                              >
                                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {scores.length} match{scores.length !== 1 ? "es" : ""}
                              </Link>
                            )}
                            {showArchived ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); void handleRestoreProject(project.id); }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-2.5 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isGeneratingThis}
                                onClick={(e) => { e.stopPropagation(); void handleFindInvestors(project.id); }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-(--color-primary)/30 bg-(--color-primary)/5 px-2.5 py-1.5 text-xs font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                              >
                                {isGeneratingThis ? (
                                  <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
                                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                  </svg>
                                )}
                                {isGeneratingThis ? "Matching…" : alreadyGenerated ? "Regenerate" : "Find investors"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── INVESTOR VIEW ──────────────────────────────────────────────────── */}
        {isInvestor && (
          <>
            {/* ── Collab invites ── */}
            {!isLoading && portfolioInvites.length > 0 && (
              <section>
                <h2 className="ma-section-label">
                  Collaboration invites
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-(--color-primary)/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-(--color-primary)">
                    {portfolioInvites.length}
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {portfolioInvites.map((invite) => (
                    <CollabInviteCard
                      key={invite.id}
                      invite={invite}
                      userId={user?.id ?? ""}
                      isExpanded={expandedInviteId === invite.id}
                      onToggle={() => setExpandedInviteId((prev) => (prev === invite.id ? null : invite.id))}
                      isResponding={respondingInviteId === invite.id}
                      onAccept={() => void handlePortfolioInviteRespond(invite.id, "accepted")}
                      onDecline={() => void handlePortfolioInviteRespond(invite.id, "declined")}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Projects ── */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="ma-section-label !mb-0">All Startups</h2>
                <button
                  onClick={handleBulkSweep}
                  disabled={isSweeping}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSweeping ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {scoreMap.size > 0 ? "Regenerating..." : "Processing..."}
                    </>
                  ) : scoreMap.size > 0 ? (
                    "Regenerate Matches (1 Credit)"
                  ) : (
                    "Create Matches (1 Credit)"
                  )}
                </button>
              </div>

              {sweepStatus && (
                <div className="mb-6 rounded-xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-500 text-center animate-pulse">
                  {sweepStatus}
                </div>
              )}

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-(--color-surface-soft)" />
                  ))}
                </div>
              ) : generatedMatchResults.length === 0 ? (
                <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8">
                  <p className="text-sm text-(--color-body)">No founder projects on the platform yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedMatchResults.map((item, index) => {
                    const limit = 10;
                    const isLocked = !hasActiveSub && index >= limit;
                    const p = item as ProjectRecord & { owner_name?: string };
                    const existingScore = scoreMap.get(p.id);
                    const isScoringThis = scoring.has(p.id);
                    const isExpanded = expandedId === p.id;
                    const founder = founderProfiles.get(p.owner_id) ?? null;
                    const founderLoading = loadingFounders.has(p.owner_id);
                    let fundraisingStage: string | null = null;
                    try {
                      const parsed = JSON.parse(founder?.asks_summary ?? "");
                      if (parsed?._v === 2) fundraisingStage = parsed.fundraising_stage ?? null;
                    } catch { /* ignore */ }

                    return (
                      <div key={p.id} className="relative rounded-2xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden hover:shadow-md transition-shadow">
                        <div className={isLocked ? "blur-sm select-none pointer-events-none" : ""}>
                          <button type="button" onClick={() => handleToggleExpand(p)} className="w-full text-left p-5">
                            <div className="flex items-center gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-(--color-ink) truncate">{p.name}</p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {p.stage && <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)">{p.stage}</span>}
                                  {p.sector && <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)">{p.sector}</span>}
                                  {fundraisingStage && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500">{fundraisingStage}</span>}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                {existingScore ? (
                                  <>
                                    <div className="text-right">
                                      <p className={`text-xl font-bold ${scoreColorClass(existingScore.fit_score)}`}>{existingScore.fit_score}%</p>
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Fit score</p>
                                    </div>
                                    <PieScore score={existingScore.fit_score} />
                                  </>
                                ) : (
                                  <span className="text-xs text-(--color-muted)">Not yet scored</span>
                                )}
                                <svg className={`h-4 w-4 text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            {existingScore?.summary && <p className="mt-2 text-xs text-(--color-primary) line-clamp-1">{existingScore.summary}</p>}
                          </button>

                          {isExpanded && (
                            <div className="border-t border-(--color-hairline) bg-(--color-surface-soft) p-5 space-y-5">
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Project details</p>
                                {p.description && <p className="text-sm text-(--color-body) leading-relaxed">{p.description}</p>}
                                <div className="mt-3 flex flex-wrap gap-4">
                                  {p.stage && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Stage</p><p className="text-sm font-medium text-(--color-ink)">{p.stage}</p></div>}
                                  {p.sector && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Sector</p><p className="text-sm font-medium text-(--color-ink)">{p.sector}</p></div>}
                                  {fundraisingStage && <div><p className="text-[10px] font-bold uppercase text-(--color-muted)">Fundraising stage</p><p className="text-sm font-medium text-(--color-ink)">{fundraisingStage}</p></div>}
                                </div>
                              </div>
                              <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Founder profile</p>
                                {founderLoading ? (
                                  <div className="h-16 animate-pulse rounded-lg bg-(--color-surface-soft)" />
                                ) : founder ? (
                                  <div className="space-y-3">
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedFounder(founder)}
                                        className="font-semibold text-(--color-ink) hover:text-(--color-primary) hover:underline text-left transition-colors"
                                      >
                                        {founder.full_name || "Unnamed founder"}
                                      </button>
                                      {founder.business_name && <p className="text-xs text-(--color-muted)">{founder.business_name}</p>}
                                      {founder.role_title && <p className="text-xs text-(--color-muted)">{founder.role_title}</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-(--color-muted)">
                                      {founder.city && <span>📍 {founder.city}</span>}
                                      {founder.sector && <span>🏭 {founder.sector}</span>}
                                      {founder.years_in_operation && <span>🕐 {founder.years_in_operation} in operation</span>}
                                      {founder.employee_band && <span>👥 {founder.employee_band} employees</span>}
                                    </div>
                                    {founder.short_bio && <p className="text-sm text-(--color-body) leading-relaxed">{founder.short_bio}</p>}
                                  </div>
                                ) : (
                                  <p className="text-sm text-(--color-muted)">Founder details unavailable.</p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <ConnectButton
                                  projectId={p.id}
                                  ownerId={p.owner_id}
                                  userId={user?.id ?? ""}
                                  matchStatusByPartnerId={matchStatusByPartnerId}
                                  introRequests={introRequests}
                                  onRequest={handleRequestIntro}
                                  size="md"
                                />
                                {existingScore && (
                                  <Link
                                    href={`/matches/breakdown?a=${user?.id ?? ""}&b=${p.owner_id}&score=${existingScore.fit_score}&project=${p.id}`}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-500 hover:bg-indigo-500/25 transition-colors"
                                  >
                                    View compatibility breakdown
                                  </Link>
                                )}
                                <Link href={`/projects/${p.id}/investor`} className="inline-flex items-center gap-2 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-canvas) transition-colors">
                                  View full project →
                                </Link>
                                <button
                                  type="button"
                                  disabled={isScoringThis}
                                  onClick={(e) => { e.stopPropagation(); void handleScoreProject(p.id); }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-3 py-1.5 text-xs font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                                >
                                  {isScoringThis ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Exoasia Intelligence is scoring…
                                    </>
                                  ) : (
                                    <>
                                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 shrink-0">
                                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                                      </svg>
                                      {existingScore ? "Rescore" : "Score this project"}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        {isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-(--color-canvas)/5 pointer-events-auto">
                            <button
                              type="button"
                              onClick={() => router.push("/payments")}
                              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-colors shadow-sm backdrop-blur-md"
                            >
                              Upgrade to Unlock Matches
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ── Fallback ───────────────────────────────────────────────────────── */}
        {!isStartup && !isInvestor && !isEcosystemPartner && !isLoading && (
          <section>
            <h2 className="ma-section-label">Your Intros</h2>
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) py-12 text-center">
                <p className="text-sm font-semibold text-(--color-ink)">No intros yet</p>
                <p className="mt-1 text-xs text-(--color-muted)">When you get matched with a counterpart, they'll appear here.</p>
              </div>
            ) : (
              <MatchList matches={matches} userId={user?.id ?? ""} onRespond={handleRespond} onUnlock={handleUnlockMatch} respondingId={respondingMatchId} unlockingId={unlockingId} />
            )}
          </section>
        )}
      </div>

      {selectedFounder && (
        <FounderProfileModal founder={selectedFounder} onClose={() => setSelectedFounder(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectButton({
  projectId,
  ownerId,
  userId,
  matchStatusByPartnerId,
  introRequests,
  onRequest,
  size = "sm",
}: {
  projectId: string;
  ownerId: string;
  userId: string;
  matchStatusByPartnerId: Map<string, { status: string; myStatus: string }>;
  introRequests: Map<string, "requesting" | "done">;
  onRequest: (projectId: string, investorId: string) => Promise<void>;
  size?: "sm" | "md";
}) {
  const key = `${projectId}:${userId}`;
  const reqState = introRequests.get(key);
  const matchEntry = matchStatusByPartnerId.get(ownerId);
  const matchStatus = matchEntry?.status;
  const myStatus = matchEntry?.myStatus;

  const base = size === "md"
    ? "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
    : "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors";

  if (matchStatus === "accepted" || matchStatus === "introduced") {
    return <span className={`${base} bg-emerald-500/15 text-emerald-500`}>Connected</span>;
  }

  if (matchStatus === "pending") {
    // myStatus === "pending" means the founder initiated and I haven't responded yet
    if (myStatus === "pending") {
      return <span className={`${base} bg-violet-500/15 text-violet-500`}>Founder requested · check pending</span>;
    }
    // myStatus === "accepted" means I already accepted, waiting on the founder
    return <span className={`${base} bg-amber-500/15 text-amber-500`}>Qualified — awaiting founder</span>;
  }

  if (reqState === "done") {
    return <span className={`${base} bg-amber-500/15 text-amber-500`}>Qualified — awaiting founder</span>;
  }

  return (
    <button
      type="button"
      disabled={reqState === "requesting"}
      onClick={() => void onRequest(projectId, userId)}
      className={`${base} bg-(--color-primary) text-white hover:opacity-90 disabled:opacity-50`}
    >
      {reqState === "requesting" ? "Sending…" : "Add as Qualified"}
    </button>
  );
}

// ─── Founder profile modal ────────────────────────────────────────────────────

function FounderProfileModal({
  founder: f,
  onClose,
}: {
  founder: FounderProfile;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const backdropRef = useRef<HTMLDivElement>(null);

  type ExtraFields = {
    linkedin_url: string | null;
    verification_status: string | null;
    member_role: string | null;
    ask_categories: string[] | null;
    offer_categories: string[] | null;
    annual_revenue_estimate: string | null;
    stage: string | null;
  };
  const [extra, setExtra] = useState<ExtraFields | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("linkedin_url, verification_status, member_role, ask_categories, offer_categories, annual_revenue_estimate, stage")
        .eq("id", f.id)
        .single();
      if (data) setExtra(data as ExtraFields);
    })();
  }, [supabase, f.id]);

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
    const parsed = JSON.parse(f.asks_summary ?? "");
    if (parsed?._v === 2) v2 = parsed;
  } catch { /* */ }

  const fundraisingStage = (v2?.fundraising_stage as string | null) ?? null;
  const productStage = v2?.product_stage as string | null ?? null;
  const targetRaiseMin = v2?.target_raise_min as string | null ?? null;
  const targetRaiseMax = v2?.target_raise_max as string | null ?? null;
  const targetRegions = (v2?.target_regions as string[] | null) ?? [];
  const targetIndustries = (v2?.target_industries as string[] | null) ?? [];

  const initials = (f.full_name ?? "?").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

  const roleBadgeLabel = extra?.member_role === "startup" ? "Founder" : extra?.member_role === "investor" ? "Investor" : null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-(--color-hairline) bg-(--color-canvas) shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-(--color-hairline) bg-(--color-surface-soft) text-(--color-muted) hover:bg-(--color-hairline) transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-lg font-bold text-(--color-primary)">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-(--color-ink)">{f.full_name || "—"}</h2>
              {f.business_name && <p className="text-sm text-(--color-body)">{f.business_name}</p>}
              {f.role_title && <p className="text-xs text-(--color-muted)">{f.role_title}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleBadgeLabel && (
                  <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                    {roleBadgeLabel}
                  </span>
                )}
                {extra?.verification_status === "verified" && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">✓ Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {f.city && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Location</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{f.city}</p>
              </div>
            )}
            {f.sector && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Sector</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{f.sector}</p>
              </div>
            )}
            {f.years_in_operation && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Years operating</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{f.years_in_operation}</p>
              </div>
            )}
            {f.employee_band && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Team size</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{f.employee_band}</p>
              </div>
            )}
            {extra?.annual_revenue_estimate && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Revenue</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{extra.annual_revenue_estimate}</p>
              </div>
            )}
            {fundraisingStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Fundraising stage</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{fundraisingStage}</p>
              </div>
            )}
            {productStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Product stage</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{productStage}</p>
              </div>
            )}
            {(targetRaiseMin || targetRaiseMax) && (
              <div className="col-span-2 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Target raise</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">
                  {targetRaiseMin && targetRaiseMax
                    ? `$${Number(targetRaiseMin).toLocaleString()} – $${Number(targetRaiseMax).toLocaleString()}`
                    : targetRaiseMin
                      ? `From $${Number(targetRaiseMin).toLocaleString()}`
                      : `Up to $${Number(targetRaiseMax).toLocaleString()}`}
                </p>
              </div>
            )}
          </div>

          {/* Bio */}
          {f.short_bio && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">About</p>
              <p className="text-sm text-(--color-body) leading-relaxed">{f.short_bio}</p>
            </div>
          )}

          {/* Target regions / industries */}
          {targetRegions.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Target regions</p>
              <div className="flex flex-wrap gap-1.5">
                {targetRegions.map((r) => (
                  <span key={r} className="rounded-full border border-(--color-hairline) bg-(--color-surface-soft) px-2 py-0.5 text-xs font-medium text-(--color-muted)">{r}</span>
                ))}
              </div>
            </div>
          )}
          {targetIndustries.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Target industries</p>
              <div className="flex flex-wrap gap-1.5">
                {targetIndustries.map((i) => (
                  <span key={i} className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">{i}</span>
                ))}
              </div>
            </div>
          )}

          {/* Ask / Offer categories */}
          {(extra?.ask_categories ?? []).length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Asking for</p>
              <div className="flex flex-wrap gap-1.5">
                {(extra!.ask_categories ?? []).map((tag) => (
                  <span key={tag} className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-primary)">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {(extra?.offer_categories ?? []).length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Offering</p>
              <div className="flex flex-wrap gap-1.5">
                {(extra!.offer_categories ?? []).map((tag) => (
                  <span key={tag} className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-accent-gold)">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {extra?.linkedin_url && (
            <a
              href={extra.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-(--color-primary) hover:underline"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              LinkedIn profile
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score, barClass }: { score: number; barClass: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.style.width = `${score}%`; }, [score]);
  return <div ref={ref} className={`h-full w-0 rounded-full transition-all duration-500 ${barClass}`} />;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3 text-center">
      <p className={`text-2xl font-bold ${accent ?? "text-(--color-ink)"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">{label}</p>
    </div>
  );
}

function MatchList({
  matches,
  userId,
  userRole,
  onRespond,
  onUnlock,
  respondingId,
  unlockingId,
  subscriptionActive = true,
}: {
  matches: MatchRow[];
  userId: string;
  userRole?: string | null;
  onRespond?: (match: MatchRow, decision: "accepted" | "declined") => Promise<void>;
  onUnlock?: (match: MatchRow) => Promise<void>;
  respondingId?: string | null;
  unlockingId?: string | null;
  subscriptionActive?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {matches.map((m) => {
        const sc = statusStyle(m.status);
        const score = m.fit_score ?? 0;
        const name = m.counterpart_name ?? "Verified member";
        const myStatus = m.member_a_id === userId ? m.member_a_status : m.member_b_status;
        const initiatedByCounterpart = myStatus === "pending";
        const canRespond = initiatedByCounterpart && !!onRespond;
        const isResponding = respondingId === m.id;
        const isUnlocking = unlockingId === m.id;

        return (
          <div key={m.id} className="relative flex items-center gap-4 rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4 overflow-hidden">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-hairline) text-xs font-bold text-(--color-ink) ${m.is_locked ? 'blur-sm' : ''}`}>
              {!subscriptionActive ? "U" : name.charAt(0)}
            </div>
            <div className={`min-w-0 flex-1 ${m.is_locked ? 'blur-sm select-none' : ''}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-(--color-ink)">{subscriptionActive ? name : "Upgrade to unlock"}</p>
                {!canRespond && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.pill}`}>{sc.label}</span>}
              </div>
              {canRespond && userRole === "startup" && subscriptionActive && (
                <p className="mb-1 text-xs font-medium text-amber-400">
                  has marked your project as Qualified — accept to move to Intro &amp; Scoping
                </p>
              )}
              {canRespond && userRole === "investor" && subscriptionActive && (
                <p className="mb-1 text-xs font-medium text-amber-400">
                  wants to connect — accept to move to Intro &amp; Scoping
                </p>
              )}
              {subscriptionActive && m.counterpart_sector && <p className="mb-1.5 text-[11px] text-(--color-muted)">{m.counterpart_sector}</p>}
              {subscriptionActive && score > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-hairline)">
                    <ScoreBar score={score} barClass={scoreBarClass(score)} />
                  </div>
                  <span className={`w-9 text-right text-xs font-bold ${scoreColorClass(score)}`}>{score}%</span>
                </div>
              ) : !subscriptionActive ? (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-hairline)" />
                  <span className="w-9 text-right text-xs font-bold text-(--color-muted)">Match limit reached</span>
                </div>
              ) : null}
            </div>

            {m.is_locked ? (
              <div className="absolute inset-0 flex items-center justify-end px-4 bg-gradient-to-r from-transparent via-(--color-canvas)/80 to-(--color-canvas)">
                <button
                  type="button"
                  disabled={isUnlocking}
                  onClick={() => onUnlock && onUnlock(m)}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
                >
                  {isUnlocking ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Unlocking...
                    </span>
                  ) : (
                    <>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      Unlock Permanently (3 Credits)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                {canRespond && (
                  <>
                    <button type="button" disabled={isResponding} onClick={() => void onRespond(m, "accepted")} className="rounded-lg bg-(--color-primary)/20 px-3 py-1.5 text-xs font-bold text-(--color-primary) hover:bg-(--color-primary)/30 disabled:opacity-50">
                      {isResponding ? "…" : "Accept"}
                    </button>
                    <button type="button" disabled={isResponding} onClick={() => void onRespond(m, "declined")} className="rounded-lg bg-(--color-surface-soft) px-3 py-1.5 text-xs font-bold text-(--color-muted) hover:bg-(--color-hairline) disabled:opacity-50">
                      Decline
                    </button>
                  </>
                )}
                <Link href={`/matches/${m.id}`} className="flex h-8 w-8 items-center justify-center rounded-xl bg-(--color-surface-soft) text-(--color-muted) hover:bg-(--color-hairline) hover:text-(--color-primary)" aria-label="View details">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── CollabInviteCard ─────────────────────────────────────────────────────────

function CollabInviteCard({
  invite,
  userId,
  isExpanded,
  onToggle,
  isResponding,
  onAccept,
  onDecline,
}: {
  invite: PortfolioInvite;
  userId: string;
  isExpanded: boolean;
  onToggle: () => void;
  isResponding: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const breakdownHref = invite.eco_score !== null && invite.scored_project_id
    ? `/matches/breakdown?a=${invite.partner_id}&b=${userId}&score=${invite.eco_score}&project=${invite.scored_project_id}`
    : `/matches/breakdown?a=${invite.partner_id}&b=${userId}`;

  const roleConfig =
    invite.partner_role === "investor" ? { label: "Investor", style: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30" }
      : invite.partner_role === "startup" ? { label: "Founder", style: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" }
        : invite.partner_role === "ecosystem_partner" ? { label: "Ecosystem Partner", style: "bg-violet-500/15 text-violet-500 border-violet-500/30" }
          : null;

  return (
    <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden">
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-(--color-surface-soft) transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-xs font-bold text-violet-400">
          {invite.partner_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-(--color-ink)">{invite.partner_name}</p>
            {roleConfig && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleConfig.style}`}>
                {roleConfig.label}
              </span>
            )}
            {invite.partner_verification_status === "verified" && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">✓ Verified</span>
            )}
          </div>
          {invite.partner_full_name && invite.partner_full_name !== invite.partner_name && (
            <p className="mt-0.5 text-xs text-(--color-muted)">{invite.partner_full_name}</p>
          )}
          {(invite.partner_sector || invite.partner_city) && (
            <p className="mt-0.5 text-xs text-(--color-muted)">
              {[invite.partner_sector, invite.partner_city].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-(--color-muted)">
            Invited {new Date(invite.nominated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {invite.eco_score !== null && (
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums ${invite.eco_score >= 75 ? "text-emerald-500" : invite.eco_score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                {invite.eco_score}%
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Fit</p>
            </div>
          )}
          <svg
            className={`h-4 w-4 text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded profile + actions */}
      {isExpanded && (
        <div className="border-t border-(--color-hairline) bg-(--color-surface-soft) p-4 space-y-4">

          {/* Name / role */}
          <div className="flex items-start justify-between gap-3">
            <div>
              {invite.partner_full_name && (
                <p className="text-sm font-semibold text-(--color-ink)">{invite.partner_full_name}</p>
              )}
              {invite.partner_role_title && (
                <p className="text-xs text-(--color-muted)">{invite.partner_role_title}</p>
              )}
            </div>
            {roleConfig && (
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${roleConfig.style}`}>
                {roleConfig.label}
              </span>
            )}
          </div>

          {/* Bio */}
          {invite.partner_bio && (
            <p className="text-sm text-(--color-body) leading-relaxed">{invite.partner_bio}</p>
          )}

          {/* AI summary */}
          {invite.eco_summary && (
            <p className="text-xs text-violet-500 italic">{invite.eco_summary}</p>
          )}

          {/* Asks / Offers */}
          {(invite.partner_ask_categories.length > 0 || invite.partner_offer_categories.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {invite.partner_ask_categories.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1.5">Asks</p>
                  <div className="flex flex-wrap gap-1">
                    {invite.partner_ask_categories.map((a) => (
                      <span key={a} className="rounded-full bg-(--color-canvas) border border-(--color-hairline) px-2 py-0.5 text-[10px] font-medium text-(--color-body)">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {invite.partner_offer_categories.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1.5">Offers</p>
                  <div className="flex flex-wrap gap-1">
                    {invite.partner_offer_categories.map((o) => (
                      <span key={o} className="rounded-full bg-(--color-canvas) border border-(--color-hairline) px-2 py-0.5 text-[10px] font-medium text-(--color-body)">{o}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LinkedIn */}
          {invite.partner_linkedin_url && (
            <a
              href={invite.partner_linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-primary) hover:underline"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href={breakdownHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/20 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compatibility Breakdown
            </Link>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                disabled={isResponding}
                onClick={onDecline}
                className="rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-muted) transition hover:border-rose-400/40 hover:text-rose-500 disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={isResponding}
                onClick={onAccept}
                className="rounded-lg bg-(--color-primary) px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isResponding ? "…" : "Accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
