"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCommunityMembers,
  type CommunityMemberRecord,
} from "@/lib/app-data";
import { InsufficientCreditsModal } from "@/app/_components/InsufficientCreditsModal";

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

function roleBadgeConfig(role: string | null | undefined) {
  if (role === "investor") return { label: "Investor", cls: "bg-amber-400/15 text-amber-400 border border-amber-400/30" };
  if (role === "startup") return { label: "Founder", cls: "bg-orange-500/15 text-orange-400 border border-orange-500/30" };
  if (role === "ecosystem_partner") return { label: "Ecosystem Partner", cls: "bg-purple-500/15 text-purple-400 border border-purple-500/30" };
  return null;
}

export default function CommunityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [members, setMembers] = useState<CommunityMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionMap, setConnectionMap] = useState<Map<string, "pending" | "accepted">>(new Map());
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [selectedMember, setSelectedMember] = useState<CommunityMemberRecord | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState<{ needed: number; balance: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const [data, matchesResult, ledgerResult] = await Promise.all([
        fetchCommunityMembers(supabase),
        user
          ? supabase
              .from("matches")
              .select("member_a_id, member_b_id, status")
              .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
          : Promise.resolve({ data: null }),
        user
          ? supabase
              .from("ad_credit_ledger")
              .select("reason")
              .eq("member_id", user.id)
              .or("reason.ilike.Unlock community profile:%,reason.ilike.Unlock investor profile:%")
          : Promise.resolve({ data: null }),
      ]);

      setMembers(data);

      const map = new Map<string, "pending" | "accepted">();
      if (user && matchesResult.data) {
        for (const match of matchesResult.data as { member_a_id: string; member_b_id: string; status: string }[]) {
          const otherId = match.member_a_id === user.id ? match.member_b_id : match.member_a_id;
          map.set(otherId, match.status === "accepted" ? "accepted" : "pending");
        }
      }
      setConnectionMap(map);

      if (user && ledgerResult.data && ledgerResult.data.length > 0) {
        const ids = new Set(
          ledgerResult.data.map((r) => {
            const reason = r.reason as string;
            return reason
              .replace("Unlock community profile: ", "")
              .replace("Unlock investor profile: ", "")
              .trim();
          }),
        );
        setUnlockedProfiles(ids);
      }

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

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((m) => {
              if (!m.city) return null;
              const idx = m.city.lastIndexOf(", ");
              return idx !== -1 ? m.city.slice(idx + 2) : null;
            })
            .filter(Boolean),
        ),
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
      if (filterCountry !== "all") {
        const idx = m.city?.lastIndexOf(", ") ?? -1;
        const memberCountry = idx !== -1 ? m.city!.slice(idx + 2) : "";
        if (memberCountry !== filterCountry) return false;
      }
      if (filterRole !== "all" && m.member_role !== filterRole) return false;
      if (filterStage !== "all" && m.fundraising_stage !== filterStage) return false;
      if (filterVerification !== "all" && m.verification_status !== filterVerification) return false;
      return true;
    });
  }, [members, search, filterSector, filterCountry, filterRole, filterStage, filterVerification]);

  const handleProfileUnlocked = useCallback((memberId: string) => {
    setUnlockedProfiles((prev) => new Set([...prev, memberId]));
  }, []);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Founders Arena</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">Community</h1>
          <p className="mt-1 text-sm text-(--color-muted)">Browse all members in the network.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 pt-6 pb-8">
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
            value={filterRole}
            onChange={setFilterRole}
            label="Role"
            options={[
              { value: "all", label: "All roles" },
              { value: "startup", label: "Founders" },
              { value: "investor", label: "Investors" },
              { value: "ecosystem_partner", label: "Ecosystem Partners" },
            ]}
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
            value={filterCountry}
            onChange={setFilterCountry}
            label="Country"
            options={[
              { value: "all", label: "All countries" },
              ...countries.map((c) => ({ value: c, label: c })),
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
                className="h-40 animate-pulse rounded-[16px] border border-(--color-hairline) bg-(--color-surface-soft)"
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
              <MemberCard
                key={m.id}
                member={m}
                onSelect={setSelectedMember}
                connectionStatus={connectionMap.get(m.id) ?? null}
                isCurrentUser={m.id === currentUserId}
                isUnlocked={m.id !== currentUserId && unlockedProfiles.has(m.id)}
              />
            ))}
          </div>
        )}
      </div>

      {insufficientCredits && (
        <InsufficientCreditsModal
          needed={insufficientCredits.needed}
          balance={insufficientCredits.balance}
          onClose={() => setInsufficientCredits(null)}
        />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          currentUserId={currentUserId}
          connectionStatus={connectionMap.get(selectedMember.id) ?? null}
          isUnlocked={selectedMember.id === currentUserId || unlockedProfiles.has(selectedMember.id)}
          onUnlocked={handleProfileUnlocked}
          onInsufficientCredits={setInsufficientCredits}
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
  connectionStatus,
  isCurrentUser,
  isUnlocked,
}: {
  member: CommunityMemberRecord;
  onSelect: (m: CommunityMemberRecord) => void;
  connectionStatus: ConnectionStatus;
  isCurrentUser: boolean;
  isUnlocked: boolean;
}) {
  const initials = (m.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const roleBadge = roleBadgeConfig(m.member_role);

  const verificationBadge =
    m.verification_status === "verified"
      ? { label: "Verified", cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-accent-gold)" }
      : m.verification_status === "pending"
        ? { label: "Pending", cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-body)" }
        : { label: "Unverified", cls: "border border-(--color-hairline) bg-(--color-surface-strong) text-(--color-muted)" };

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
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isCurrentUser ? "ring-2 ring-(--color-primary) ring-offset-2 ring-offset-(--color-canvas) bg-(--color-primary)/10 text-(--color-primary)" : "bg-(--color-primary)/10 text-(--color-primary)"}`}>
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
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${verificationBadge.cls}`}>
          {verificationBadge.label}
        </span>
        {isCurrentUser && (
          <span className="rounded-full bg-(--color-primary)/15 px-2 py-0.5 text-xs font-semibold text-(--color-primary)">
            You
          </span>
        )}
        {!isCurrentUser && connectionStatus === "accepted" && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Connected
          </span>
        )}
        {!isCurrentUser && connectionStatus === "pending" && (
          <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
            Pending
          </span>
        )}
        {isUnlocked && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/25">
            <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
            Unlocked
          </span>
        )}
      </div>

      <p className="mt-auto pt-1 text-right text-xs font-semibold text-(--color-primary)">
        View profile →
      </p>
    </article>
  );
}

// ─── Member detail modal ──────────────────────────────────────────────────────

type FullProfile = {
  role_title: string | null;
  years_in_operation: string | null;
  employee_band: string | null;
  annual_revenue_estimate: string | null;
  asks_summary: string | null;
};

type IntroStatus = "idle" | "loading" | "sent" | "pending_connection" | "connected" | "exists" | "error";
type ConnectionStatus = "pending" | "accepted" | null;

function MemberDetailModal({
  member: m,
  currentUserId,
  connectionStatus,
  isUnlocked: initialUnlocked,
  onUnlocked,
  onInsufficientCredits,
  onClose,
}: {
  member: CommunityMemberRecord;
  currentUserId: string | null;
  connectionStatus: ConnectionStatus;
  isUnlocked: boolean;
  onUnlocked: (memberId: string) => void;
  onInsufficientCredits: (data: { needed: number; balance: number }) => void;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [full, setFull] = useState<FullProfile | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [introStatus, setIntroStatus] = useState<IntroStatus>(
    connectionStatus === "accepted" ? "connected" : connectionStatus === "pending" ? "pending_connection" : "idle"
  );
  const [introConfirm, setIntroConfirm] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const initials = (m.full_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  // Fetch extra fields when unlocked
  useEffect(() => {
    if (!isUnlocked) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role_title, years_in_operation, employee_band, annual_revenue_estimate, asks_summary")
        .eq("id", m.id)
        .single();
      if (data) setFull(data as FullProfile);
    })();
  }, [supabase, m.id, isUnlocked]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => { if (e.target === backdropRef.current) onClose(); },
    [onClose],
  );

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/community/unlock-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: m.id }),
      });
      const data = await res.json() as { success?: boolean; error?: string; needed?: number; balance?: number };
      if (!res.ok) {
        if (res.status === 402 && data.needed !== undefined && data.balance !== undefined) {
          onInsufficientCredits({ needed: data.needed, balance: data.balance });
        } else {
          setUnlockError(data.error ?? "Failed to unlock profile.");
        }
        setUnlocking(false);
        return;
      }
      setIsUnlocked(true);
      onUnlocked(m.id);
    } catch {
      setUnlockError("Something went wrong. Please try again.");
    }
    setUnlocking(false);
  };

  const requestIntro = useCallback(async () => {
    setIntroConfirm(false);
    setIntroStatus("loading");
    try {
      const res = await fetch("/api/community/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: m.id }),
      });
      const json = await res.json() as { success?: boolean; alreadyExists?: boolean; error?: string; needed?: number; balance?: number };
      if (json.alreadyExists) setIntroStatus("exists");
      else if (json.success) setIntroStatus("sent");
      else if (res.status === 402 && json.needed !== undefined && json.balance !== undefined) {
        setIntroStatus("idle");
        onInsufficientCredits({ needed: json.needed, balance: json.balance });
      } else setIntroStatus("error");
    } catch {
      setIntroStatus("error");
    }
  }, [m.id]);

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

  const roleBadge = roleBadgeConfig(m.member_role);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-(--color-hairline) bg-(--color-canvas) shadow-2xl">
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
              {isUnlocked && full?.role_title && (
                <p className="text-xs text-(--color-muted)">{full.role_title}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleBadge && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.cls}`}>
                    {roleBadge.label}
                  </span>
                )}
                {m.verification_status === "verified" && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    ✓ Verified
                  </span>
                )}
                {currentUserId === m.id && (
                  <span className="rounded-full bg-(--color-primary)/15 px-2 py-0.5 text-xs font-semibold text-(--color-primary)">
                    This is you
                  </span>
                )}
                {currentUserId !== m.id && connectionStatus === "accepted" && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                )}
                {currentUserId !== m.id && connectionStatus === "pending" && (
                  <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                    Request pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Basic always-visible facts */}
          {(m.city || m.sector) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
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
            </div>
          )}

          {/* ── Locked state ── */}
          {!isUnlocked && currentUserId !== m.id && (
            <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-5 flex flex-col gap-3 text-center">
              <div>
                <p className="text-sm font-semibold text-(--color-ink)">Full profile locked</p>
                <p className="mt-1 text-xs text-(--color-muted) leading-relaxed">
                  Unlock to see bio, asks &amp; offers, experience, financials, and contact details.
                </p>
              </div>
              {unlockError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{unlockError}</p>
              )}
              <button
                type="button"
                onClick={() => void handleUnlock()}
                disabled={unlocking}
                className="w-full rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {unlocking ? "Unlocking…" : "Unlock for free (beta)"}
              </button>
            </div>
          )}

          {/* ── Unlocked full details ── */}
          {isUnlocked && (
            <>
              {/* Extended facts grid */}
              {(full?.years_in_operation || full?.employee_band || full?.annual_revenue_estimate || fundraisingStage || productStage || investorType || targetRaiseMin || targetRaiseMax) && (
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
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
              )}

              {/* Bio */}
              {m.short_bio && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">About</p>
                  <p className="text-sm text-(--color-body) leading-relaxed">{m.short_bio}</p>
                </div>
              )}

              {/* Investor structured data */}
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

              {/* Request introduction CTA */}
              {currentUserId && currentUserId !== m.id && (
                <div className="pt-1">
                  {introStatus === "connected" ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      You&apos;re connected with this member.
                    </div>
                  ) : introStatus === "pending_connection" ? (
                    <div className="rounded-xl border border-(--color-hairline) px-4 py-3 text-sm text-(--color-muted)">
                      Connection request pending — waiting for their response.
                    </div>
                  ) : introStatus === "sent" ? (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Request sent — they&apos;ll see it in their notifications.
                    </div>
                  ) : introStatus === "exists" ? (
                    <div className="rounded-xl border border-(--color-hairline) px-4 py-3 text-sm text-(--color-muted)">
                      You already have a connection with this member.
                    </div>
                  ) : introConfirm ? (
                    <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-4 flex flex-col gap-3">
                      <p className="text-sm text-(--color-body)">
                        Send a connection request to this member. Free during beta.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIntroConfirm(false)}
                          className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void requestIntro()}
                          disabled={introStatus === "loading"}
                          className="flex-1 rounded-xl bg-(--color-primary) py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {introStatus === "loading" ? "Sending…" : "Confirm"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIntroConfirm(true)}
                      disabled={introStatus === "loading"}
                      className="w-full rounded-xl bg-(--color-primary) px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e55919] disabled:opacity-60"
                    >
                      {introStatus === "error" ? "Failed — try again" : "Request for free (beta)"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
