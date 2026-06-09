"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { advanceDealCardStage, deleteDealCard, fetchDealCards, fetchUserMatches, nextDealStage, promoteIntroToDeal, revertDealCardStage, touchDealCard } from "@/lib/app-data";
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

const STAGE_LABEL: Record<string, string> = {
  discover:    "Qualified",
  intro:       "Intro & Scoping",
  proposal:    "Proposal",
  negotiation: "Negotiation",
  won:         "Closed Won",
  lost:        "On Hold",
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
  counterpart_id: string;
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
  const [selectedCard, setSelectedCard] = useState<DealCard | null>(null);
  const [selectedIntro, setSelectedIntro] = useState<ActiveIntro | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; onUndo: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedCard(null); setSelectedIntro(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          counterpart_id: cpId,
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
    if (error) { window.alert(error); return; }
    await load();
  };

  const handlePromote = async (intro: ActiveIntro) => {
    if (!user?.id) return;
    setPromotingId(intro.id);
    const { id: newId, error } = await promoteIntroToDeal(supabase, user.id, intro.counterpart_id, intro.counterpart_name);
    setPromotingId(null);
    if (error) { window.alert(error); return; }
    setSelectedIntro(null);
    await load();
    if (newId) {
      setToast({
        message: `${intro.counterpart_name} promoted to Proposal`,
        onUndo: async () => {
          await deleteDealCard(supabase, newId);
          await load();
          setToast(null);
        },
      });
    }
  };

  const handleAdvance = async (card: DealCard) => {
    const previousStage = card.stage;
    setAdvancingId(card.id);
    const { error } = await advanceDealCardStage(supabase, card.id, card.stage);
    setAdvancingId(null);
    if (error) { window.alert(error); return; }
    const next = nextDealStage(previousStage);
    setSelectedCard(null);
    await load();
    if (next) {
      setToast({
        message: `${card.title || card.counterpart_name} moved to ${STAGE_LABEL[next]}`,
        onUndo: async () => {
          await revertDealCardStage(supabase, card.id, previousStage);
          await load();
          setToast(null);
        },
      });
    }
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
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Founders Arena</p>
              <h1 className="db-header-title">Deal Pipeline</h1>
              <p className="db-header-desc">
                Tracks your active deals from first introduction to close. Each card is generated from a matched introduction — move deals forward by logging your next action, and hit "Mark active" to reset the staleness timer.
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
                  {/* Active intros rendered as uniform cards */}
                  {hasIntros && activeIntros.map((intro) => (
                    <article
                      key={intro.id}
                      className="db-card db-card--intro cursor-pointer"
                      onClick={() => setSelectedIntro(intro)}
                    >
                      <div className="mb-2">
                        <h3 className="db-card-title">{intro.counterpart_name}</h3>
                        <p className="db-card-counterpart">{intro.counterpart_sector ?? "—"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className={`${intro.fit_score != null ? fitScoreClass(intro.fit_score) : "fa-score-low opacity-40"} rounded-full px-2 py-0.5 text-[11px] font-bold`}>
                          {intro.fit_score != null ? `${intro.fit_score}% fit` : "— fit"}
                        </span>
                        <span className="db-intro-stage-badge">
                          {intro.status === "accepted" ? "Accepted" : "Introduced"}
                        </span>
                      </div>

                      <div className="db-next-action">
                        <p className="db-next-label">Status</p>
                        <p className="db-next-text">
                          {intro.status === "accepted"
                            ? "Introduction accepted · ready to connect"
                            : "Introduction sent · awaiting response"}
                        </p>
                      </div>

                      <div className="db-card-footer">
                        <span className="db-age">Intro stage</span>
                        <span className="db-intro-view-link">View match →</span>
                      </div>
                    </article>
                  ))}

                  {/* Deal cards */}
                  {stageCards.length === 0 && !hasIntros ? (
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
                          <article
                            key={card.id}
                            className="db-card cursor-pointer"
                            style={cardVars}
                            onClick={() => setSelectedCard(card)}
                          >
                            <div className="mb-2">
                              <h3 className="db-card-title">{card.title || card.counterpart_name}</h3>
                              <p className="db-card-counterpart">{card.counterpart_name}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                              <span className={`${card.fit_score != null ? fitScoreClass(card.fit_score) : "fa-score-low opacity-40"} rounded-full px-2 py-0.5 text-[11px] font-bold`}>
                                {card.fit_score != null ? `${card.fit_score}% fit` : "— fit"}
                              </span>
                              <span className="db-conf-badge" style={confidenceVars(card.confidence)}>
                                {card.confidence}
                              </span>
                            </div>

                            <div className="db-next-action">
                              <p className="db-next-label">Next</p>
                              <p className={`db-next-text ${!card.next_action ? "opacity-40" : ""}`}>
                                {card.next_action ?? "No next action logged"}
                              </p>
                            </div>

                            <div className="db-card-footer">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {card.stage === "discover" ? (
                                  <span className="db-status-chip db-status-chip--pending">Pending approval</span>
                                ) : (
                                  <>
                                    <span className="db-age">{ageDays}d ago</span>
                                    {isEscalation && (
                                      <span className="db-status-chip db-status-chip--escalation">Escalation</span>
                                    )}
                                    {!isEscalation && isStale && (
                                      <span className="db-status-chip db-status-chip--stale">Stale</span>
                                    )}
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                className="db-touch-btn"
                                onClick={(e) => { e.stopPropagation(); void handleTouch(card.id); }}
                                disabled={isTouching}
                              >
                                {isTouching ? "Saving…" : "Mark active"}
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

      {/* Deal card modal */}
      {selectedCard && (
        <div
          className="db-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Deal card</p>
                <h2 className="text-lg font-bold text-(--color-ink) leading-snug">{selectedCard.title || selectedCard.counterpart_name}</h2>
                <p className="text-sm text-(--color-muted) mt-0.5">{selectedCard.counterpart_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="shrink-0 mt-0.5 rounded-lg p-1.5 text-(--color-muted) hover:text-(--color-ink) hover:bg-(--color-canvas) transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="rounded-full border border-(--color-hairline) bg-(--color-canvas) px-2.5 py-1 text-[11px] font-semibold text-(--color-muted)">
                {Object.keys(STAGE_DB).find((k) => STAGE_DB[k] === selectedCard.stage) ?? selectedCard.stage}
              </span>
              {selectedCard.fit_score != null && (
                <span className={`${fitScoreClass(selectedCard.fit_score)} rounded-full px-2.5 py-1 text-[11px] font-bold`}>
                  {selectedCard.fit_score}% fit
                </span>
              )}
              <span className={`db-conf-badge db-conf-badge--${selectedCard.confidence}`}>
                {selectedCard.confidence} confidence
              </span>
            </div>

            {/* Detail rows */}
            <div className="space-y-3">
              {selectedCard.next_action && (
                <div className="rounded-xl bg-(--color-canvas) border border-(--color-hairline) px-4 py-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Next action</p>
                  <p className="text-sm text-(--color-ink)">{selectedCard.next_action}</p>
                  {selectedCard.next_action_due && (
                    <p className="text-xs text-(--color-muted) mt-1">Due {new Date(selectedCard.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  )}
                </div>
              )}
              {selectedCard.impact_projection && (
                <div className="rounded-xl bg-(--color-canvas) border border-(--color-hairline) px-4 py-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Impact projection</p>
                  <p className="text-sm text-(--color-ink)">{selectedCard.impact_projection}</p>
                </div>
              )}
              {selectedCard.blocker && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#f87171] mb-1">Blocker</p>
                  <p className="text-sm text-(--color-ink)">{selectedCard.blocker}</p>
                </div>
              )}
              {selectedCard.close_reason_code && (
                <div className="rounded-xl bg-(--color-canvas) border border-(--color-hairline) px-4 py-3">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Close reason</p>
                  <p className="text-sm text-(--color-ink)">{selectedCard.close_reason_code}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-(--color-hairline)">
              <p className="text-xs text-(--color-muted)">
                Last updated {Math.floor((Date.now() - new Date(selectedCard.last_updated_at).getTime()) / 86400000)}d ago
              </p>
              {nextDealStage(selectedCard.stage) && (
                <button
                  type="button"
                  onClick={() => void handleAdvance(selectedCard)}
                  disabled={advancingId === selectedCard.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-(--color-primary) px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {advancingId === selectedCard.id ? "Moving…" : `Move to ${STAGE_LABEL[nextDealStage(selectedCard.stage)!]}`}
                  {advancingId !== selectedCard.id && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro modal */}
      {selectedIntro && (
        <div
          className="db-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedIntro(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Active intro</p>
                <h2 className="text-lg font-bold text-(--color-ink) leading-snug">{selectedIntro.counterpart_name}</h2>
                {selectedIntro.counterpart_sector && (
                  <p className="text-sm text-(--color-muted) mt-0.5">{selectedIntro.counterpart_sector}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedIntro(null)}
                className="shrink-0 mt-0.5 rounded-lg p-1.5 text-(--color-muted) hover:text-(--color-ink) hover:bg-(--color-canvas) transition-colors"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              <span className="rounded-full border border-[rgba(255,107,31,0.3)] bg-[rgba(255,107,31,0.06)] px-2.5 py-1 text-[11px] font-semibold text-[#ff6b1f]">
                Intro &amp; Scoping
              </span>
              {selectedIntro.fit_score != null && (
                <span className={`${fitScoreClass(selectedIntro.fit_score)} rounded-full px-2.5 py-1 text-[11px] font-bold`}>
                  {selectedIntro.fit_score}% fit
                </span>
              )}
              <span className="rounded-full border border-(--color-hairline) px-2.5 py-1 text-[11px] font-semibold text-(--color-muted) capitalize">
                {selectedIntro.status}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handlePromote(selectedIntro)}
                disabled={promotingId === selectedIntro.id}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {promotingId === selectedIntro.id ? "Promoting…" : "Move to Proposal"}
                {promotingId !== selectedIntro.id && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
              <Link
                href={`/matches/${selectedIntro.id}`}
                onClick={() => setSelectedIntro(null)}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-(--color-hairline) px-4 py-2.5 text-sm font-semibold text-(--color-muted) hover:text-(--color-ink) hover:border-(--color-muted) transition-colors"
              >
                View full match details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3 shadow-2xl">
          <p className="text-sm font-medium text-(--color-ink) whitespace-nowrap">{toast.message}</p>
          <button
            type="button"
            onClick={() => void toast.onUndo()}
            className="rounded-lg border border-(--color-hairline) px-3 py-1 text-xs font-bold text-(--color-primary) hover:bg-(--color-canvas) transition-colors whitespace-nowrap"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 text-(--color-muted) hover:text-(--color-ink) transition-colors"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
