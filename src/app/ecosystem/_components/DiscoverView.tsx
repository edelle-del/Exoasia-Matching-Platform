"use client";

import type { DiscoverProject } from "@/app/api/ecosystem/discover/route";

type Props = {
  projects: DiscoverProject[];
  isLoading: boolean;
  adding: Record<string, boolean>;
  onAdd: (ownerId: string) => void;
};

export function DiscoverView({ projects, isLoading, adding, onAdd }: Props) {
  return (
    <div className="rounded-2xl border border-[#2A2A3E] bg-[#12121A]">
      <div className="border-b border-[#2A2A3E] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Discover</p>
        <p className="mt-0.5 text-sm font-semibold text-[#F4F4FF]">Browse active startup projects on the platform</p>
        <p className="mt-1 text-xs text-[#8B8BA7]">
          Invite a startup to your portfolio — they will receive a request to accept.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-px">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-[#0F0F17]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-semibold text-[#F4F4FF]">No projects to discover yet</p>
          <p className="mt-1 text-xs text-[#8B8BA7]">
            When startups publish active projects, they will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#2A2A3E]">
          {projects.map((p) => (
            <div key={p.project_id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A2A3E] text-xs font-bold text-[#F4F4FF]">
                {p.owner_name.charAt(0)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[#F4F4FF]">{p.project_name}</p>
                  {p.stage && (
                    <span className="rounded-full bg-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">
                      {p.stage}
                    </span>
                  )}
                  {p.sector && (
                    <span className="rounded-full border border-[#2A2A3E] px-2 py-0.5 text-[9px] font-medium text-[#8B8BA7]">
                      {p.sector}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[#8B8BA7]">{p.owner_name}</p>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-[#4A4A6A]">{p.description}</p>
                )}
              </div>

              <div className="shrink-0">
                {p.already_in_portfolio ? (
                  <span className="inline-flex items-center rounded-xl border border-[#2A2A3E] px-3 py-2 text-xs font-semibold text-[#8B8BA7]">
                    Invited
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={adding[p.owner_id]}
                    onClick={() => onAdd(p.owner_id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding[p.owner_id] ? "Sending…" : "Invite to portfolio"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
