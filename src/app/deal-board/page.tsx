"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDealCards, touchDealCard } from "@/lib/app-data";
import { useAuth } from "../providers";

const BOARD_COLUMNS = [
  "Qualified",
  "Intro & Scoping",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "On Hold",
] as const;

// Maps display label → DB enum value stored in deal_cards.stage
const STAGE_DB: Record<string, string> = {
  "Qualified":       "discover",
  "Intro & Scoping": "intro",
  "Proposal":        "proposal",
  "Negotiation":     "negotiation",
  "Closed Won":      "won",
  "On Hold":         "lost",
};

type DealCard = {
  id: string;
  title: string;
  stage: string;
  fit_score: number | null;
  confidence: string;
  impact_projection: string | null;
  next_action: string | null;
  next_action_due: string | null;
  blocker: string | null;
  close_reason_code: string | null;
  last_updated_at: string;
};

export default function DealBoardPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [cards, setCards] = useState<DealCard[]>([]);

  const load = async () => {
    if (!user?.id) return;
    const next = (await fetchDealCards(supabase, user.id)) as DealCard[];
    setCards(next);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const handleTouch = async (id: string) => {
    const { error } = await touchDealCard(supabase, id);
    if (error) {
      window.alert(error);
      return;
    }
    await load();
  };

  const grouped = BOARD_COLUMNS.map((stage) => ({
    stage,
    cards: cards.filter((card) => card.stage === STAGE_DB[stage]),
  }));

  return (
    <div className="min-h-screen bg-(--color-surface-soft)">
      <section className="border-b border-(--color-hairline) bg-(--color-canvas) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Deal board
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-5 px-[5%] py-10">
        {grouped.map((column) => (
          <section
            key={column.stage}
            className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas)"
          >
            <div className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
              <h2 className="text-base font-semibold text-(--color-ink)">
                {column.stage}
              </h2>
              <p className="mt-1 text-xs text-(--color-muted)">
                {column.cards.length} cards
              </p>
            </div>

            {column.cards.length === 0 ? (
              <div className="p-4">
                <div className="rounded-[12px] border border-dashed border-(--color-hairline) p-4 text-center text-xs text-(--color-muted)">
                  No cards
                </div>
              </div>
            ) : (
              <div className="divide-y divide-(--color-hairline)">
                {column.cards.map((card) => {
                  const ageDays = Math.floor(
                    (Date.now() - new Date(card.last_updated_at).getTime()) /
                      86400000,
                  );
                  const isStale = ageDays >= 7;
                  const isNegotiationEscalation =
                    column.stage === "Negotiation" && ageDays >= 14;

                  return (
                    <article
                      key={card.id}
                      className={`p-4 ${isStale ? "bg-orange-50/60" : ""}`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-(--color-ink)">
                            {card.title}
                          </h3>
                          <p className="mt-1 text-xs text-(--color-body)">
                            Fit {card.fit_score ?? "-"} · {card.confidence}{" "}
                            confidence
                          </p>
                          {card.impact_projection && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              {card.impact_projection}
                            </p>
                          )}
                          {card.next_action && (
                            <p className="mt-2 text-xs text-(--color-body)">
                              Next: {card.next_action}
                            </p>
                          )}
                          {card.close_reason_code && (
                            <p className="mt-1 text-xs text-(--color-body)">
                              Reason: {card.close_reason_code}
                            </p>
                          )}
                        </div>

                        <div className="w-full shrink-0 md:w-56">
                          <p className="text-xs text-(--color-muted)">
                            {ageDays} days since update
                          </p>
                          {isStale && (
                            <p className="mt-1 text-xs font-semibold text-orange-700">
                              {isNegotiationEscalation
                                ? "Escalation: 14+ days in Negotiation"
                                : "Stale: 7+ days without update"}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTouch(card.id)}
                            className="mt-3 w-full rounded-[8px] bg-(--color-primary) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-primary-active)"
                          >
                            Mark updated
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
