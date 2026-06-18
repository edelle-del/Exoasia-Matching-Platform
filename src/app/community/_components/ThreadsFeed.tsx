"use client";

import { useEffect, useRef, useState } from "react";

type Author = { id: string; full_name: string | null; member_role: string | null } | null;

type Thread = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: Author;
  like_count: number;
  reply_count: number;
  liked_by_me: boolean;
};

type Reply = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: Author;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function roleColor(role: string | null | undefined) {
  if (role === "investor") return "text-amber-400";
  if (role === "startup") return "text-orange-400";
  if (role === "ecosystem_partner") return "text-purple-400";
  return "text-(--color-muted)";
}

function roleLabel(role: string | null | undefined) {
  if (role === "investor") return "Investor";
  if (role === "startup") return "Founder";
  if (role === "ecosystem_partner") return "Partner";
  return "";
}

function Avatar({ author }: { author: Author }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/15 text-sm font-semibold text-(--color-primary)">
      {initials(author?.full_name)}
    </div>
  );
}

function ReplyItem({ reply }: { reply: Reply }) {
  return (
    <div className="flex gap-3 pt-3">
      <Avatar author={reply.author} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="font-semibold text-sm text-(--color-ink)">{reply.author?.full_name || "Unknown"}</span>
          {roleLabel(reply.author?.member_role) && (
            <span className={`text-xs font-medium ${roleColor(reply.author?.member_role)}`}>
              {roleLabel(reply.author?.member_role)}
            </span>
          )}
          <span className="text-xs text-(--color-muted)">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm text-(--color-body) leading-relaxed whitespace-pre-wrap break-words">{reply.body}</p>
      </div>
    </div>
  );
}

function ThreadCard({
  thread,
  currentUserId,
  onLike,
}: {
  thread: Thread;
  currentUserId: string | null;
  onLike: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    const res = await fetch(`/api/threads/${thread.id}/replies`);
    const data = await res.json() as Reply[];
    setReplies(data);
    setLoadingReplies(false);
  };

  const handleToggleExpand = () => {
    if (!expanded && replies.length === 0) void loadReplies();
    setExpanded((v) => !v);
  };

  const handlePostReply = async () => {
    if (!replyBody.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/threads/${thread.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody }),
    });
    if (res.ok) {
      const reply = await res.json() as Reply;
      setReplies((prev) => [...prev, reply]);
      setReplyBody("");
    }
    setPosting(false);
  };

  return (
    <article className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4 transition-shadow hover:shadow-sm">
      <div className="flex gap-3">
        <Avatar author={thread.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-semibold text-sm text-(--color-ink)">{thread.author?.full_name || "Unknown"}</span>
            {roleLabel(thread.author?.member_role) && (
              <span className={`text-xs font-medium ${roleColor(thread.author?.member_role)}`}>
                {roleLabel(thread.author?.member_role)}
              </span>
            )}
            <span className="text-xs text-(--color-muted)">{timeAgo(thread.created_at)}</span>
          </div>
          <p className="mt-1.5 text-sm text-(--color-body) leading-relaxed whitespace-pre-wrap break-words">{thread.body}</p>

          <div className="mt-3 flex items-center gap-4">
            {/* Like */}
            <button
              type="button"
              onClick={() => onLike(thread.id)}
              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                thread.liked_by_me
                  ? "text-(--color-primary)"
                  : "text-(--color-muted) hover:text-(--color-primary)"
              }`}
            >
              <svg className="h-4 w-4" fill={thread.liked_by_me ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {thread.like_count > 0 && <span>{thread.like_count}</span>}
            </button>

            {/* Reply toggle */}
            <button
              type="button"
              onClick={handleToggleExpand}
              className="flex items-center gap-1.5 text-xs font-semibold text-(--color-muted) hover:text-(--color-ink) transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {thread.reply_count > 0 ? `${thread.reply_count} ${thread.reply_count === 1 ? "reply" : "replies"}` : "Reply"}
            </button>
          </div>
        </div>
      </div>

      {/* Replies panel */}
      {expanded && (
        <div className="mt-4 border-t border-(--color-hairline) pt-1 pl-12 space-y-0">
          {loadingReplies ? (
            <p className="pt-3 text-xs text-(--color-muted)">Loading…</p>
          ) : (
            replies.map((r) => <ReplyItem key={r.id} reply={r} />)
          )}

          {currentUserId && (
            <div className="flex gap-2 pt-3">
              <textarea
                ref={textareaRef}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handlePostReply();
                }}
              />
              <button
                type="button"
                onClick={() => void handlePostReply()}
                disabled={posting || !replyBody.trim()}
                className="self-end rounded-xl bg-(--color-primary) px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {posting ? "…" : "Reply"}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function ThreadsFeed({ currentUserId }: { currentUserId: string | null }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/threads")
      .then((r) => r.json())
      .then((d: Thread[]) => setThreads(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    setError("");
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json() as Thread & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to post.");
    } else {
      setThreads((prev) => [data, ...prev]);
      setBody("");
    }
    setPosting(false);
  };

  const handleLike = async (id: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              liked_by_me: !t.liked_by_me,
              like_count: t.liked_by_me ? t.like_count - 1 : t.like_count + 1,
            }
          : t,
      ),
    );
    await fetch(`/api/threads/${id}/like`, { method: "POST" });
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      {currentUserId && (
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4 space-y-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share something with the community…"
            rows={3}
            className="w-full resize-none rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2.5 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handlePost();
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-(--color-muted)">{body.length}/2000</span>
            <button
              type="button"
              onClick={() => void handlePost()}
              disabled={posting || !body.trim()}
              className="rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8 text-center text-sm text-(--color-muted)">
          No posts yet. Be the first to start a conversation.
        </div>
      ) : (
        threads.map((t) => (
          <ThreadCard key={t.id} thread={t} currentUserId={currentUserId} onLike={handleLike} />
        ))
      )}
    </div>
  );
}
