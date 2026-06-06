"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../providers";
import {
  fetchAdvisorIntroductionQueue,
  type AdvisorIntroQueueRecord,
} from "@/lib/app-data";

function getInitials(name: string | null, business: string | null) {
  const source = name || business || "?";
  return source
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdvisorIntroductionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [intros, setIntros] = useState<AdvisorIntroQueueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Per-card state: intro note text + busy + message
  const [introNotes, setIntroNotes] = useState<Map<string, string>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Map<string, { text: string; ok: boolean }>
  >(new Map());

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchAdvisorIntroductionQueue(supabase);
      setIntros(data);
      setIsLoading(false);
    };
    void load();
  }, [supabase]);

  if (role !== "advisor" && role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link href="/dashboard" className="text-(--color-primary) hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const setNote = (matchId: string, value: string) => {
    setIntroNotes((prev) => new Map(prev).set(matchId, value));
  };

  const handleMarkIntroduced = async (matchId: string) => {
    const introNote = introNotes.get(matchId) ?? "";
    setBusyId(matchId);
    setMessages((prev) => {
      const next = new Map(prev);
      next.delete(matchId);
      return next;
    });

    const res = await fetch(`/api/advisor/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "introduce", intro_note: introNote }),
    });

    const payload = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setMessages((prev) =>
        new Map(prev).set(matchId, {
          text: payload.error ?? "Failed to mark as introduced.",
          ok: false,
        }),
      );
      return;
    }

    // Remove from queue on success
    setIntros((prev) => prev.filter((m) => m.id !== matchId));
  };

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">

        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-(--color-muted) transition hover:text-(--color-ink)"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Introduction facilitation
          </h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Both members have accepted these matches. Write the warm
            introduction and mark it as sent.
          </p>
        </div>

        {/* Count */}
        <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
            Pending introductions
          </p>
          <p className="mt-2 text-3xl font-semibold text-(--color-primary)">
            {isLoading ? "—" : intros.length}
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-(--color-muted)">
            Loading...
          </div>
        ) : intros.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-(--color-hairline) bg-(--color-surface-soft) py-16 text-center">
            <p className="text-sm font-semibold text-(--color-ink)">
              All caught up
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              No pending introductions right now.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {intros.map((intro) => {
              const isBusy = busyId === intro.id;
              const note = introNotes.get(intro.id) ?? "";
              const msg = messages.get(intro.id) ?? null;
              const memberA = intro.member_a;
              const memberB = intro.member_b;
              const nameA =
                memberA?.full_name ||
                memberA?.business_name ||
                "Member A";
              const nameB =
                memberB?.full_name ||
                memberB?.business_name ||
                "Member B";
              const bizA = memberA?.business_name || "";
              const bizB = memberB?.business_name || "";

              return (
                <div
                  key={intro.id}
                  className="rounded-[20px] border border-(--color-hairline) bg-(--color-canvas) p-6"
                >
                  {/* Member pair header */}
                  <div className="flex items-start gap-4">
                    {/* Member A avatar */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-sm font-semibold text-white">
                      {getInitials(memberA?.full_name ?? null, memberA?.business_name ?? null)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          href={`/advisor/members/${memberA?.id}`}
                          className="text-sm font-semibold text-(--color-ink) hover:underline"
                        >
                          {nameA}
                        </Link>
                        {bizA && nameA !== bizA && (
                          <span className="text-xs text-(--color-muted)">{bizA}</span>
                        )}
                        <span className="text-sm text-(--color-muted)">↔</span>
                        <Link
                          href={`/advisor/members/${memberB?.id}`}
                          className="text-sm font-semibold text-(--color-ink) hover:underline"
                        >
                          {nameB}
                        </Link>
                        {bizB && nameB !== bizB && (
                          <span className="text-xs text-(--color-muted)">{bizB}</span>
                        )}
                      </div>

                      {/* Sectors */}
                      <p className="mt-0.5 text-xs text-(--color-muted)">
                        {[memberA?.sector, memberB?.sector]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    {/* Fit score */}
                    {typeof intro.fit_score === "number" && (
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
                          Fit
                        </p>
                        <p className="text-xl font-semibold text-(--color-primary)">
                          {intro.fit_score}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Match context */}
                  {intro.summary && (
                    <div className="mt-4 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-(--color-muted)">
                        Match summary
                      </p>
                      <p className="mt-1 text-sm text-(--color-body)">
                        {intro.summary}
                      </p>
                    </div>
                  )}

                  {/* ASK/OFFER context */}
                  {(memberA?.asks_summary || memberB?.offers_summary ||
                    memberA?.offers_summary || memberB?.asks_summary) && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {memberA && (memberA.asks_summary || memberA.offers_summary) && (
                        <div className="rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
                          <p className="text-xs font-semibold text-(--color-ink)">{nameA}</p>
                          {memberA.asks_summary && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              <span className="font-semibold text-blue-700">Asks: </span>
                              {memberA.asks_summary}
                            </p>
                          )}
                          {memberA.offers_summary && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              <span className="font-semibold text-emerald-700">Offers: </span>
                              {memberA.offers_summary}
                            </p>
                          )}
                        </div>
                      )}
                      {memberB && (memberB.asks_summary || memberB.offers_summary) && (
                        <div className="rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
                          <p className="text-xs font-semibold text-(--color-ink)">{nameB}</p>
                          {memberB.asks_summary && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              <span className="font-semibold text-blue-700">Asks: </span>
                              {memberB.asks_summary}
                            </p>
                          )}
                          {memberB.offers_summary && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              <span className="font-semibold text-emerald-700">Offers: </span>
                              {memberB.offers_summary}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Intro note */}
                  <div className="mt-5">
                    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                      Introduction note
                      <span className="ml-1 font-normal normal-case text-(--color-muted)">
                        (optional — saved with the match record)
                      </span>
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-4 py-3 text-sm text-(--color-ink) placeholder:text-(--color-muted) focus:border-(--color-primary) focus:outline-none"
                      rows={4}
                      placeholder={`Hi ${nameA} and ${nameB},\n\nI'd like to connect the two of you based on your shared interests...`}
                      value={note}
                      onChange={(e) => setNote(intro.id, e.target.value)}
                      disabled={isBusy}
                    />
                  </div>

                  {/* Error message */}
                  {msg && !msg.ok && (
                    <p className="mt-2 text-sm text-red-600">{msg.text}</p>
                  )}

                  {/* Action */}
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-(--color-hairline) pt-4">
                    <p className="text-xs text-(--color-muted)">
                      Accepted{" "}
                      {new Date(intro.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <button
                      className="gn-btn-primary"
                      disabled={isBusy}
                      onClick={() => handleMarkIntroduced(intro.id)}
                    >
                      {isBusy ? "Marking..." : "Mark as introduced"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
