"use client";

import { useState } from "react";
import type { PortfolioCompany, PortfolioMatch } from "@/app/api/ecosystem/portfolio/route";

type KanbanColumn = {
  id: string;
  label: string;
  statuses: string[];
  accent: string;
  dot: string;
};

const COLUMNS: KanbanColumn[] = [
  { id: "discover",    label: "Discover",    statuses: ["pending"],                  accent: "border-[#3A3A5E]", dot: "bg-[#8B8BA7]"    },
  { id: "intro",       label: "Intro Sent",  statuses: ["approved"],                 accent: "border-indigo-500/40", dot: "bg-indigo-400" },
  { id: "active",      label: "Active",      statuses: ["accepted", "introduced"],   accent: "border-emerald-500/40", dot: "bg-emerald-400" },
];

type KanbanCard = PortfolioMatch & {
  companyName: string;
  companyId: string;
};

type Props = {
  companies: PortfolioCompany[];
  isLoading: boolean;
  onSelectCompany: (id: string) => void;
};

function StaleTag() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-400">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      Stale
    </span>
  );
}

function KanbanCard({ card, onIntervene, intervening }: {
  card: KanbanCard;
  onIntervene: (card: KanbanCard) => void;
  intervening: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-[#1A1A26] p-3 transition hover:border-violet-500/40 ${card.is_stale ? "border-rose-500/40" : "border-[#2A2A3E]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[#F4F4FF]">{card.companyName}</p>
          <p className="mt-0.5 truncate text-[10px] text-[#8B8BA7]">↔ {card.counterpart_name}</p>
        </div>
        {card.is_stale && <StaleTag />}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {card.fit_score !== null && (
            <span className={`text-[10px] font-bold tabular-nums ${card.fit_score >= 75 ? "text-emerald-400" : card.fit_score >= 55 ? "text-indigo-400" : "text-amber-400"}`}>
              {card.fit_score}% fit
            </span>
          )}
          <span className="text-[9px] text-[#4A4A6A]">
            {new Date(card.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        {card.is_stale && (
          <button
            type="button"
            disabled={intervening}
            onClick={() => onIntervene(card)}
            className="rounded-lg bg-violet-600/25 px-2 py-1 text-[9px] font-bold text-violet-300 transition hover:bg-violet-600/45 disabled:opacity-50"
          >
            {intervening ? "…" : "Intervene"}
          </button>
        )}
      </div>
    </div>
  );
}

export function CoPilotKanban({ companies, isLoading, onSelectCompany }: Props) {
  const [intervening, setIntervening] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  const allCards: KanbanCard[] = companies
    .filter((c) => filter === "all" || c.startup_id === filter)
    .flatMap((c) =>
      c.matches.map((m) => ({
        ...m,
        companyName: c.business_name || c.full_name || "Startup",
        companyId: c.startup_id,
      })),
    );

  const staleTotal = allCards.filter((c) => c.is_stale).length;

  const handleIntervene = async (card: KanbanCard) => {
    setIntervening((prev) => new Set(prev).add(card.id));
    try {
      await fetch("/api/ecosystem/intervene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: card.id, startup_id: card.companyId }),
      });
    } finally {
      setIntervening((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }
  };

  const columnCards = (col: KanbanColumn) =>
    allCards.filter((c) => col.statuses.includes(c.status));

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-4">
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-[#1A1A26]" />
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-[#1A1A26]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-[#F4F4FF]">Co-Pilot Kanban</p>
          {staleTotal > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              {staleTotal} stale
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="kanban-filter" className="text-xs text-[#8B8BA7]">Filter by company</label>
          <select
            id="kanban-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-[#2A2A3E] bg-[#1A1A26] px-2.5 py-1.5 text-xs text-[#F4F4FF] outline-none focus:border-violet-500"
          >
            <option value="all">All companies</option>
            {companies.map((c) => (
              <option key={c.startup_id} value={c.startup_id}>
                {c.business_name || c.full_name || "Startup"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const cards = columnCards(col);
          return (
            <div key={col.id} className={`rounded-2xl border bg-[#12121A] ${col.accent}`}>
              {/* Column header */}
              <div className="flex items-center justify-between border-b border-[#2A2A3E] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <p className="text-xs font-bold text-[#F4F4FF]">{col.label}</p>
                </div>
                <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-[10px] font-bold text-[#8B8BA7]">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 p-3">
                {cards.length === 0 ? (
                  <p className="py-4 text-center text-[11px] text-[#4A4A6A]">No matches here</p>
                ) : (
                  cards.map((card) => (
                    <KanbanCard
                      key={card.id}
                      card={card}
                      onIntervene={handleIntervene}
                      intervening={intervening.has(card.id)}
                    />
                  ))
                )}
              </div>

              {/* Column footer — link to company */}
              {cards.length > 0 && (
                <div className="border-t border-[#2A2A3E] px-4 py-2">
                  {[...new Set(cards.map((c) => c.companyId))].slice(0, 3).map((id) => {
                    const co = companies.find((c) => c.startup_id === id);
                    if (!co) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onSelectCompany(id)}
                        className="block w-full truncate py-0.5 text-left text-[10px] text-violet-400 transition hover:text-violet-300"
                      >
                        → {co.business_name || co.full_name || "Startup"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allCards.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A] py-12 text-center">
          <p className="text-sm font-semibold text-[#F4F4FF]">No matches in the pipeline yet</p>
          <p className="mt-1 text-xs text-[#8B8BA7]">Matches will appear here once startups are connected with investors.</p>
        </div>
      )}
    </div>
  );
}
