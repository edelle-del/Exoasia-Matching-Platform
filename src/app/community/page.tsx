"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCommunityMembers,
  type CommunityMemberRecord,
} from "@/lib/app-data";
const PROJECT_STAGES = [
  "Pre-revenue Startups",
  "Cash-flow Businesses",
  "Dividend-paying Companies",
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Pre-IPO / Late-Stage",
  "Public Companies",
];

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
  const [selectedMember, setSelectedMember] = useState<CommunityMemberRecord | null>(null);

  useEffect(() => {
    void (async () => {
      const data = await fetchCommunityMembers(supabase);
      setMembers(data);
      setIsLoading(false);
    })();
  }, [supabase]);

  const sectors = useMemo(
    () =>
      Array.from(
        new Set(members.map((m) => m.sector).filter(Boolean)),
      ).sort() as string[],
    [members],
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(members.map((m) => m.city).filter(Boolean)),
      ).sort() as string[],
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
      if (filterStage !== "all" && m.fundraising_stage !== filterStage) return false;
      if (
        filterVerification !== "all" &&
        m.verification_status !== filterVerification
      )
        return false;
      return true;
    });
  }, [
    members,
    search,
    filterSector,
    filterCity,
    filterRole,
    filterStage,
    filterVerification,
  ]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-(--color-muted)">
            FOUNDERS ARENA
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-(--color-ink)">
            Community
          </h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Browse all members in the network.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 py-8">
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
              { value: "startup", label: "Founder" },
            ]}
          />
          <FilterSelect
            value={filterStage}
            onChange={setFilterStage}
            label="Project stage"
            options={[
              { value: "all", label: "All project stages" },
              ...PROJECT_STAGES.map((s) => ({ value: s, label: s })),
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
              <MemberCard key={m.id} member={m} onSelect={setSelectedMember} />
            ))}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
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

function MemberCard({
  member: m,
  onSelect,
}: {
  member: CommunityMemberRecord;
  onSelect: (m: CommunityMemberRecord) => void;
}) {
  const initials = (m.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const stageBadgeText = m.fundraising_stage ?? `Stage ${m.stage}`;

  const roleBadge =
    m.member_role === "investor"
      ? {
          label: "Investor",
          cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-accent-gold)",
        }
      : m.member_role === "startup"
        ? {
            label: "Founder",
            cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-primary)",
          }
        : null;

  const verificationBadge =
    m.verification_status === "verified"
      ? {
          label: "Verified",
          cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-accent-gold)",
        }
      : m.verification_status === "pending"
        ? {
            label: "Pending",
            cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-body)",
          }
        : {
            label: "Unverified",
            cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-muted)",
          };

  return (
    <article
      className="flex flex-col gap-3 rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5 cursor-pointer transition-shadow hover:shadow-md hover:border-(--color-primary)/30"
      onClick={() => onSelect(m)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(m)}
    >
      {/* Avatar + name */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-sm font-semibold text-(--color-primary)">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-(--color-ink)">
            {m.full_name || "—"}
          </p>
          {m.business_name && (
            <p className="truncate text-sm text-(--color-body)">
              {m.business_name}
            </p>
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
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.cls}`}
          >
            {roleBadge.label}
          </span>
        )}
        <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
          {stageBadgeText}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${verificationBadge.cls}`}
        >
          {verificationBadge.label}
        </span>
      </div>

      {/* Bio */}
      {m.short_bio && (
        <p className="line-clamp-2 text-sm text-(--color-body)">
          {m.short_bio}
        </p>
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
                className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-primary)"
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
                className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-accent-gold)"
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

      <p className="mt-auto pt-1 text-right text-xs font-semibold text-(--color-primary)">
        View profile →
      </p>
    </article>
  );
}

// ─── Member detail modal ──────────────────────────────────────────────────────

type FullProfile = {
  linkedin_url: string | null;
  role_title: string | null;
  years_in_operation: string | null;
  employee_band: string | null;
  annual_revenue_estimate: string | null;
  asks_summary: string | null;
};

function MemberDetailModal({
  member: m,
  onClose,
}: {
  member: CommunityMemberRecord;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [full, setFull] = useState<FullProfile | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const initials = (m.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  // Fetch extra fields lazily
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "linkedin_url, role_title, years_in_operation, employee_band, annual_revenue_estimate, asks_summary",
        )
        .eq("id", m.id)
        .single();
      if (data) setFull(data as FullProfile);
    })();
  }, [supabase, m.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  // Parse v2 structured data
  let v2: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(full?.asks_summary ?? "");
    if (parsed?._v === 2) v2 = parsed;
  } catch { /* */ }

  const investorType = v2?.investor_type as string | null ?? null;
  const entityClass = (v2?.entity_class as string[] | null) ?? [];
  const targetStages = (v2?.target_stages as string[] | null) ?? [];
  const targetRegions = (v2?.target_regions as string[] | null) ?? [];
  const targetIndustries = (v2?.target_industries as string[] | null) ?? [];
  const fundraisingStage = (v2?.fundraising_stage as string | null) ?? m.fundraising_stage;
  const productStage = v2?.product_stage as string | null ?? null;
  const targetRaiseMin = v2?.target_raise_min as string | null ?? null;
  const targetRaiseMax = v2?.target_raise_max as string | null ?? null;

  const roleBadgeLabel =
    m.member_role === "investor"
      ? "Investor"
      : m.member_role === "startup"
        ? "Founder"
        : m.member_role === "ecosystem_partner"
          ? "Ecosystem Partner"
          : null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-(--color-hairline) bg-(--color-canvas) shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-(--color-hairline) bg-(--color-surface-soft) text-(--color-muted) hover:bg-(--color-hairline) transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-lg font-bold text-(--color-primary)">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-(--color-ink)">{m.full_name || "—"}</h2>
              {m.business_name && (
                <p className="text-sm text-(--color-body)">{m.business_name}</p>
              )}
              {full?.role_title && (
                <p className="text-xs text-(--color-muted)">{full.role_title}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleBadgeLabel && (
                  <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                    {roleBadgeLabel}
                  </span>
                )}
                {m.verification_status === "verified" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick facts grid */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {m.city && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Location</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{m.city}</p>
              </div>
            )}
            {m.sector && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Sector</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{m.sector}</p>
              </div>
            )}
            {full?.years_in_operation && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Years operating</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{full.years_in_operation}</p>
              </div>
            )}
            {full?.employee_band && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Team size</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{full.employee_band}</p>
              </div>
            )}
            {full?.annual_revenue_estimate && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Revenue</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{full.annual_revenue_estimate}</p>
              </div>
            )}
            {fundraisingStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Fundraising stage</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{fundraisingStage}</p>
              </div>
            )}
            {productStage && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Product stage</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{productStage}</p>
              </div>
            )}
            {investorType && (
              <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Investor type</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">{investorType}</p>
              </div>
            )}
            {(targetRaiseMin || targetRaiseMax) && (
              <div className="col-span-2 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-2.5">
                <p className="text-[10px] font-bold uppercase text-(--color-muted)">Target raise</p>
                <p className="mt-0.5 font-medium text-(--color-ink)">
                  {targetRaiseMin && targetRaiseMax
                    ? `$${Number(targetRaiseMin).toLocaleString()} – $${Number(targetRaiseMax).toLocaleString()}`
                    : targetRaiseMin
                      ? `From $${Number(targetRaiseMin).toLocaleString()}`
                      : `Up to $${Number(targetRaiseMax).toLocaleString()}`}
                </p>
              </div>
            )}
          </div>

          {/* Bio */}
          {m.short_bio && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">About</p>
              <p className="text-sm text-(--color-body) leading-relaxed">{m.short_bio}</p>
            </div>
          )}

          {/* Entity class / target stages / regions / industries */}
          {entityClass.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Entity class</p>
              <div className="flex flex-wrap gap-1.5">
                {entityClass.map((ec) => (
                  <span key={ec} className="rounded-full border border-(--color-hairline) bg-(--color-surface-soft) px-2 py-0.5 text-xs font-medium text-(--color-muted)">{ec}</span>
                ))}
              </div>
            </div>
          )}
          {targetStages.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Target stages</p>
              <div className="flex flex-wrap gap-1.5">
                {targetStages.map((s) => (
                  <span key={s} className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">{s}</span>
                ))}
              </div>
            </div>
          )}
          {targetRegions.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Target regions</p>
              <div className="flex flex-wrap gap-1.5">
                {targetRegions.map((r) => (
                  <span key={r} className="rounded-full border border-(--color-hairline) bg-(--color-surface-soft) px-2 py-0.5 text-xs font-medium text-(--color-muted)">{r}</span>
                ))}
              </div>
            </div>
          )}
          {targetIndustries.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Target industries</p>
              <div className="flex flex-wrap gap-1.5">
                {targetIndustries.map((i) => (
                  <span key={i} className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">{i}</span>
                ))}
              </div>
            </div>
          )}

          {/* Asks / Offers */}
          {m.ask_categories?.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Asking for</p>
              <div className="flex flex-wrap gap-1.5">
                {m.ask_categories.map((tag) => (
                  <span key={tag} className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-primary)">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {m.offer_categories?.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Offering</p>
              <div className="flex flex-wrap gap-1.5">
                {m.offer_categories.map((tag) => (
                  <span key={tag} className="rounded-[6px] border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs text-(--color-accent-gold)">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn */}
          {full?.linkedin_url && (
            <a
              href={full.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-(--color-primary) hover:underline"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn profile
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
