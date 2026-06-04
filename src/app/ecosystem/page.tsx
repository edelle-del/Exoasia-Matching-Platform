"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../providers";
import { PortfolioOverview } from "./_components/PortfolioOverview";
import { CoPilotKanban }   from "./_components/CoPilotKanban";
import { NominateModal }    from "./_components/NominateModal";
import { DiscoverView }     from "./_components/DiscoverView";
import type { PortfolioCompany, PortfolioResponse } from "@/app/api/ecosystem/portfolio/route";
import type { DiscoverProject } from "@/app/api/ecosystem/discover/route";
import Link from "next/link";

type View = "portfolio" | "kanban" | "discover" | "deep-dive";

// ─── Company deep-dive panel ──────────────────────────────────────────────────

function DeepDive({ company, onBack }: { company: PortfolioCompany; onBack: () => void }) {
  const name = company.business_name || company.full_name || "Startup";
  const activeMatches = company.matches.filter((m) => ["accepted", "introduced"].includes(m.status)).length;
  const pendingMatches = company.matches.filter((m) => ["pending", "approved"].includes(m.status)).length;
  const staleMatches   = company.matches.filter((m) => m.is_stale).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[#8B8BA7] transition hover:text-[#F4F4FF]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to portfolio
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#2A2A3E] bg-[#12121A] px-6 py-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2A2A3E] text-lg font-bold text-[#F4F4FF]">
          {name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#F4F4FF]">{name}</h2>
            {company.verification_status === "verified" && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Verified</span>
            )}
          </div>
          <p className="text-xs text-[#8B8BA7]">
            {[company.sector, company.stage ? `Stage ${company.stage}` : null].filter(Boolean).join(" · ") || "No info"}
          </p>
        </div>
        <div className="flex gap-6">
          {[
            { label: "Projects",  value: company.projects.length,  color: "text-indigo-400"  },
            { label: "Active",    value: activeMatches,             color: "text-emerald-400" },
            { label: "Pending",   value: pendingMatches,            color: pendingMatches > 0 ? "text-amber-400" : "text-[#4A4A6A]" },
            { label: "Stale",     value: staleMatches,              color: staleMatches > 0 ? "text-rose-400" : "text-[#4A4A6A]" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-lg font-extrabold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#8B8BA7]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
        <div className="border-b border-[#2A2A3E] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Projects</p>
          <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Mandate-matched opportunities</p>
        </div>
        {company.projects.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8B8BA7]">No active projects</p>
        ) : (
          <div className="divide-y divide-[#2A2A3E]">
            {company.projects.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#F4F4FF]">{p.name}</p>
                  <p className="text-xs text-[#8B8BA7]">
                    {[p.sector, p.stage].filter(Boolean).join(" · ") || "No info"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-6">
                  <div className="text-center">
                    <p className={`text-sm font-bold tabular-nums ${p.best_fit_score !== null ? (p.best_fit_score >= 75 ? "text-emerald-400" : "text-amber-400") : "text-[#4A4A6A]"}`}>
                      {p.best_fit_score !== null ? `${p.best_fit_score}%` : "—"}
                    </p>
                    <p className="text-[9px] text-[#8B8BA7]">Best fit</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold tabular-nums text-indigo-400">{p.investor_match_count}</p>
                    <p className="text-[9px] text-[#8B8BA7]">Scores</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match timeline */}
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
        <div className="border-b border-[#2A2A3E] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Match Timeline</p>
          <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Live intro statuses</p>
        </div>
        {company.matches.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8B8BA7]">No matches yet</p>
        ) : (
          <div className="divide-y divide-[#2A2A3E]">
            {company.matches.map((m) => (
              <div key={m.id} className={`flex items-center gap-4 px-5 py-4 ${m.is_stale ? "bg-rose-500/5" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#F4F4FF]">{m.counterpart_name}</p>
                    {m.is_stale && (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400">Stale</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B8BA7]">
                    Last activity {new Date(m.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {m.fit_score !== null && (
                    <p className={`text-sm font-bold tabular-nums ${m.fit_score >= 75 ? "text-emerald-400" : "text-amber-400"}`}>
                      {m.fit_score}%
                    </p>
                  )}
                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: "Pending",    cls: "bg-amber-500/20 text-amber-400"   },
    approved:   { label: "Intro Sent", cls: "bg-indigo-500/20 text-indigo-400" },
    accepted:   { label: "Active",     cls: "bg-emerald-500/20 text-emerald-400" },
    introduced: { label: "Introduced", cls: "bg-violet-500/20 text-violet-400"  },
  };
  const s = map[status] ?? { label: status, cls: "bg-[#2A2A3E] text-[#8B8BA7]" };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
  );
}

// ─── Nav tab ──────────────────────────────────────────────────────────────────

function NavTab({ label, active, onClick, badge }: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-violet-600/25 text-violet-300"
          : "text-[#8B8BA7] hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EcosystemPage() {
  const { user } = useAuth();
  const [view, setView]                   = useState<View>("portfolio");
  const [isLoading, setIsLoading]         = useState(true);
  const [data, setData]                   = useState<PortfolioResponse | null>(null);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [nominateOpen, setNominateOpen]   = useState(false);
  const [reloadKey, setReloadKey]         = useState(0);
  const [forbidden, setForbidden]         = useState(false);
  const [discoverProjects, setDiscoverProjects] = useState<DiscoverProject[]>([]);
  const [discoverLoading, setDiscoverLoading]   = useState(false);
  const [addingToPortfolio, setAddingToPortfolio] = useState<Record<string, boolean>>({});
  const [scoringId, setScoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    setForbidden(false);
    fetch("/api/ecosystem/portfolio")
      .then(async (r) => {
        if (r.status === 403) { setForbidden(true); setIsLoading(false); return; }
        const json: PortfolioResponse = await r.json();
        setData(json);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [user?.id, reloadKey]);

  useEffect(() => {
    if (view !== "discover") return;
    setDiscoverLoading(true);
    fetch("/api/ecosystem/discover")
      .then((r) => r.json())
      .then((json: { projects?: DiscoverProject[] }) => {
        setDiscoverProjects(json.projects ?? []);
        setDiscoverLoading(false);
      })
      .catch(() => setDiscoverLoading(false));
  }, [view, reloadKey]);

  const handleScoreCompany = async (startupId: string) => {
    setScoringId(startupId);
    try {
      await fetch("/api/ecosystem/score-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startup_id: startupId }),
      });
      setReloadKey((k) => k + 1);
    } finally {
      setScoringId(null);
    }
  };

  const handleAddToPortfolio = async (ownerId: string) => {
    setAddingToPortfolio((prev) => ({ ...prev, [ownerId]: true }));
    try {
      const res = await fetch("/api/ecosystem/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startup_id: ownerId }),
      });
      if (res.ok) {
        setDiscoverProjects((prev) =>
          prev.map((p) => p.owner_id === ownerId ? { ...p, already_in_portfolio: true } : p),
        );
        setReloadKey((k) => k + 1);
      }
    } finally {
      setAddingToPortfolio((prev) => ({ ...prev, [ownerId]: false }));
    }
  };

  if (forbidden) {
    return (
      <div className="min-h-screen px-[5%] py-12">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="text-sm text-[#8B8BA7]">This page is only available to Ecosystem Partners.</p>
          <Link href="/dashboard" className="text-violet-400 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const companies   = data?.companies ?? [];
  const stats       = data?.stats ?? { total_companies: 0, total_projects: 0, total_matches: 0, active_matches: 0, pending: 0, stale_count: 0 };
  const staleTotal  = stats.stale_count;

  const selectedCompany = selectedId ? companies.find((c) => c.startup_id === selectedId) ?? null : null;

  const handleSelectCompany = (id: string) => {
    setSelectedId(id);
    setView("deep-dive");
  };

  const handleBack = () => {
    setSelectedId(null);
    setView("portfolio");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] px-[5%] py-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Ecosystem Partner</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#F4F4FF]">Portfolio</h1>
            <p className="mt-1 text-sm text-[#8B8BA7]">Portfolio pipeline · Invite startups · Year-round deal flow</p>
          </div>
          <button
            type="button"
            onClick={() => setNominateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Invite Startup
          </button>
        </div>

        {/* Nav tabs */}
        {!selectedCompany && (
          <div className="flex items-center gap-1 rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-1.5">
            <NavTab label="Portfolio Overview" active={view === "portfolio"} onClick={() => setView("portfolio")} />
            <NavTab label="Discover"           active={view === "discover"}  onClick={() => setView("discover")} />
            <NavTab label="Deal Board"         active={view === "kanban"}    onClick={() => setView("kanban")}   badge={staleTotal} />
          </div>
        )}

        {/* Content */}
        {selectedCompany ? (
          <DeepDive company={selectedCompany} onBack={handleBack} />
        ) : view === "portfolio" ? (
          <PortfolioOverview
            stats={stats}
            companies={companies}
            isLoading={isLoading}
            onSelectCompany={handleSelectCompany}
            onNominate={() => setNominateOpen(true)}
            onScoreCompany={handleScoreCompany}
            scoringId={scoringId}
          />
        ) : view === "discover" ? (
          <DiscoverView
            projects={discoverProjects}
            isLoading={discoverLoading}
            adding={addingToPortfolio}
            onAdd={handleAddToPortfolio}
          />
        ) : (
          <CoPilotKanban
            companies={companies}
            isLoading={isLoading}
            onSelectCompany={handleSelectCompany}
          />
        )}

      </div>

      {nominateOpen && (
        <NominateModal
          onClose={() => setNominateOpen(false)}
          onSuccess={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
