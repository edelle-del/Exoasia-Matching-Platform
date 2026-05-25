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

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  stats: Stats;
  companies: PortfolioCompany[];
  isLoading: boolean;
  onSelectCompany: (id: string) => void;
  onNominate: () => void;
};

export function PortfolioOverview({ stats, companies, isLoading, onSelectCompany, onNominate }: Props) {
  return (
    <div className="space-y-6">

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
        <div className="flex items-center justify-between border-b border-[#2A2A3E] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Portfolio Companies</p>
            <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Live pipeline status</p>
          </div>
          <button
            type="button"
            onClick={onNominate}
            className="flex items-center gap-2 rounded-lg bg-violet-600/30 px-3 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-600/50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nominate Startup
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-px">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-[#0F0F17]" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#F4F4FF]">No portfolio companies yet</p>
            <p className="mt-1 text-xs text-[#8B8BA7]">Nominate a startup to begin tracking their pipeline.</p>
            <button
              type="button"
              onClick={onNominate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Nominate your first startup →
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

              return (
                <button
                  key={company.startup_id}
                  type="button"
                  onClick={() => onSelectCompany(company.startup_id)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#1A1A26]"
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

                  <div className="hidden shrink-0 items-center gap-6 sm:flex">
                    <div className="text-center">
                      <p className="text-xs font-bold text-indigo-400">{company.projects.length}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Projects</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${bestFit !== null ? (bestFit >= 75 ? "text-emerald-400" : "text-amber-400") : "text-[#4A4A6A]"}`}>
                        {bestFit !== null ? `${bestFit}%` : "—"}
                      </p>
                      <p className="text-[9px] text-[#8B8BA7]">Best fit</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${pending > 0 ? "text-amber-400" : "text-[#4A4A6A]"}`}>{pending}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-emerald-400">{activeMatches}</p>
                      <p className="text-[9px] text-[#8B8BA7]">Active</p>
                    </div>
                  </div>

                  <svg className="h-4 w-4 shrink-0 text-[#2A2A3E] transition group-hover:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
