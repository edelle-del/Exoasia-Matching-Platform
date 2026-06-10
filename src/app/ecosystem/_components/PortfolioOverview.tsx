"use client";

import type { PortfolioCompany } from "@/app/api/ecosystem/portfolio/route";

type Stats = {
  total_companies: number;
  total_projects: number;
  total_matches: number;
  active_matches: number;
  pending: number;
  stale_count: number;
};

type Props = {
  stats: Stats;
  companies: PortfolioCompany[];
  isLoading: boolean;
  onSelectCompany: (id: string) => void;
  onNominate: () => void;
  onScoreCompany: (startup_id: string) => void;
  scoringId: string | null;
  onFeatureStartup: (startup_id: string) => void;
  featuringId: string | null;
  onExportAnalytics: () => void;
  exportingAnalytics: boolean;
};

function EcoFitBadge({ score }: { score: number | null }) {
  if (score === null) return <p className="text-xs font-bold tabular-nums text-[#4A4A6A]">—</p>;
  return (
    <p className={`text-xs font-bold tabular-nums ${score >= 75 ? "text-violet-400" : "text-amber-400"}`}>
      {score}%
    </p>
  );
}

export function PortfolioOverview({ stats, companies, isLoading, onSelectCompany, onNominate, onScoreCompany, scoringId, onFeatureStartup, featuringId, onExportAnalytics, exportingAnalytics }: Props) {
  return (
    <div className="space-y-6">

      {/* Analytics export */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onExportAnalytics}
          disabled={exportingAnalytics || isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A3E] bg-[#12121A] px-3 py-1.5 text-xs font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exportingAnalytics ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
              </svg>
              Exporting…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export analytics · 8 cr
            </>
          )}
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Portfolio Companies", value: stats.total_companies, accent: "text-[#F4F4FF]" },
          { label: "Active Projects",     value: stats.total_projects,  accent: "text-indigo-400" },
          { label: "Total Intros",        value: stats.total_matches,   accent: "text-violet-400" },
          { label: "Active Matches",      value: stats.active_matches,  accent: stats.active_matches > 0 ? "text-emerald-400" : "text-[#4A4A6A]" },
          { label: "Pending",             value: stats.pending,         accent: stats.pending > 0 ? "text-amber-400" : "text-[#4A4A6A]" },
          { label: "Stale Alerts",        value: stats.stale_count,     accent: stats.stale_count > 0 ? "text-rose-400" : "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#2A2A3E] bg-[#12121A] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">{s.label}</p>
            <p className={`mt-1 text-2xl font-extrabold tabular-nums ${s.accent}`}>
              {isLoading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Portfolio company feed */}
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
        <div className="border-b border-[#2A2A3E] px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Portfolio Companies</p>
          <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Live pipeline status</p>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[#0F0F17]" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#F4F4FF]">No collabs yet</p>
            <p className="mt-1 text-xs text-[#8B8BA7]">Invite anyone on the platform to collab and begin tracking their pipeline.</p>
            <button
              type="button"
              onClick={onNominate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Invite to Collab →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A3E]">
            {companies.map((company) => {
              const name = company.business_name || company.full_name || "Startup";
              const bestFit = company.projects.reduce<number | null>(
                (max, p) => p.best_fit_score !== null ? Math.max(max ?? 0, p.best_fit_score) : max,
                null,
              );
              const activeMatches = company.matches.filter((m) => ["accepted", "introduced"].includes(m.status)).length;
              const pending       = company.matches.filter((m) => ["pending", "approved"].includes(m.status)).length;
              const stale         = company.matches.filter((m) => m.is_stale).length;
              const isScoring     = scoringId === company.startup_id;
              const hasProjects   = company.projects.length > 0;

              return (
                <div key={company.startup_id} className="flex w-full items-center gap-4 px-5 py-4">
                  {/* Clickable company info */}
                  <button
                    type="button"
                    onClick={() => onSelectCompany(company.startup_id)}
                    className="group flex min-w-0 flex-1 items-center gap-4 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E] text-xs font-bold text-[#F4F4FF]">
                      {name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#F4F4FF]">{name}</p>
                        {company.verification_status === "verified" && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">Verified</span>
                        )}
                        {company.status === "pending" && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">Awaiting acceptance</span>
                        )}
                        {stale > 0 && (
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-400">
                            {stale} stale
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8B8BA7]">
                        {[company.sector, company.stage ? `Stage ${company.stage}` : null].filter(Boolean).join(" · ") || "No info"}
                      </p>
                    </div>
                  </button>

                  {/* Stats + Mandate Fit */}
                  <div className="hidden shrink-0 items-center gap-6 sm:flex">
                    <div className="text-center">
                      <p className="text-xs font-bold text-indigo-400">{company.projects.length}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Projects</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${bestFit !== null ? (bestFit >= 75 ? "text-emerald-400" : "text-amber-400") : "text-[#4A4A6A]"}`}>
                        {bestFit !== null ? `${bestFit}%` : "—"}
                      </p>
                      <p className="text-[9px] text-[#8B8BA7]">Investor fit</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${pending > 0 ? "text-amber-400" : "text-[#4A4A6A]"}`}>{pending}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-400">{activeMatches}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Active</p>
                    </div>

                    {/* Mandate Fit column */}
                    <div className="text-center">
                      <EcoFitBadge score={company.best_eco_fit_score} />
                      <p className="text-[9px] text-[#8B8BA7]">Mandate fit</p>
                    </div>
                  </div>

                  {/* Score button */}
                  {hasProjects && (
                    <button
                      type="button"
                      disabled={isScoring || !!scoringId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onScoreCompany(company.startup_id);
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        isScoring
                          ? "cursor-wait bg-violet-600/20 text-violet-400"
                          : scoringId
                          ? "cursor-not-allowed bg-[#1A1A26] text-[#4A4A6A]"
                          : company.best_eco_fit_score !== null
                          ? "bg-[#1A1A26] text-[#8B8BA7] hover:bg-violet-600/20 hover:text-violet-300"
                          : "bg-violet-600/20 text-violet-300 hover:bg-violet-600/40"
                      }`}
                    >
                      {isScoring ? "Scoring…" : company.best_eco_fit_score !== null ? "Re-score" : "Score"}
                    </button>
                  )}

                  {/* Feature in digest button */}
                  <button
                    type="button"
                    disabled={featuringId === company.startup_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeatureStartup(company.startup_id);
                    }}
                    title="Feature in partner digest · 10 cr"
                    className={`shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                      featuringId === company.startup_id
                        ? "cursor-wait bg-amber-500/10 text-amber-400"
                        : "bg-[#1A1A26] text-[#4A4A6A] hover:bg-amber-500/10 hover:text-amber-400"
                    }`}
                  >
                    {featuringId === company.startup_id ? "★…" : "★"}
                  </button>

                  <svg
                    onClick={() => onSelectCompany(company.startup_id)}
                    className="h-4 w-4 shrink-0 cursor-pointer text-[#2A2A3E] transition hover:text-violet-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
