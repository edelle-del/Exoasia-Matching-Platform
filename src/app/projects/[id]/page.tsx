"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Cofounder = {
  id: string;
  cofounder_profile_id: string;
  created_at: string;
  profile: { full_name: string | null; business_name: string | null; email: string | null } | null;
};

type InvestorMatch = {
  investor_profile_id: string;
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
  investor_name: string;
  investor_sector: string | null;
  investor_city: string | null;
};

type MyScore = {
  project_id: string;
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
};

const projectStages = ["Ideation", "MVP", "Growth", "Scaling", "Revenue-Generating"];

const sectorOptions = [
  "Advanced Manufacturing","Aerospace & Defense","Agtech","Animal Health","Brand & Retail",
  "Crypto & Digital Assets","Deeptech","Energy","Enterprise & AI","Fintech","Food & Beverage",
  "GOAL","Health","Insurtech","Lifetech","Maritime","Media & Advertising","Medtech",
  "Mobility & Physical AI","New Materials & Packaging","Real Estate & Construction",
  "Semiconductors","Smart Cities","Sportstech","Supply Chain","Sustainability","Travel & Hospitality",
];

function ScoreBadge({ score, large }: { score: number; large?: boolean }) {
  const cls =
    score >= 80 ? "fa-score-excellent"
    : score >= 65 ? "fa-score-strong"
    : score >= 50 ? "fa-score-moderate"
    : "fa-score-low";
  return (
    <span className={`${cls} inline-flex items-center rounded-lg font-bold ${large ? "px-3 py-1.5 text-base" : "px-2.5 py-1 text-sm"}`}>
      {score}/100
    </span>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState<Project | null>(null);
  const [cofounders, setCofounders] = useState<Cofounder[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", stage: "", sector: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [hasActiveSub, setHasActiveSub] = useState(false);

  // investor view: their score for this project
  const [myScore, setMyScore] = useState<MyScore | null>(null);
  const [scoring, setScoring] = useState(false);

  // startup owner view: investor matches
  const [investorMatches, setInvestorMatches] = useState<InvestorMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesGenerated, setMatchesGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);


  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/cofounders`).then((r) => r.json()),
    ]).then(([projectData, cofounderData]) => {
      if (projectData.project) {
        setProject(projectData.project);
        setForm({
          name: projectData.project.name,
          description: projectData.project.description ?? "",
          stage: projectData.project.stage ?? "",
          sector: projectData.project.sector ?? "",
        });
      }
      setCofounders(cofounderData.cofounders ?? []);
      setLoading(false);
    });
  }, [id]);

  // Load subscription state once user is known
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("subscription_plan, subscription_ends_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setHasActiveSub(
          !!data?.subscription_plan &&
            (!data.subscription_ends_at || new Date(data.subscription_ends_at) > new Date()),
        );
      });
  }, [user?.id, supabase]);

  // Load member role + role-specific data once we have the project and user
  useEffect(() => {
    if (!user?.id || !project) return;

    fetch("/api/projects/my-match-scores")
      .then((r) => r.json())
      .then((data: { scores?: MyScore[] }) => {
        const score = (data.scores ?? []).find((s) => s.project_id === id);
        if (score) setMyScore(score);
      });

    // Load existing investor matches if user owns this project
    if (project.owner_id === user.id) {
      setMatchesLoading(true);
      fetch(`/api/projects/${id}/investor-matches`)
        .then((r) => r.json())
        .then((data: { matches?: InvestorMatch[] }) => {
          const matches = data.matches ?? [];
          setInvestorMatches(matches);
          if (matches.length > 0) setMatchesGenerated(true);
          setMatchesLoading(false);
        });
    }
  }, [user?.id, project, id]);

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || null,
        stage: form.stage || null,
        sector: form.sector || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "Failed to save.");
      return;
    }
    setProject((p) => p ? { ...p, ...form, name: form.name.trim() } : p);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Archive this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  const handleScoreProject = async () => {
    setScoring(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-match`, { method: "POST" });
      const data = (await res.json()) as {
        score?: { project_id: string; fit_score: number; summary: string; rationale: Record<string, string> };
      };
      if (data.score) {
        setMyScore({
          project_id: id,
          fit_score: data.score.fit_score,
          summary: data.score.summary,
          rationale: data.score.rationale,
          generated_at: new Date().toISOString(),
        });
      }
    } finally {
      setScoring(false);
    }
  };

  const handleFindInvestors = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-match`, { method: "POST" });
      const data = (await res.json()) as {
        scores?: InvestorMatch[];
      };
      const scores = data.scores ?? [];
      setInvestorMatches(scores);
      setMatchesGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Project not found.</p>
      </div>
    );
  }

  const isOwner = user?.id === project.owner_id;

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl flex items-start justify-between gap-4">
          <div>
            <Link href="/projects" className="text-sm text-(--color-primary) hover:underline">
              ← Back to projects
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">{project.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.stage && (
                <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                  {project.stage}
                </span>
              )}
              {project.sector && (
                <span className="rounded-full bg-(--color-surface-soft) border border-(--color-hairline) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                  {project.sector}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Investor: score badge + button in header */}
            {!isOwner && (
              <div className="flex items-center gap-2">
                {myScore && <ScoreBadge score={myScore.fit_score} large />}
                <button
                  type="button"
                  disabled={scoring}
                  onClick={handleScoreProject}
                  className="gn-btn-secondary text-sm disabled:opacity-50"
                >
                  {scoring ? "Scoring…" : myScore ? "Rescore" : "Score project"}
                </button>
              </div>
            )}
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing((e) => !e)}
                  className="gn-btn-secondary text-sm"
                >
                  {editing ? "Cancel" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Archive
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-[5%] py-10">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {/* ── Investor: my score detail ── */}
        {!isOwner && myScore && (
          <div className={`mb-6 rounded-xl border p-4 ${myScore.fit_score >= 80 ? "border-[#A8DFC9] bg-[#E1F5EE]" : myScore.fit_score >= 65 ? "border-[#A8C8EF] bg-[#E6F1FB]" : myScore.fit_score >= 50 ? "border-[#E8C97A] bg-[#FAEEDA]" : "border-[#EFA8A8] bg-[#FCEBEB]"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-(--color-ink)">Your match score</h2>
              <ScoreBadge score={myScore.fit_score} large />
            </div>
            {myScore.summary && (
              <p className="mt-2 text-sm text-(--color-body)">{myScore.summary}</p>
            )}
            {myScore.rationale && Object.keys(myScore.rationale).length > 0 && (
              <dl className="mt-3 space-y-1 text-xs">
                {Object.entries(myScore.rationale).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="min-w-28 capitalize text-(--color-muted)">{key.replace(/_/g, " ")}</dt>
                    <dd className="text-(--color-body)">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-xs text-(--color-muted)">
              Generated {new Date(myScore.generated_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label htmlFor="proj-name" className="text-sm font-semibold text-(--color-ink)">Project name</label>
              <input
                id="proj-name"
                className="gn-input mt-1"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="proj-desc" className="text-sm font-semibold text-(--color-ink)">Description</label>
              <textarea
                id="proj-desc"
                className="gn-input mt-1 h-28"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="proj-stage" className="text-sm font-semibold text-(--color-ink)">Stage</label>
                <select
                  id="proj-stage"
                  className="gn-input mt-1"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  <option value="">Select stage</option>
                  {projectStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="proj-sector" className="text-sm font-semibold text-(--color-ink)">Sector</label>
                <select
                  id="proj-sector"
                  className="gn-input mt-1"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                >
                  <option value="">Select sector</option>
                  {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="gn-btn-primary disabled:opacity-50">
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="gn-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {project.description ? (
              <p className="text-(--color-body)">{project.description}</p>
            ) : (
              <p className="text-(--color-muted) italic">No description added yet.</p>
            )}
            <div className="rounded-xl border border-(--color-hairline) p-4 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Stage</dt>
                  <dd className="font-medium text-(--color-ink)">{project.stage || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Sector</dt>
                  <dd className="font-medium text-(--color-ink)">{project.sector || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Created</dt>
                  <dd className="font-medium text-(--color-ink)">{new Date(project.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>

            {/* ── Team / Cofounders ── */}
            {isOwner && (
              <div className="rounded-xl border border-(--color-hairline) p-4">
                <h2 className="text-sm font-semibold text-(--color-ink)">Team</h2>
                {cofounders.length === 0 ? (
                  <p className="mt-2 text-sm text-(--color-muted)">
                    No cofounders linked yet. Invite them from your{" "}
                    <a href="/profile" className="text-(--color-primary) hover:underline">profile page</a>.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {cofounders.map((c) => (
                      <li key={c.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-(--color-ink)">
                            {c.profile?.full_name || c.profile?.email || "Team member"}
                          </p>
                          {c.profile?.business_name && (
                            <p className="text-xs text-(--color-muted)">{c.profile.business_name}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Cofounder
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Investor matches panel (startup owner only) ── */}
            {isOwner && (
              <div id="investor-matches" className="rounded-xl border border-(--color-hairline) p-4">
                <div className="flex items-center justify-between">
                  <h2 className={`text-sm font-semibold ${matchesGenerated && investorMatches.length > 0 ? "text-green-600" : "text-(--color-ink)"}`}>
                    {matchesGenerated && investorMatches.length > 0 ? "✓ Investor matches" : "Investor matches"}
                  </h2>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={handleFindInvestors}
                    className="rounded-xl border border-(--color-hairline) px-3 py-1.5 text-xs font-medium text-(--color-ink) hover:bg-(--color-surface-soft) disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Generating…" : matchesGenerated ? "Regenerate" : "Find investors"}
                  </button>
                </div>

                {matchesLoading ? (
                  <p className="mt-3 text-sm text-(--color-muted)">Loading…</p>
                ) : !matchesGenerated ? (
                  <p className="mt-3 text-sm text-(--color-muted)">
                    Click &ldquo;Find investors&rdquo; to generate AI-powered investor match scores for this project.
                  </p>
                ) : investorMatches.length === 0 ? (
                  <p className="mt-3 text-sm text-(--color-muted)">
                    No investor matches found. Try again once more investors have joined the platform.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {investorMatches.map((m, idx) => {
                      const locked = !hasActiveSub && idx >= 3;
                      return (
                        <div key={m.investor_profile_id} className="relative">
                          <div className={`rounded-lg bg-(--color-surface-soft) p-3 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-(--color-ink)">{m.investor_name}</p>
                                {(m.investor_sector || m.investor_city) && (
                                  <p className="text-xs text-(--color-muted)">
                                    {[m.investor_sector, m.investor_city].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                              <ScoreBadge score={m.fit_score} />
                            </div>
                            {m.summary && (
                              <p className="mt-1 text-xs font-medium text-green-600">{m.summary}</p>
                            )}
                          </div>
                          {locked && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                              <div className="flex items-center gap-2 rounded-full border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 shadow-sm">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-(--color-muted)">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span className="text-xs font-semibold text-(--color-ink)">Pro — Upgrade to unlock</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!hasActiveSub && investorMatches.length > 3 && (
                      <p className="pt-1 text-center text-xs text-(--color-muted)">
                        {investorMatches.length - 3} more match{investorMatches.length - 3 !== 1 ? "es" : ""} hidden.{" "}
                        <span className="font-semibold text-(--color-primary)">Upgrade to a paid plan</span> to see all.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
