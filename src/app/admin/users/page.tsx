"use client";

import React, { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, X, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";

type AdminUser = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  member_role: string | null;
  app_role: string;
  stage: string;
  verification_status: string;
  account_status: string;
  created_at: string;
  sector: string | null;
  city: string | null;
  role_title: string | null;
  employee_band: string | null;
  annual_revenue_estimate: string | null;
  short_bio: string | null;
};

function rolePill(role: string | null) {
  if (role === "startup") return <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400 border border-orange-500/25">Founder</span>;
  if (role === "investor") return <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-400/25">Investor</span>;
  if (role === "ecosystem_partner") return <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/25">Ecosystem Partner</span>;
  return <span className="rounded-full bg-(--color-surface-strong) px-2 py-0.5 text-xs font-medium text-(--color-muted) border border-(--color-hairline)">{role ?? "—"}</span>;
}

function appRolePill(role: string) {
  if (role === "admin") return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30">Admin</span>;
  if (role === "advisor") return <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">Advisor</span>;
  if (role === "staff") return <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/30">Staff</span>;
  return <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border border-gray-500/30">Member</span>;
}

export default function AdminUsersPage() {
  const { role } = useAuth();
  
  // Data State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & Filtering State
  const [page, setPage] = useState(1);
  const limit = 20;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");

  // Modals & UI State
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterVerification]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&role=${filterRole}&verification=${filterVerification}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
    setIsLoading(false);
  }, [page, limit, debouncedSearch, filterRole, filterVerification]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

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
      setToast(`${confirmDelete.full_name ?? confirmDelete.email ?? "User"} deleted.`);
      setTimeout(() => setToast(null), 3500);
      setConfirmDelete(null);
      void fetchUsers();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    }
    setDeleting(false);
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    if (!inviteEmail.trim()) { setInviteError("Email is required."); return; }
    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to invite admin.");
      } else {
        setToast(`Invite sent to ${inviteEmail}.`);
        setTimeout(() => setToast(null), 3500);
        setShowInviteAdmin(false);
        setInviteEmail("");
        void fetchUsers();
      }
    } catch {
      setInviteError("Network error.");
    }
    setInviteLoading(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setIsSaving(true);
    setSaveError("");

    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editUser.full_name,
          business_name: editUser.business_name,
          member_role: editUser.member_role,
          app_role: editUser.app_role,
          stage: editUser.stage,
          verification_status: editUser.verification_status,
          account_status: editUser.account_status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to update user.");
        setIsSaving(false);
        return;
      }
      setToast(`User updated successfully.`);
      setTimeout(() => setToast(null), 3500);
      setEditUser(null);
      void fetchUsers();
    } catch {
      setSaveError("Something went wrong saving the user.");
    }
    setIsSaving(false);
  };

  if (role !== "admin") {
    return (
      <div className="min-h-screen px-4 py-16 text-center">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link href="/dashboard" className="text-(--color-primary) hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 pt-16 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-2xl flex flex-col gap-4 relative">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-primary)">New Admin</p>
              <h2 className="mt-1 text-lg font-bold text-(--color-ink)">Invite Administrator</h2>
              <p className="mt-2 text-sm text-(--color-body)">
                Send an invite to a new platform administrator. They will receive an email to set their password.
              </p>
            </div>
            <form onSubmit={handleInviteAdmin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="admin@exoasia.org"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
                className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                required
              />
              {inviteError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 border border-red-200">{inviteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteAdmin(false)}
                  disabled={inviteLoading}
                  className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-hairline) transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {inviteLoading ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-2xl flex flex-col gap-5 relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Destructive Action</p>
              </div>
              <h2 className="mt-1 text-lg font-bold text-(--color-ink)">Delete user?</h2>
              <p className="mt-2 text-sm text-(--color-body)">
                This will permanently delete <span className="font-semibold text-(--color-ink)">{confirmDelete.full_name ?? confirmDelete.email ?? "this user"}</span> and all their data. This cannot be undone.
              </p>
            </div>
            {deleteError && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 border border-red-200">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setConfirmDelete(null); setDeleteError(""); }}
                disabled={deleting}
                className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-hairline) transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm py-8">
          <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) shadow-2xl relative">
            <button 
              onClick={() => setEditUser(null)}
              className="absolute top-5 right-5 text-(--color-muted) hover:text-(--color-ink) transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="px-8 py-6 border-b border-(--color-hairline)">
              <h2 className="text-xl font-bold text-(--color-ink)">Edit User</h2>
              <p className="text-xs text-(--color-muted) mt-1 font-mono">{editUser.email}</p>
            </div>

            <form onSubmit={handleEditSave} className="px-8 py-6 space-y-8">
              {saveError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {saveError}
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Identity */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) border-b border-(--color-hairline) pb-2">Identity</h3>
                    
                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={editUser.full_name ?? ""}
                        onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Business Name</label>
                      <input
                        type="text"
                        value={editUser.business_name ?? ""}
                        onChange={(e) => setEditUser({...editUser, business_name: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Platform Access */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-widest text-(--color-muted) border-b border-(--color-hairline) pb-2">
                      <ShieldAlert className="h-3 w-3 text-red-400" /> Platform Access
                    </h3>
                    
                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Application Role</label>
                      <select
                        value={editUser.app_role}
                        onChange={(e) => setEditUser({...editUser, app_role: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors font-medium"
                      >
                        <option value="member">Member</option>
                        <option value="advisor">Advisor</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Account Status</label>
                      <select
                        value={editUser.account_status}
                        onChange={(e) => setEditUser({...editUser, account_status: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      >
                        <option value="active">Active</option>
                        <option value="invited">Invited</option>
                        <option value="blocked">Blocked / Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Network Status */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) border-b border-(--color-hairline) pb-2">Network Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Member Role</label>
                      <select
                        value={editUser.member_role ?? ""}
                        onChange={(e) => setEditUser({...editUser, member_role: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      >
                        <option value="">None</option>
                        <option value="startup">Founder (Startup)</option>
                        <option value="investor">Investor</option>
                        <option value="ecosystem_partner">Ecosystem Partner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Stage</label>
                      <select
                        value={editUser.stage}
                        onChange={(e) => setEditUser({...editUser, stage: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      >
                        <option value="0">0 - Discover</option>
                        <option value="1">1 - Ignite</option>
                        <option value="2">2 - Match</option>
                        <option value="3">3 - Commit</option>
                        <option value="4">4 - Guide</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-(--color-body) mb-1.5">Verification</label>
                      <select
                        value={editUser.verification_status}
                        onChange={(e) => setEditUser({...editUser, verification_status: e.target.value})}
                        className="w-full rounded-[10px] border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) focus:border-(--color-primary) outline-none transition-colors"
                      >
                        <option value="unverified">Unverified</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-(--color-hairline)">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  disabled={isSaving}
                  className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-5 py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-hairline) transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Saving changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) flex items-center gap-2">
              <ShieldAlert className="h-3 w-3 text-red-500" /> Super Admin Portal
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-(--color-ink)">User Management</h1>
            <p className="mt-2 text-sm text-(--color-body) max-w-2xl">
              Authoritative control over all members and staff. Actions taken here immediately affect platform access and privileges.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-2">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-(--color-muted) hover:text-(--color-ink) transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={() => { setShowInviteAdmin(true); setInviteError(""); setInviteEmail(""); }}
              className="text-sm font-semibold text-white bg-(--color-primary) px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              + Invite Admin
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-(--color-surface-soft) p-4 rounded-2xl border border-(--color-hairline)">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--color-muted)" />
              <input
                type="text"
                placeholder="Search by name, business, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) pl-10 pr-4 text-sm text-(--color-ink) outline-none placeholder:text-(--color-muted) focus:border-(--color-primary) transition-colors"
              />
            </div>
            
            <div className="h-6 w-px bg-(--color-hairline) hidden sm:block mx-2" />
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-10 rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-4 py-0 text-sm font-medium text-(--color-ink) outline-none focus:border-(--color-primary) cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="startup">Founders</option>
              <option value="investor">Investors</option>
              <option value="ecosystem_partner">Ecosystem Partners</option>
            </select>
            
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value)}
              className="h-10 rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-4 py-0 text-sm font-medium text-(--color-ink) outline-none focus:border-(--color-primary) cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          
          <div className="text-xs font-medium text-(--color-muted) bg-(--color-canvas) px-3 py-1.5 rounded-lg border border-(--color-hairline)">
            {totalUsers} {totalUsers === 1 ? 'user' : 'users'} found
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-(--color-hairline) bg-(--color-surface-soft)">
                  <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Platform Role</th>
                  <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Network Status</th>
                  <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-hairline)">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><div className="h-10 bg-(--color-surface-soft) rounded animate-pulse w-48"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-(--color-surface-soft) rounded animate-pulse w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-(--color-surface-soft) rounded animate-pulse w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-(--color-surface-soft) rounded animate-pulse w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-8 bg-(--color-surface-soft) rounded animate-pulse w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-(--color-muted)">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <Fragment key={u.id}>
                      <tr className="hover:bg-(--color-surface-soft)/50 transition-colors group">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary)/10 text-sm font-bold text-(--color-primary)">
                            {(u.full_name ?? u.email ?? "?").split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-(--color-ink)">{u.full_name ?? <span className="text-(--color-muted) font-normal italic">No name provided</span>}</p>
                            <p className="text-xs text-(--color-muted) font-mono mt-0.5">{u.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {appRolePill(u.app_role)}
                          {u.account_status === "blocked" && (
                            <span className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mt-1">Blocked</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {rolePill(u.member_role)}
                          <div className="flex items-center gap-2 mt-1">
                            {u.verification_status === "verified" ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500"><ShieldAlert className="h-3 w-3" /> Verified</span>
                            ) : u.verification_status === "pending" ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending KYC</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-muted)">Unverified</span>
                            )}
                            <span className="text-[10px] font-medium text-(--color-muted)">• Stage {u.stage}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-(--color-muted)">
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setExpandedRow(expandedRow === u.id ? null : u.id)}
                            className="p-2 rounded-lg text-(--color-muted) hover:text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors"
                            title={expandedRow === u.id ? "Collapse Details" : "Expand Details"}
                          >
                            {expandedRow === u.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-2 rounded-lg text-(--color-muted) hover:text-(--color-primary) hover:bg-(--color-primary)/10 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(u); setDeleteError(""); }}
                            className="p-2 rounded-lg text-(--color-muted) hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === u.id && (
                      <tr className="bg-(--color-surface-soft)/40 border-b border-(--color-hairline)">
                        <td colSpan={5} className="px-6 py-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Business Name</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.business_name ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Role / Title</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.role_title ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Sector</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.sector ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Location</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.city ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Company Size</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.employee_band ?? "—"}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Revenue Estimate</p>
                              <p className="text-sm font-medium text-(--color-ink)">{u.annual_revenue_estimate ?? "—"}</p>
                            </div>
                            <div className="col-span-1 lg:col-span-2 space-y-1">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Short Bio</p>
                              <p className="text-sm text-(--color-body) max-w-prose whitespace-normal">
                                {u.short_bio ?? <span className="italic">No bio provided.</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-(--color-hairline) bg-(--color-surface-soft)">
              <p className="text-xs font-medium text-(--color-muted)">
                Showing <span className="text-(--color-ink)">{Math.min((page - 1) * limit + 1, totalUsers)}</span> to <span className="text-(--color-ink)">{Math.min(page * limit, totalUsers)}</span> of <span className="text-(--color-ink)">{totalUsers}</span> results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-(--color-hairline) bg-(--color-canvas) text-(--color-ink) hover:bg-(--color-hairline) transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-semibold text-(--color-ink)">{page}</span>
                  <span className="text-sm text-(--color-muted)">/</span>
                  <span className="text-sm text-(--color-muted)">{totalPages}</span>
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-(--color-hairline) bg-(--color-canvas) text-(--color-ink) hover:bg-(--color-hairline) transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
