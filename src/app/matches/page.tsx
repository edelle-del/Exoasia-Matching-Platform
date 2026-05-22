"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { createClient } from "@/lib/supabase/client";
import { fetchUserMatches, fetchUserProjects, type MatchRecord, type ProjectRecord } from "@/lib/app-data";
import { getHomePathForRole } from "@/lib/auth/access";

type UIMatch = MatchRecord & { counterpart_name: string | null };

export default function MatchesPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, role } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<UIMatch[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmMatch, setConfirmMatch] = useState<UIMatch | null>(null);

  const loadMatches = async () => {
    if (!user?.id) return;
    const rows = await fetchUserMatches(supabase, user.id);
    setMatches(rows);
  };

  useEffect(() => {
    if (role && ["advisor", "admin"].includes(role)) {
      router.replace(getHomePathForRole(role));
      return;
    }

    void loadMatches();
    if (user?.id) {
      fetchUserProjects(supabase, user.id).then(setProjects);
    }
  }, [role, router, user?.id]);

  const handleDecision = async (
    match: UIMatch,
    decision: "accepted" | "declined",
  ) => {
    if (!user?.id) return;
    setBusyId(match.id);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const payload = await res.json();
    setBusyId(null);
    if (!res.ok) {
      window.alert(payload.error || "Failed to respond to match.");
      return;
    }
    await loadMatches();
  };

  const handleAcceptClick = (match: UIMatch) => {
    setConfirmMatch(match);
  };

  const handleConfirmAccept = async () => {
    if (!confirmMatch) return;
    const match = confirmMatch;
    setConfirmMatch(null);
    await handleDecision(match, "accepted");
  };

  const handleGenerateAIMatches = async () => {
    setIsGenerating(true);
    const response = await fetch("/api/matching/generate", {
      method: "POST",
    });

    const payload = (await response.json()) as {
      error?: string;
      generated?: number;
    };
    setIsGenerating(false);

    if (!response.ok) {
      window.alert(payload.error || "Failed to generate AI matches.");
      return;
    }

    await loadMatches();
    window.alert(`Generated ${payload.generated ?? 0} match recommendations.`);
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Your matches
          </h1>
          <div className="mt-4">
            {role !== "advisor" && role !== "admin" && (
              <button
                type="button"
                onClick={handleGenerateAIMatches}
                className="gn-btn-primary"
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate AI Matches"}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 px-[5%] py-10">
        {matches.length === 0 ? (
          <EmptyState text="No active matches yet for this cycle." />
        ) : (
          matches.map((match) => {
            const statusClass =
              match.status === "accepted" || match.status === "approved"
                ? "bg-green-100 text-green-700"
                : match.status === "declined"
                  ? "bg-gray-100 text-gray-700"
                  : "bg-yellow-100 text-yellow-700";

            return (
              <div
                key={match.id}
                className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-(--color-primary) px-3 py-1 text-xs font-semibold text-white">
                    {match.fit_score ?? "-"} fit
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {match.status}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-(--color-ink)">
                  {match.summary || "Strategic compatibility match"}
                </h2>
                <p className="mt-2 text-sm text-(--color-body)">
                  Matched with: {match.counterpart_name || "Verified member"}
                </p>

                {projects.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProjects((prev) => {
                          const next = new Set(prev);
                          if (next.has(match.id)) next.delete(match.id);
                          else next.add(match.id);
                          return next;
                        })
                      }
                      className="text-xs font-medium text-(--color-primary) hover:underline"
                    >
                      {expandedProjects.has(match.id) ? "Hide your projects ▲" : "View your projects for this match ▼"}
                    </button>

                    {expandedProjects.has(match.id) && (
                      <div className="mt-3 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
                          Your Projects
                        </p>
                        <div className="space-y-2">
                          {projects.map((p) => (
                            <div key={p.id} className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-(--color-ink)">{p.name}</p>
                                {p.stage && (
                                  <span className="mt-0.5 inline-block rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)">
                                    {p.stage}
                                  </span>
                                )}
                                {p.description && (
                                  <p className="mt-1 text-xs text-(--color-body) line-clamp-2">{p.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <a
                          href="/projects/new"
                          className="mt-3 block text-xs text-(--color-muted) hover:text-(--color-primary) hover:underline"
                        >
                          + Add another project
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                    const isA = match.member_a_id === user?.id;
                    const myStatus = isA ? match.member_a_status : match.member_b_status;
                    const counterpartStatus = isA ? match.member_b_status : match.member_a_status;
                    const canRespond =
                      ["pending", "approved"].includes(match.status) &&
                      myStatus === "pending";
                    return (
                      <div className="mt-5 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            disabled={!canRespond || busyId === match.id}
                            onClick={() => handleAcceptClick(match)}
                            className="gn-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                          >
                            {busyId === match.id ? "Saving..." : "Accept"}
                          </button>
                          <button
                            disabled={!canRespond || busyId === match.id}
                            onClick={() => handleDecision(match, "declined")}
                            className="gn-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                          >
                            Decline
                          </button>
                          {myStatus === "accepted" && (
                            <span className="text-sm font-semibold text-green-600">
                              ✓ You accepted
                            </span>
                          )}
                          {myStatus === "declined" && (
                            <span className="text-sm font-semibold text-gray-400">
                              ✕ You declined
                            </span>
                          )}
                        </div>
                        {counterpartStatus === "accepted" && (
                          <p className="text-xs font-medium text-green-600">✓ The other party has accepted</p>
                        )}
                        {counterpartStatus === "declined" && (
                          <p className="text-xs font-medium text-gray-400">✕ The other party has declined</p>
                        )}
                        {counterpartStatus === "pending" && (
                          <p className="text-xs font-medium text-amber-500">Awaiting the other party's response</p>
                        )}
                      </div>
                    );
                  })()}
              </div>
            );
          })
        )}
      </div>

      {confirmMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-(--color-ink)">
              Accept this match?
            </h2>
            <p className="mt-2 text-sm text-(--color-body)">
              {confirmMatch.summary || "Strategic compatibility match"}
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              Counterpart: {confirmMatch.counterpart_name || "Verified member"}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmAccept}
                className="gn-btn-primary"
              >
                Yes, accept
              </button>
              <button
                type="button"
                onClick={() => setConfirmMatch(null)}
                className="gn-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8 text-sm text-(--color-body)">
      {text}
    </div>
  );
}
