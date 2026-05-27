"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../providers";
import {
  fetchAdvisorMatchQueue,
  type AdvisorMatchQueueRecord,
} from "@/lib/app-data";
import { STAGE_CONFIG } from "@/types/constants";

const STAGE_COLORS: Record<string, string> = {
  "0": "bg-slate-100 text-slate-600",
  "1": "bg-blue-100 text-blue-700",
  "2": "bg-amber-100 text-amber-700",
  "3": "bg-purple-100 text-purple-700",
  "4": "bg-green-100 text-green-700",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

function FitScore({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : "text-slate-500";
  return (
    <span className={`text-2xl font-semibold tabular-nums ${color}`}>
      {score}
      <span className="text-sm font-normal text-(--color-muted)">/100</span>
    </span>
  );
}

type ActiveFilter = "all" | "flagged";

export default function AdvisorMatchQueuePage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [matches, setMatches] = useState<AdvisorMatchQueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Map<string, { text: string; ok: boolean }>
  >(new Map());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchAdvisorMatchQueue(supabase);
      setMatches(data);
      setIsLoading(false);
    };
    void load();
  }, [supabase]);

  if (role !== "advisor" && role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-screen px-[5%] py-12">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link
          href="/dashboard"
          className="text-(--color-primary) hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const handleAction = async (
    matchId: string,
    action: "approve" | "flag" | "decline",
  ) => {
    setBusyId(matchId);
    setMessages((prev) => {
      const next = new Map(prev);
      next.delete(matchId);
      return next;
    });

    const res = await fetch(`/api/advisor/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const payload = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setMessages((prev) =>
        new Map(prev).set(matchId, {
          text: payload.error ?? "Action failed.",
          ok: false,
        }),
      );
      return;
    }

    if (action === "approve" || action === "decline") {
      // Remove from queue entirely
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } else {
      // Update status in place (flagged stays in queue)
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: "flagged" } : m)),
      );
      setMessages((prev) =>
        new Map(prev).set(matchId, {
          text: "Flagged for follow-up.",
          ok: true,
        }),
      );
    }
  };

  const displayed =
    filter === "flagged"
      ? matches.filter((m) => m.status === "flagged")
      : matches;

  const pendingCount = matches.filter((m) => m.status === "pending").length;
  const flaggedCount = matches.filter((m) => m.status === "flagged").length;

  return (
    <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-(--color-muted) transition hover:text-(--color-ink)"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Match review queue
          </h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Approve or decline AI-generated matches before members can see them.
            Approved matches notify both members and open their response window.
          </p>
        </div>

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              Pending review
            </p>
            <p className="mt-2 text-3xl font-semibold text-(--color-primary)">
              {isLoading ? "—" : pendingCount}
            </p>
          </div>
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              Flagged
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-500">
              {isLoading ? "—" : flaggedCount}
            </p>
          </div>
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              Total in queue
            </p>
            <p className="mt-2 text-3xl font-semibold text-(--color-ink)">
              {isLoading ? "—" : matches.length}
            </p>
          </div>
        </section>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) p-1">
          {(["all", "flagged"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-[10px] py-2.5 text-sm font-semibold capitalize transition ${
                filter === f
                  ? "bg-(--color-canvas) text-(--color-ink) shadow-sm"
                  : "text-(--color-muted) hover:text-(--color-body)"
              }`}
            >
              {f === "all"
                ? `All (${matches.length})`
                : `Flagged (${flaggedCount})`}
            </button>
          ))}
        </div>

        {/* Queue */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-(--color-muted)">
            Loading queue...
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-(--color-hairline) bg-(--color-surface-soft) py-16 text-center">
            <p className="text-sm font-semibold text-(--color-ink)">
              Queue is clear
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              {filter === "flagged"
                ? "No flagged matches."
                : "No matches awaiting review."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {displayed.map((match) => (
              <MatchReviewCard
                key={match.id}
                match={match}
                busy={busyId === match.id}
                message={messages.get(match.id) ?? null}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberSideCard({
  member,
  label,
}: {
  member: AdvisorMatchQueueRecord["member_a"];
  label: "Member A" | "Member B";
}) {
  if (!member) {
    return (
      <div className="flex-1 rounded-[14px] border border-(--color-hairline) bg-(--color-surface-soft) p-4">
        <p className="text-xs text-(--color-muted)">{label}</p>
        <p className="mt-1 text-sm text-(--color-ink)">Unknown member</p>
      </div>
    );
  }

  const stageLabel =
    STAGE_CONFIG[member.stage as keyof typeof STAGE_CONFIG]?.label ??
    member.stage;

  return (
    <div className="flex-1 rounded-[14px] border border-(--color-hairline) bg-(--color-surface-soft) p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-(--color-ink)">
            {member.full_name || "—"}
          </p>
          <p className="truncate text-xs text-(--color-muted)">
            {member.business_name || "No business"}
          </p>
        </div>
        <Badge
          label={`S${member.stage} · ${stageLabel}`}
          colorClass={
            STAGE_COLORS[member.stage] ?? "bg-slate-100 text-slate-600"
          }
        />
      </div>

      {member.sector && (
        <p className="mt-2 text-xs text-(--color-body)">{member.sector}</p>
      )}

      {/* ASK categories */}
      {member.ask_categories?.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
            Asks
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {member.ask_categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* OFFER categories */}
      {member.offer_categories?.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
            Offers
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {member.offer_categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/advisor/members/${member.id}`}
        className="mt-3 block text-xs font-semibold text-(--color-primary) hover:underline"
      >
        View full profile →
      </Link>
    </div>
  );
}

function MatchReviewCard({
  match,
  busy,
  message,
  onAction,
}: {
  match: AdvisorMatchQueueRecord;
  busy: boolean;
  message: { text: string; ok: boolean } | null;
  onAction: (id: string, action: "approve" | "flag" | "decline") => void;
}) {
  const isFlagged = match.status === "flagged";

  return (
    <div
      className={`rounded-[20px] border bg-(--color-canvas) p-6 ${
        isFlagged
          ? "border-amber-200 bg-amber-50/30"
          : "border-(--color-hairline)"
      }`}
    >
      {isFlagged && (
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <i
              className="ri-flag-2-line mr-1 align-[-2px]"
              aria-hidden="true"
            />
            Flagged for follow-up
          </span>
        </div>
      )}

      {/* Fit score + summary */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex-1">
          {match.summary && (
            <p className="text-sm text-(--color-body)">{match.summary}</p>
          )}
          <p className="mt-1 text-xs text-(--color-muted)">
            Generated{" "}
            {new Date(match.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
            Fit score
          </p>
          <FitScore score={match.fit_score} />
        </div>
      </div>

      {/* Side-by-side profiles */}
      <div className="flex gap-3">
        <MemberSideCard member={match.member_a} label="Member A" />
        <div className="flex items-center">
          <span className="text-lg text-(--color-muted)">↔</span>
        </div>
        <MemberSideCard member={match.member_b} label="Member B" />
      </div>

      {/* Action error / message */}
      {message && (
        <p
          className={`mt-4 text-sm ${message.ok ? "text-amber-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-(--color-hairline) pt-4">
        <button
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          disabled={busy}
          onClick={() => onAction(match.id, "approve")}
        >
          {busy ? "Processing..." : "Approve"}
        </button>
        <button
          className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          disabled={busy}
          onClick={() => onAction(match.id, "flag")}
        >
          Flag
        </button>
        <button
          className="rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          disabled={busy}
          onClick={() => onAction(match.id, "decline")}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
