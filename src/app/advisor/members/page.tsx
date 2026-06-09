"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../providers";
import {
  fetchAdvisorMemberList,
  type AdvisorMemberListRecord,
} from "@/lib/app-data";
import { STAGE_CONFIG } from "@/types/constants";

const STAGE_COLORS: Record<string, string> = {
  "0": "bg-slate-100 text-slate-600",
  "1": "bg-blue-100 text-blue-700",
  "2": "bg-amber-100 text-amber-700",
  "3": "bg-purple-100 text-purple-700",
  "4": "bg-green-100 text-green-700",
};

const VERIFICATION_COLORS: Record<string, string> = {
  unverified: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
};

function getInitials(name: string | null, business: string | null) {
  const source = name || business || "?";
  return source
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Badge({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default function AdvisorMembersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [members, setMembers] = useState<AdvisorMemberListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchAdvisorMemberList(supabase);
      setMembers(data);
      setIsLoading(false);
    };
    void load();
  }, [supabase]);

  if (role !== "advisor" && role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link
          href="/dashboard"
          className="text-(--color-primary) hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const filtered = members.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      const name = (m.full_name ?? "").toLowerCase();
      const biz = (m.business_name ?? "").toLowerCase();
      if (!name.includes(q) && !biz.includes(q)) return false;
    }
    if (stageFilter !== "all" && m.stage !== stageFilter) return false;
    if (
      verificationFilter !== "all" &&
      m.verification_status !== verificationFilter
    )
      return false;
    if (statusFilter !== "all" && m.account_status !== statusFilter)
      return false;
    return true;
  });

  const stageCounts = members.reduce(
    (acc, m) => {
      acc[m.stage] = (acc[m.stage] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const hasFilters =
    search || stageFilter !== "all" || verificationFilter !== "all" || statusFilter !== "all";

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 pt-16 pb-12">
      <div className="mx-auto w-full max-w-7xl space-y-8">

        {/* Header */}
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Advisor Portal</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">
            Member management
          </h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            View and manage all members, stage progression, and account status.
          </p>
        </div>

        {/* Stage breakdown — click to filter */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["0", "1", "2", "3", "4"] as const).map((stage) => {
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                onClick={() =>
                  setStageFilter(active ? "all" : stage)
                }
                className={`rounded-[16px] border p-4 text-left transition ${
                  active
                    ? "border-(--color-primary) bg-(--color-primary) text-white"
                    : "border-(--color-hairline) bg-(--color-canvas) hover:border-(--color-border-strong)"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.1em] ${active ? "text-white/70" : "text-(--color-muted)"}`}
                >
                  Stage {stage}
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${active ? "text-white" : "text-(--color-primary)"}`}
                >
                  {isLoading ? "—" : (stageCounts[stage] ?? 0)}
                </p>
                <p
                  className={`mt-0.5 text-xs ${active ? "text-white/80" : "text-(--color-body)"}`}
                >
                  {STAGE_CONFIG[stage].label}
                </p>
              </button>
            );
          })}
        </section>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="gn-input max-w-xs"
            placeholder="Search name or business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Filter by verification status"
            className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-3 py-3 text-sm text-(--color-ink) focus:border-(--color-primary) focus:outline-none"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
          >
            <option value="all">All verification</option>
            <option value="unverified">Unverified</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
          </select>
          <select
            aria-label="Filter by member status"
            className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-3 py-3 text-sm text-(--color-ink) focus:border-(--color-primary) focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          {hasFilters && (
            <button
              className="rounded-lg border border-(--color-hairline) px-3 py-3 text-sm text-(--color-muted) transition hover:border-(--color-border-strong) hover:text-(--color-ink)"
              onClick={() => {
                setSearch("");
                setStageFilter("all");
                setVerificationFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
          <p className="ml-auto text-sm text-(--color-muted)">
            {isLoading
              ? "Loading..."
              : `${filtered.length} of ${members.length} members`}
          </p>
        </div>

        {/* Member list */}
        <div className="overflow-hidden rounded-[20px] border border-(--color-hairline) bg-(--color-canvas)">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-(--color-muted)">
              Loading members...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-(--color-body)">
              No members match the current filters.
            </div>
          ) : (
            <div className="divide-y divide-(--color-hairline)">
              {filtered.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: AdvisorMemberListRecord }) {
  const initials = getInitials(member.full_name, member.business_name);
  const stageLabel =
    STAGE_CONFIG[member.stage as keyof typeof STAGE_CONFIG]?.label ??
    member.stage;

  return (
    <div className="flex items-center gap-4 px-6 py-4 transition hover:bg-(--color-surface-soft)">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-sm font-semibold text-white">
        {initials}
      </div>

      {/* Name + business */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-(--color-ink)">
          {member.full_name || "—"}
        </p>
        <p className="truncate text-xs text-(--color-muted)">
          {member.business_name || "No business name"}
          {member.city ? ` · ${member.city}` : ""}
        </p>
      </div>

      {/* Sector */}
      <p className="hidden w-28 truncate text-xs text-(--color-body) sm:block">
        {member.sector || "—"}
      </p>

      {/* Badges */}
      <div className="hidden items-center gap-2 sm:flex">
        <Badge
          label={`Stage ${member.stage} · ${stageLabel}`}
          colorClass={
            STAGE_COLORS[member.stage] ?? "bg-slate-100 text-slate-600"
          }
        />
        <Badge
          label={member.verification_status}
          colorClass={
            VERIFICATION_COLORS[member.verification_status] ??
            "bg-slate-100 text-slate-600"
          }
        />
        {member.account_status !== "active" && (
          <Badge
            label={member.account_status}
            colorClass={
              STATUS_COLORS[member.account_status] ??
              "bg-slate-100 text-slate-600"
            }
          />
        )}
      </div>

      {/* Joined date */}
      <p className="hidden w-24 shrink-0 text-right text-xs text-(--color-muted) md:block">
        {new Date(member.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* View */}
      <Link
        href={`/advisor/members/${member.id}`}
        className="shrink-0 rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition hover:border-(--color-border-strong) hover:bg-(--color-surface-soft)"
      >
        View →
      </Link>
    </div>
  );
}
