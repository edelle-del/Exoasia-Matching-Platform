"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchCommunityMembers, type CommunityMemberRecord } from "@/lib/app-data";
import { STAGE_CONFIG } from "@/types/constants";

export default function CommunityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<CommunityMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");

  useEffect(() => {
    void (async () => {
      const data = await fetchCommunityMembers(supabase);
      setMembers(data);
      setIsLoading(false);
    })();
  }, [supabase]);

  const sectors = useMemo(
    () =>
      Array.from(new Set(members.map((m) => m.sector).filter(Boolean))).sort() as string[],
    [members],
  );

  const cities = useMemo(
    () =>
      Array.from(new Set(members.map((m) => m.city).filter(Boolean))).sort() as string[],
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      if (q) {
        const haystack = [m.full_name, m.business_name, m.short_bio]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterSector !== "all" && m.sector !== filterSector) return false;
      if (filterCity !== "all" && m.city !== filterCity) return false;
      if (filterRole !== "all" && m.member_role !== filterRole) return false;
      if (filterStage !== "all" && m.stage !== filterStage) return false;
      if (filterVerification !== "all" && m.verification_status !== filterVerification)
        return false;
      return true;
    });
  }, [members, search, filterSector, filterCity, filterRole, filterStage, filterVerification]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-muted)">
            Founders Arena
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-(--color-ink)">Community</h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Browse all members in the network.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-[5%] py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search by name, business, or bio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 min-w-[200px] flex-1 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
          />
          <FilterSelect
            value={filterSector}
            onChange={setFilterSector}
            label="Sector"
            options={[
              { value: "all", label: "All sectors" },
              ...sectors.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            value={filterCity}
            onChange={setFilterCity}
            label="City"
            options={[
              { value: "all", label: "All cities" },
              ...cities.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            value={filterRole}
            onChange={setFilterRole}
            label="Role"
            options={[
              { value: "all", label: "All roles" },
              { value: "investor", label: "Investor" },
              { value: "startup", label: "Startup" },
            ]}
          />
          <FilterSelect
            value={filterStage}
            onChange={setFilterStage}
            label="Stage"
            options={[
              { value: "all", label: "All stages" },
              ...Object.entries(STAGE_CONFIG).map(([k, v]) => ({
                value: k,
                label: `Stage ${k} – ${v.label}`,
              })),
            ]}
          />
          <FilterSelect
            value={filterVerification}
            onChange={setFilterVerification}
            label="Verification"
            options={[
              { value: "all", label: "All" },
              { value: "verified", label: "Verified" },
              { value: "pending", label: "Pending" },
              { value: "unverified", label: "Unverified" },
            ]}
          />
        </div>

        {!isLoading && (
          <p className="text-xs text-(--color-muted)">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-[16px] border border-(--color-hairline) bg-(--color-surface-soft)"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-surface-soft) p-8 text-center text-sm text-(--color-body)">
            No members match your filters.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MemberCard({ member: m }: { member: CommunityMemberRecord }) {
  const initials = (m.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const stageLabel =
    STAGE_CONFIG[m.stage as keyof typeof STAGE_CONFIG]?.label ?? `Stage ${m.stage}`;

  const roleBadge =
    m.member_role === "investor"
      ? { label: "Investor", cls: "bg-violet-100 text-violet-700" }
      : m.member_role === "startup"
        ? { label: "Startup", cls: "bg-blue-100 text-blue-700" }
        : null;

  const verificationBadge =
    m.verification_status === "verified"
      ? { label: "Verified", cls: "bg-emerald-100 text-emerald-700" }
      : m.verification_status === "pending"
        ? { label: "Pending", cls: "bg-amber-100 text-amber-700" }
        : { label: "Unverified", cls: "bg-gray-100 text-gray-500" };

  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-sm font-semibold text-(--color-primary)">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-(--color-ink)">{m.full_name || "—"}</p>
          {m.business_name && (
            <p className="truncate text-sm text-(--color-body)">{m.business_name}</p>
          )}
          {(m.city || m.sector) && (
            <p className="truncate text-xs text-(--color-muted)">
              {[m.city, m.sector].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {roleBadge && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.cls}`}>
            {roleBadge.label}
          </span>
        )}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          Stage {m.stage} · {stageLabel}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${verificationBadge.cls}`}
        >
          {verificationBadge.label}
        </span>
      </div>

      {/* Bio */}
      {m.short_bio && (
        <p className="line-clamp-2 text-sm text-(--color-body)">{m.short_bio}</p>
      )}

      {/* Ask categories */}
      {m.ask_categories?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
            Asking for
          </p>
          <div className="flex flex-wrap gap-1">
            {m.ask_categories.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-[6px] bg-rose-50 px-2 py-0.5 text-xs text-rose-700"
              >
                {tag}
              </span>
            ))}
            {m.ask_categories.length > 3 && (
              <span className="text-xs text-(--color-muted)">
                +{m.ask_categories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Offer categories */}
      {m.offer_categories?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
            Offering
          </p>
          <div className="flex flex-wrap gap-1">
            {m.offer_categories.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-[6px] bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
              >
                {tag}
              </span>
            ))}
            {m.offer_categories.length > 3 && (
              <span className="text-xs text-(--color-muted)">
                +{m.offer_categories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
