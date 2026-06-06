"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../providers";

type MatchRow = {
  id: string;
  member_a_id: string;
  member_b_id: string;
  fit_score: number | null;
  summary: string | null;
  status: string;
  member_a_status: string;
  member_b_status: string;
  created_at: string;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  sector: string | null;
  stage: string | null;
  verification_status: string | null;
};

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [form, setForm] = useState({ summary: "", fitScore: "" });

  useEffect(() => {
    if (role !== "advisor" && role !== "staff" && role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/matching/manual/${params.matchId}`);
      if (!res.ok) {
        setMessage("Match not found.");
        setLoading(false);
        return;
      }

      const { match: matchData, profiles: profileRows } = await res.json();
      setMatch(matchData as MatchRow);
      setProfiles((profileRows ?? []) as ProfileRow[]);
      setForm({
        summary: matchData.summary ?? "",
        fitScore: typeof matchData.fit_score === "number" ? String(matchData.fit_score) : "",
      });
      setLoading(false);
    };

    void load();
  }, [params.matchId, role, router]);

  const memberA = profiles.find((p) => p.id === match?.member_a_id);
  const memberB = profiles.find((p) => p.id === match?.member_b_id);

  const handleSave = async () => {
    if (!match) return;
    setBusy(true);
    setMessage("");

    const res = await fetch(`/api/matching/manual/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: form.summary,
        fit_score: form.fitScore ? Number(form.fitScore) : null,
      }),
    });

    const payload = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(payload.error || "Failed to save changes.");
      return;
    }

    setMatch((prev) =>
      prev
        ? {
            ...prev,
            summary: form.summary,
            fit_score: form.fitScore ? Number(form.fitScore) : null,
          }
        : prev,
    );
    setMessage("Match updated successfully.");
  };

  const handleDelete = async () => {
    if (!match) return;
    if (!window.confirm("Delete this match? This cannot be undone.")) return;

    setBusy(true);
    setMessage("");

    const res = await fetch(`/api/matching/manual/${match.id}`, {
      method: "DELETE",
    });

    const payload = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(payload.error || "Failed to delete match.");
      return;
    }

    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 text-sm text-[var(--color-muted)]">
          Loading match…
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-4xl space-y-4">
          <p className="text-sm text-red-600">{message || "Match not found."}</p>
          <Link href="/dashboard" className="text-sm text-[var(--color-primary)] hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <section className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-8">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
          >
            ← Dashboard
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
            Advisor match detail
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            Edit or delete match
          </h1>
          <p className="mt-2 text-sm text-[var(--color-body)]">
            Update the match summary, fit score, or remove the match entirely.
          </p>

          {/* Status badge */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={match.status} />
            <span className="text-xs text-[var(--color-muted)]">
              Created {new Date(match.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-lg p-3 text-sm ${
                message.includes("success") || message.includes("updated")
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-yellow-50 text-yellow-700"
              }`}
            >
              {message}
            </div>
          )}
        </section>

        {/* Member profiles */}
        <section className="grid gap-4 md:grid-cols-2">
          <InfoCard title="Member A" profile={memberA} memberStatus={match.member_a_status} />
          <InfoCard title="Member B" profile={memberB} memberStatus={match.member_b_status} />
        </section>

        {/* Edit form */}
        <section className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-ink)]">
              Summary
            </label>
            <textarea
              className="gn-input mt-1 h-28"
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-ink)]">
              Fit score (0–100)
            </label>
            <input
              className="gn-input mt-1 max-w-[140px]"
              type="number"
              min={0}
              max={100}
              value={form.fitScore}
              onChange={(e) => setForm((prev) => ({ ...prev, fitScore: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-hairline)] pt-5">
            <button
              className="gn-btn-primary"
              type="button"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              className="rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              type="button"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete match"}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700",
  approved:   "bg-blue-50 text-blue-700",
  flagged:    "bg-orange-50 text-orange-700",
  accepted:   "bg-emerald-50 text-emerald-700",
  declined:   "bg-red-50 text-red-600",
  introduced: "bg-purple-50 text-purple-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

function InfoCard({
  title,
  profile,
  memberStatus,
}: {
  title: string;
  profile: ProfileRow | undefined;
  memberStatus: string;
}) {
  const statusCls = memberStatus === "accepted"
    ? "text-emerald-600"
    : memberStatus === "declined"
      ? "text-red-500"
      : "text-[var(--color-muted)]";

  return (
    <div className="rounded-[20px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {title}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
        {profile?.business_name || profile?.full_name || "Unknown company"}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-body)]">
        {profile?.sector || "Unspecified sector"} · Stage {profile?.stage || "n/a"}
      </p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Verification: {profile?.verification_status || "unverified"}
      </p>
      <p className={`mt-2 text-xs font-semibold capitalize ${statusCls}`}>
        Response: {memberStatus}
      </p>
    </div>
  );
}
