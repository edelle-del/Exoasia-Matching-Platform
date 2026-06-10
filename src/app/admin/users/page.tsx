"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/providers";

type AdminUser = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  member_role: string | null;
  stage: string;
  verification_status: string;
  account_status: string;
  created_at: string;
};

function rolePill(role: string | null) {
  if (role === "startup") return <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400 border border-orange-500/25">Founder</span>;
  if (role === "investor") return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-400/25">Investor</span>;
  if (role === "ecosystem_partner") return <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/25">Ecosystem Partner</span>;
  return <span className="rounded-full bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-muted) border border-(--color-hairline)">{role ?? "—"}</span>;
}

export default function AdminUsersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, email, member_role, stage, verification_status, account_status, created_at")
        .order("created_at", { ascending: false });
      setUsers((data ?? []) as AdminUser[]);
      setIsLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay = [u.full_name, u.business_name, u.email].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterRole !== "all" && u.member_role !== filterRole) return false;
      if (filterVerification !== "all" && u.verification_status !== filterVerification) return false;
      return true;
    });
  }, [users, search, filterRole, filterVerification]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/users/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete user.");
        setDeleting(false);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
      setToast(`${confirmDelete.full_name ?? confirmDelete.email ?? "User"} deleted.`);
      setTimeout(() => setToast(null), 3500);
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    }
    setDeleting(false);
  };

  if (role !== "admin") {
    return (
      <div className="min-h-screen px-4 py-16 text-center">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link href="/dashboard" className="text-(--color-primary) hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 pt-16 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-xl flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Destructive Action</p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">Delete user?</h2>
              <p className="mt-2 text-sm text-(--color-body)">
                This will permanently delete{" "}
                <span className="font-semibold text-(--color-ink)">
                  {confirmDelete.full_name ?? confirmDelete.email ?? "this user"}
                </span>{" "}
                and all their data. This cannot be undone.
              </p>
            </div>
            {deleteError && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setConfirmDelete(null); setDeleteError(""); }}
                disabled={deleting}
                className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Admin Portal</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">User Management</h1>
            <p className="mt-1 text-sm text-(--color-muted)">
              {isLoading ? "Loading…" : `${users.length} total users`}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-(--color-muted) hover:text-(--color-ink) transition-colors mt-1"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, business, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 min-w-[220px] flex-1 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary)"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filter by role"
            className="h-9 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
          >
            <option value="all">All roles</option>
            <option value="startup">Founders</option>
            <option value="investor">Investors</option>
            <option value="ecosystem_partner">Ecosystem Partners</option>
          </select>
          <select
            value={filterVerification}
            onChange={(e) => setFilterVerification(e.target.value)}
            aria-label="Filter by verification"
            className="h-9 rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
          >
            <option value="all">All verification</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        {!isLoading && (
          <p className="text-xs text-(--color-muted)">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft)" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-surface-soft) p-8 text-center text-sm text-(--color-body)">
            No users match your filters.
          </div>
        ) : (
          <div className="rounded-[16px] border border-(--color-hairline) overflow-hidden">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className={[
                  "flex items-center gap-4 px-5 py-3.5",
                  i < filtered.length - 1 ? "border-b border-(--color-hairline)" : "",
                  i % 2 === 0 ? "bg-(--color-canvas)" : "bg-(--color-surface-soft)",
                ].join(" ")}
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-sm font-semibold text-(--color-primary)">
                  {(u.full_name ?? u.email ?? "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("") || "?"}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-(--color-ink)">
                    {u.full_name ?? <span className="text-(--color-muted)">No name</span>}
                  </p>
                  <p className="truncate text-xs text-(--color-muted)">{u.email ?? "—"}</p>
                </div>

                {/* Role + verification */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {rolePill(u.member_role)}
                  {u.verification_status === "verified" && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Verified</span>
                  )}
                </div>

                {/* Joined */}
                <p className="hidden lg:block shrink-0 text-xs text-(--color-muted)">
                  {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/advisor/members/${u.id}`}
                    className="rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-hairline) transition-colors"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(u); setDeleteError(""); }}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
