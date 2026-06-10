"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CompletenessCategory, CompletenessItem, CompletenessResponse } from "@/app/api/startup/completeness/route";

const CATEGORY_META: Record<CompletenessCategory, { label: string; badgeColor: string }> = {
  profile: {
    label: "Profile",
    badgeColor: "bg-violet-500/10 text-violet-400",
  },
  project: {
    label: "Project",
    badgeColor: "bg-indigo-500/10 text-indigo-400",
  },
  data_room: {
    label: "Data Room",
    badgeColor: "bg-amber-500/10 text-amber-400",
  },
  investment: {
    label: "Investment Profile",
    badgeColor: "bg-emerald-500/10 text-emerald-400",
  },
  partnership: {
    label: "Partnership Profile",
    badgeColor: "bg-sky-500/10 text-sky-400",
  },
};

const ROLE_CATEGORIES: Record<string, CompletenessCategory[]> = {
  startup: ["profile", "project", "data_room"],
  investor: ["profile", "investment"],
  ecosystem_partner: ["profile", "partnership"],
};

export default function CompleteProfilePage() {
  const [data, setData] = useState<CompletenessResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/startup/completeness")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const memberRole = data?.memberRole ?? null;
  const categories = memberRole
    ? (ROLE_CATEGORIES[memberRole] ?? ["profile"])
    : ["profile" as CompletenessCategory];

  const percent = data
    ? Math.round((data.completedCount / data.totalCount) * 100)
    : 0;

  const allDone = data?.missingCount === 0;

  const roleLabel =
    memberRole === "investor" ? "Investor"
    : memberRole === "ecosystem_partner" ? "Partner"
    : "Startup";

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="text-sm text-(--color-primary) hover:underline">
            ← Dashboard
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-(--color-ink)">Complete your profile</h1>
            {!loading && memberRole && (
              <span className="rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-xs font-semibold text-(--color-primary)">
                {roleLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-(--color-body)">
            A complete profile improves your match quality and builds confidence with connections.
          </p>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-(--color-muted)">
                {loading ? "Loading…" : `${data?.completedCount ?? 0} of ${data?.totalCount ?? 0} completed`}
              </span>
              <span className="text-xs font-bold text-(--color-ink)">{loading ? "—" : `${percent}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-(--color-hairline) overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percent}%`,
                  background: percent === 100
                    ? "#10B981"
                    : "linear-gradient(to right, #ff6b1f, #ff2e93)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-8">
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-(--color-surface-soft)" />
            ))}
          </div>
        )}

        {!loading && allDone && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-emerald-400">Profile fully complete</p>
            <p className="mt-1 text-sm text-(--color-muted)">
              You&apos;re in the best position to attract high-quality matches.
            </p>
          </div>
        )}

        {!loading && data && !allDone && (categories as CompletenessCategory[]).map((cat) => {
          const catItems = data.items.filter((i: CompletenessItem) => i.category === cat);
          if (catItems.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const catMissing = catItems.filter((i: CompletenessItem) => !i.completed).length;

          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badgeColor}`}>
                  {meta.label}
                </span>
                {catMissing > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                    {catMissing} missing
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {catItems.map((item: CompletenessItem) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4 transition-colors ${
                      item.completed ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                            <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${item.completed ? "text-(--color-muted)" : "text-(--color-ink)"}`}>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs text-(--color-muted)">{item.description}</p>
                      </div>

                      {!item.completed && (
                        <Link
                          href={item.href}
                          className="shrink-0 rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition hover:bg-(--color-surface-soft)"
                        >
                          Fix this →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
