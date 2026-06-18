"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Author = { id: string; full_name: string | null; member_role: string | null } | null;

type FeatureRequest = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  author_id: string;
  author: Author;
  vote_count: number;
  voted_by_me: boolean;
};

type SortKey = "votes" | "newest";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-(--color-surface-soft) text-(--color-muted) border border-(--color-hairline)" },
  planned: { label: "Planned", cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  in_progress: { label: "In Progress", cls: "bg-amber-400/10 text-amber-400 border border-amber-400/20" },
  done: { label: "Done", cls: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  declined: { label: "Declined", cls: "bg-red-500/10 text-red-400 border border-red-500/20" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function roleLabel(role: string | null | undefined) {
  if (role === "investor") return "Investor";
  if (role === "startup") return "Founder";
  if (role === "ecosystem_partner") return "Partner";
  return "";
}

function roleColor(role: string | null | undefined) {
  if (role === "investor") return "text-amber-400";
  if (role === "startup") return "text-orange-400";
  if (role === "ecosystem_partner") return "text-purple-400";
  return "text-(--color-muted)";
}

function RequestCard({
  request,
  onVote,
}: {
  request: FeatureRequest;
  onVote: (id: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.open;

  return (
    <article className="flex gap-4 rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-5 transition-shadow hover:shadow-sm">
      {/* Vote column */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <button
          type="button"
          onClick={() => onVote(request.id)}
          aria-label={request.voted_by_me ? "Remove vote" : "Upvote"}
          className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
            request.voted_by_me
              ? "border-(--color-primary) bg-(--color-primary)/10 text-(--color-primary)"
              : "border-(--color-hairline) bg-(--color-surface-soft) text-(--color-muted) hover:border-(--color-primary) hover:text-(--color-primary)"
          }`}
        >
          <svg className="h-4 w-4" fill={request.voted_by_me ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <span className={`text-sm font-bold tabular-nums ${request.voted_by_me ? "text-(--color-primary)" : "text-(--color-ink)"}`}>
          {request.vote_count}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="flex-1 font-semibold text-(--color-ink) leading-snug">{request.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-(--color-body) leading-relaxed line-clamp-3">{request.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-(--color-muted)">
          <span className="font-medium text-(--color-body)">{request.author?.full_name || "Unknown"}</span>
          {roleLabel(request.author?.member_role) && (
            <span className={`font-medium ${roleColor(request.author?.member_role)}`}>
              · {roleLabel(request.author?.member_role)}
            </span>
          )}
          <span>· {timeAgo(request.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

function ComposeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (req: FeatureRequest) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/feature-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json() as FeatureRequest & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to submit.");
      setSubmitting(false);
      return;
    }
    onCreated(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-(--color-hairline) bg-(--color-canvas) shadow-2xl">
        <div className="flex items-center justify-between border-b border-(--color-hairline) px-5 py-4">
          <h2 className="font-bold text-(--color-ink)">New Feature Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-(--color-hairline) text-(--color-muted) hover:bg-(--color-surface-soft) transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-(--color-muted)">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, clear description of the feature"
              maxLength={200}
              required
              className="w-full rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2.5 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-(--color-muted)">
              Description
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the problem it solves and how it should work…"
              rows={5}
              maxLength={2000}
              required
              className="w-full resize-none rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2.5 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
            />
            <p className="mt-1 text-right text-xs text-(--color-muted)">{body.length}/2000</p>
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-(--color-hairline) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FeatureRequestsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("votes");
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));

    fetch("/api/feature-requests")
      .then((r) => r.json())
      .then((d: FeatureRequest[]) => setRequests(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [supabase]);

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (sort === "votes") return b.vote_count - a.vote_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requests, sort]);

  const handleVote = async (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, voted_by_me: !r.voted_by_me, vote_count: r.voted_by_me ? r.vote_count - 1 : r.vote_count + 1 }
          : r,
      ),
    );
    await fetch(`/api/feature-requests/${id}/vote`, { method: "POST" });
  };

  const handleCreated = (req: FeatureRequest) => {
    setRequests((prev) => [req, ...prev]);
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">FOUNDERS ARENA</p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-(--color-ink)">Feature Requests</h1>
              <p className="mt-1 text-sm text-(--color-muted)">Suggest and upvote features for the platform.</p>
            </div>
            {currentUserId && (
              <button
                type="button"
                onClick={() => setShowCompose(true)}
                className="shrink-0 rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                + New Request
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="mt-5 flex items-center gap-2 border-b border-(--color-hairline) pb-0">
            <button
              type="button"
              onClick={() => setSort("votes")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                sort === "votes"
                  ? "border-(--color-primary) text-(--color-primary)"
                  : "border-transparent text-(--color-muted) hover:text-(--color-ink)"
              }`}
            >
              Top Voted
            </button>
            <button
              type="button"
              onClick={() => setSort("newest")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                sort === "newest"
                  ? "border-(--color-primary) text-(--color-primary)"
                  : "border-transparent text-(--color-muted) hover:text-(--color-ink)"
              }`}
            >
              Newest
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6 pt-6 pb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)" />
          ))
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-10 text-center">
            <p className="text-sm font-medium text-(--color-ink)">No requests yet.</p>
            <p className="mt-1 text-xs text-(--color-muted)">Be the first to suggest a feature for the platform.</p>
            {currentUserId && (
              <button
                type="button"
                onClick={() => setShowCompose(true)}
                className="mt-4 rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Submit a request
              </button>
            )}
          </div>
        ) : (
          sorted.map((r) => (
            <RequestCard key={r.id} request={r} onVote={handleVote} />
          ))
        )}
      </div>

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
