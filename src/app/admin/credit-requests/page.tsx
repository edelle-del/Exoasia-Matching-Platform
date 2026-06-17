"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { ShieldAlert, Check, X, Clock } from "lucide-react";

type ProfileInfo = {
  full_name: string | null;
  business_name: string | null;
  email: string | null;
};

type CreditRequest = {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles: ProfileInfo | null;
};

export default function AdminCreditRequestsPage() {
  const { role } = useAuth();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/credit-requests`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleResolve = async (id: string, action: "approve" | "reject") => {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/admin/credit-requests/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setToast(`Request ${action === "approve" ? "approved" : "rejected"} successfully.`);
        setTimeout(() => setToast(null), 3500);
        void fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to resolve request.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
    setResolvingId(null);
  };

  if (role !== "admin") {
    return (
      <div className="min-h-screen px-4 py-16 text-center">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link href="/dashboard" className="text-(--color-primary) hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const resolvedRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 pt-16 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) flex items-center gap-2">
              <ShieldAlert className="h-3 w-3 text-red-500" /> Super Admin Portal
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-(--color-ink)">Credit Requests</h1>
            <p className="mt-2 text-sm text-(--color-body) max-w-2xl">
              Review and manage credit top-up requests from members. Approving a request will automatically provision the credits to their account.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 mt-2">
            <Link
              href="/admin/users"
              className="text-sm font-medium text-(--color-muted) hover:text-(--color-ink) transition-colors"
            >
              ← Back to User Management
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-(--color-ink)">Pending Requests ({pendingRequests.length})</h2>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-(--color-surface-soft) rounded-2xl border border-(--color-hairline)"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-(--color-muted)">No pending requests.</p>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-(--color-surface-soft) border border-(--color-hairline)">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {req.profiles?.full_name || req.profiles?.email || "Unknown User"} 
                      <span className="text-(--color-muted) font-normal ml-2 text-xs">
                        {req.profiles?.business_name ? `(${req.profiles.business_name})` : ""}
                      </span>
                    </p>
                    <p className="text-xs text-(--color-body)">Requested <span className="font-bold text-(--color-primary)">{req.amount} credits</span></p>
                    {req.reason && <p className="text-xs text-(--color-muted) italic mt-1">&quot;{req.reason}&quot;</p>}
                    <p className="text-[10px] text-(--color-muted-soft) font-mono mt-2">
                      {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleResolve(req.id, "reject")}
                      disabled={resolvingId === req.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 text-xs font-semibold"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleResolve(req.id, "approve")}
                      disabled={resolvingId === req.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-(--color-primary) text-white hover:opacity-90 transition-opacity disabled:opacity-50 text-xs font-semibold"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 pt-8 border-t border-(--color-hairline)">
          <h2 className="text-xl font-bold text-(--color-ink)">Resolved Requests</h2>
          {isLoading ? (
            <p className="text-sm text-(--color-muted)">Loading...</p>
          ) : resolvedRequests.length === 0 ? (
            <p className="text-sm text-(--color-muted)">No resolved requests.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-(--color-hairline) bg-(--color-canvas)">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-(--color-hairline) bg-(--color-surface-soft)">
                    <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold text-(--color-muted) text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--color-hairline)">
                  {resolvedRequests.map(req => (
                    <tr key={req.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-(--color-ink)">{req.profiles?.full_name || req.profiles?.email}</p>
                        <p className="text-xs text-(--color-muted)">{req.profiles?.business_name}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-(--color-ink)">{req.amount}</td>
                      <td className="px-6 py-4">
                        {req.status === "approved" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                            <Check className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                            <X className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-(--color-muted)">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
