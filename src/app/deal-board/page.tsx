"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDealCards, fetchUserMatches, touchDealCard } from "@/lib/app-data";
import { useAuth } from "../providers";

const BOARD_COLUMNS = [
  "Qualified",
  "Intro & Scoping",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "On Hold",
] as const;

const STAGE_DB: Record<string, string> = {
  "Qualified":       "discover",
  "Intro & Scoping": "intro",
  "Proposal":        "proposal",
  "Negotiation":     "negotiation",
  "Closed Won":      "won",
  "On Hold":         "lost",
};

const STAGE_COLORS: Record<string, { dot: string; glow: string; bg: string }> = {
  "Qualified":       { dot: "#8b8ba7", glow: "transparent",           bg: "transparent" },
  "Intro & Scoping": { dot: "#ff6b1f", glow: "rgba(255,107,31,0.5)",  bg: "rgba(255,107,31,0.06)" },
  "Proposal":        { dot: "#818cf8", glow: "rgba(129,140,248,0.45)",bg: "rgba(129,140,248,0.05)" },
  "Negotiation":     { dot: "#c9a040", glow: "rgba(201,160,64,0.45)", bg: "rgba(201,160,64,0.05)" },
  "Closed Won":      { dot: "#34d399", glow: "rgba(52,211,153,0.45)", bg: "rgba(52,211,153,0.05)" },
  "On Hold":         { dot: "#4a4a6a", glow: "transparent",           bg: "transparent" },
};

function fitScoreClass(score: number): string {
  if (score >= 80) return "fa-score-excellent";
  if (score >= 60) return "fa-score-strong";
  if (score >= 40) return "fa-score-moderate";
  return "fa-score-low";
}

function confidenceVars(confidence: string): React.CSSProperties {
  const color =
    confidence === "high" ? "#34d399" :
    confidence === "medium" ? "#fbbf24" : "#f87171";
  return {
    "--db-conf-color": color,
    "--db-conf-border": color + "30",
  } as React.CSSProperties;
}

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
  counterpart_name: string;
};

type ActiveIntro = {
  id: string;
  counterpart_name: string;
  counterpart_sector: string | null;
  fit_score: number | null;
  status: "accepted" | "introduced";
};

export default function DealBoardPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [cards, setCards] = useState<DealCard[]>([]);
  const [activeIntros, setActiveIntros] = useState<ActiveIntro[]>([]);
  const [touchingId, setTouchingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const load = async () => {
    if (!user?.id) return;
    const [next, rawMatches] = await Promise.all([
      fetchDealCards(supabase, user.id) as Promise<DealCard[]>,
      fetchUserMatches(supabase, user.id),
    ]);
    setCards(next);

    const intros = rawMatches.filter((m) =>
      ["accepted", "introduced"].includes(m.status),
    );

    const cpIds = [...new Set(intros.map((m) =>
      m.member_a_id === user.id ? m.member_b_id : m.member_a_id,
    ))];

    let nameMap = new Map<string, { name: string; sector: string | null }>();
    if (cpIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, sector")
        .in("id", cpIds);
      nameMap = new Map(
        (data ?? []).map((p) => [
          p.id,
          {
            name: p.business_name || p.full_name || "Verified member",
            sector: p.sector ?? null,
          },
        ]),
      );
    }

    setActiveIntros(
      intros.map((m) => {
        const cpId = m.member_a_id === user.id ? m.member_b_id : m.member_a_id;
        const cp = nameMap.get(cpId);
        return {
          id: m.id,
          counterpart_name: cp?.name ?? "Verified member",
          counterpart_sector: cp?.sector ?? null,
          fit_score: m.fit_score ?? null,
          status: m.status as "accepted" | "introduced",
        };
      }),
    );
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const handleTouch = async (id: string) => {
    setTouchingId(id);
    const { error } = await touchDealCard(supabase, id);
    setTouchingId(null);
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

  const totalCards = cards.length;
  const staleCount = cards.filter((c) => {
    const age = Math.floor(
      (Date.now() - new Date(c.last_updated_at).getTime()) / 86400000,
    );
    return age >= 7;
  }).length;

  return (
    <div className="h-screen flex flex-col bg-(--color-canvas)">
      {/* Page header */}
      <header className="db-header shrink-0">
        <div className="db-header-inner">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="db-header-title">Deal Pipeline</h1>
              <p className="db-header-desc">
                Tracks your active deals from first introduction to close. Each card is generated from a matched introduction — move deals forward by logging your next action, and hit "Mark updated" to reset the staleness timer.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 mt-1">
              {staleCount > 0 && (
                <span className="db-stale-alert">
                  <span className="db-stale-dot" />
                  {staleCount} stale
                </span>
              )}
              <span className="db-total-count">
                {totalCards} deal{totalCards !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Stage summary pills */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {grouped.map(({ stage, cards: stageCards }) => {
              const col = STAGE_COLORS[stage];
              const count =
                stageCards.length +
                (stage === "Intro & Scoping" ? activeIntros.length : 0);
              if (count === 0) return null;
              return (
                <div
                  key={stage}
                  className="db-summary-pill"
                  style={{ "--db-dot": col.dot, "--db-glow": col.glow } as React.CSSProperties}
                >
                  <span className="db-summary-dot" />
                  <span className="db-summary-label">{stage}</span>
                  <span className="db-summary-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Kanban board */}
      <div ref={boardRef} className="db-board-outer flex-1">
        <div className="db-board-inner">
          {grouped.map(({ stage, cards: stageCards }) => {
            const col = STAGE_COLORS[stage];
            const hasIntros = stage === "Intro & Scoping" && activeIntros.length > 0;
            const totalInColumn = stageCards.length + (hasIntros ? activeIntros.length : 0);
            const colVars = {
              "--db-dot": col.dot,
              "--db-glow": totalInColumn > 0 ? col.glow : "transparent",
              "--db-count-bg": totalInColumn > 0 ? col.bg : "transparent",
              "--db-count-border": totalInColumn > 0 ? col.dot + "44" : "var(--color-hairline)",
              "--db-count-color": totalInColumn > 0 ? col.dot : "var(--color-muted)",
              "--db-empty-border": col.dot + "38",
            } as React.CSSProperties;

            return (
              <div key={stage} className="db-column">
                {/* Column header */}
                <div className="db-col-header" style={colVars}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="db-col-dot" />
                    <span className="text-[13px] font-semibold text-(--color-ink) tracking-tight truncate">
                      {stage}
                    </span>
                  </div>
                  <span className="db-col-count">{totalInColumn}</span>
                </div>

                {/* Column body */}
                <div className="db-col-body">
                  {/* Active intros — Intro & Scoping only */}
                  {hasIntros && (
                    <div className="db-intros-section">
                      <p className="db-intros-label">Active Intros</p>
                      {activeIntros.map((intro) => (
                        <div key={intro.id} className="db-intro-row">
                          <div className="db-intro-avatar">
                            {intro.counterpart_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-(--color-ink) truncate m-0 leading-tight">
                              {intro.counterpart_name}
                            </p>
                            {intro.counterpart_sector && (
                              <p className="text-[11px] text-(--color-muted) truncate m-0 leading-tight">
                                {intro.counterpart_sector}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {intro.fit_score != null && (
                              <span className={`${fitScoreClass(intro.fit_score)} rounded-full px-1.5 py-0.5 text-[11px] font-bold`}>
                                {intro.fit_score}%
                              </span>
                            )}
                            <Link
                              href={`/matches/${intro.id}`}
                              className="db-intro-link"
                              aria-label="View match"
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deal cards */}
                  {stageCards.length === 0 ? (
                    <div className="db-empty" style={colVars}>
                      <div className="db-empty-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col.dot + "55"} strokeWidth={1.5}>
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <path strokeLinecap="round" d="M12 8v8M8 12h8" />
                        </svg>
                      </div>
                      <p className="db-empty-text">No deals in this stage</p>
                    </div>
                  ) : (
                    <>
                      {stageCards.map((card) => {
                        const ageDays = Math.floor(
                          (Date.now() - new Date(card.last_updated_at).getTime()) / 86400000,
                        );
                        const isStale = ageDays >= 7;
                        const isEscalation = stage === "Negotiation" && ageDays >= 14;
                        const isTouching = touchingId === card.id;

                        const cardVars = {
                          "--db-card-bg": isEscalation
                            ? "rgba(201,160,64,0.04)"
                            : isStale
                            ? "rgba(255,107,31,0.03)"
                            : "transparent",
                          "--db-age-color": isEscalation
                            ? "#c9a040"
                            : isStale
                            ? "var(--color-primary)"
                            : "var(--color-muted)",
                          "--db-age-weight": isStale ? "600" : "400",
                        } as React.CSSProperties;

                        return (
                          <article key={card.id} className="db-card" style={cardVars}>
                            <div className="mb-2">
                              <h3 className="db-card-title">{card.title}</h3>
                              <p className="db-card-counterpart">with {card.counterpart_name}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                              {card.fit_score != null && (
                                <span className={`${fitScoreClass(card.fit_score)} rounded-full px-2 py-0.5 text-[11px] font-bold`}>
                                  {card.fit_score}% fit
                                </span>
                              )}
                              <span className="db-conf-badge" style={confidenceVars(card.confidence)}>
                                {card.confidence}
                              </span>
                            </div>

                            {card.next_action && (
                              <div className="db-next-action">
                                <p className="db-next-label">Next</p>
                                <p className="db-next-text">{card.next_action}</p>
                              </div>
                            )}

                            {card.impact_projection && (
                              <p className="db-card-meta">{card.impact_projection}</p>
                            )}

                            {card.close_reason_code && (
                              <p className="db-card-close-reason">{card.close_reason_code}</p>
                            )}

                            <div className="db-card-footer">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="db-age">{ageDays}d ago</span>
                                {isEscalation && (
                                  <span
                                    className="db-status-chip"
                                    style={{
                                      "--db-chip-bg": "rgba(201,160,64,0.12)",
                                      "--db-chip-color": "#c9a040",
                                    } as React.CSSProperties}
                                  >
                                    Escalation
                                  </span>
                                )}
                                {!isEscalation && isStale && (
                                  <span
                                    className="db-status-chip"
                                    style={{
                                      "--db-chip-bg": "rgba(255,107,31,0.1)",
                                      "--db-chip-color": "var(--color-primary)",
                                    } as React.CSSProperties}
                                  >
                                    Stale
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="db-touch-btn"
                                onClick={() => handleTouch(card.id)}
                                disabled={isTouching}
                              >
                                {isTouching ? "Saving…" : "Mark updated"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
