"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

type CofounderInvite = {
  id: string;
  uid_type: "email" | "phone";
  uid_value: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type CofounderLink = {
  id: string;
  cofounder_profile_id: string;
  created_at: string;
  profile: { full_name: string | null; business_name: string | null; email: string | null } | null;
};

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [invites, setInvites] = useState<CofounderInvite[]>([]);
  const [cofounders, setCofounders] = useState<CofounderLink[]>([]);
  const [inviteUidType, setInviteUidType] = useState<"email" | "phone">("email");
  const [inviteUidValue, setInviteUidValue] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
  }, [supabase, user?.id]);

  const loadCofounders = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch("/api/cofounders");
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
      setCofounders(data.cofounders ?? []);
    }
  }, [user?.id]);

  const handleInviteCofounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    if (!inviteUidValue.trim()) {
      setInviteError("Please enter an email or phone number.");
      return;
    }
    setInviteLoading(true);
    const res = await fetch("/api/cofounders/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid_type: inviteUidType, uid_value: inviteUidValue.trim() }),
    });
    setInviteLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setInviteError(data?.error ?? "Failed to send invite.");
      return;
    }
    setInviteSuccess(`Invite sent to ${inviteUidValue.trim()}.`);
    setInviteUidValue("");
    void loadCofounders();
  };

  const handleCancelInvite = async (inviteId: string) => {
    const res = await fetch("/api/cofounders/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (res.ok) void loadCofounders();
  };

  useEffect(() => {
    void loadProfile();
    void loadCofounders();
  }, [loadProfile, loadCofounders]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          void loadProfile();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadProfile, supabase, user?.id]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Profile
          </h1>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.full_name || "Member profile"} · Stage{" "}
            {profile?.stage || "0"}
          </p>
          {profile?.business_name && (
            <p className="mt-1 text-sm text-(--color-muted)">
              {profile.business_name}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-[5%] py-10">
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-lg font-semibold text-(--color-ink)">
            Business summary
          </h2>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.business_name || "Business name pending"}
          </p>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.short_bio || "No bio yet"}
          </p>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.sector || "Sector pending"} ·{" "}
            {profile?.city || "City pending"}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <h3 className="text-base font-semibold text-(--color-ink)">ASKS</h3>
            <div className="mt-4 space-y-2">
              {profile?.ask_categories && profile.ask_categories.length > 0 && (
                <div>
                  <p className="text-xs text-(--color-muted) font-semibold uppercase">
                    Categories
                  </p>
                  <ul className="mt-2 space-y-1">
                    {profile.ask_categories.map((cat: string, idx: number) => (
                      <li key={idx} className="text-sm text-(--color-body)">
                        • {cat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {profile?.asks_summary && (
              <div className="mt-4">
                <p className="text-xs text-(--color-muted) font-semibold uppercase">
                  Summary
                </p>
                <p className="mt-2 text-sm text-(--color-body)">
                  {profile.asks_summary}
                </p>
              </div>
            )}
            {!profile?.asks_summary && (
              <p className="mt-4 text-sm text-(--color-muted)">
                Complete your onboarding to set your ASKS summary.
              </p>
            )}
          </div>

          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <h3 className="text-base font-semibold text-(--color-ink)">
              OFFERS
            </h3>
            <div className="mt-4 space-y-2">
              {profile?.offer_categories &&
                profile.offer_categories.length > 0 && (
                  <div>
                    <p className="text-xs text-(--color-muted) font-semibold uppercase">
                      Categories
                    </p>
                    <ul className="mt-2 space-y-1">
                      {profile.offer_categories.map(
                        (cat: string, idx: number) => (
                          <li key={idx} className="text-sm text-(--color-body)">
                            • {cat}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </div>
            {profile?.offers_summary && (
              <div className="mt-4">
                <p className="text-xs text-(--color-muted) font-semibold uppercase">
                  Summary
                </p>
                <p className="mt-2 text-sm text-(--color-body)">
                  {profile.offers_summary}
                </p>
              </div>
            )}
            {!profile?.offers_summary && (
              <p className="mt-4 text-sm text-(--color-muted)">
                Complete your onboarding to set your OFFERS summary.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-lg font-semibold text-(--color-ink)">My Team / Cofounders</h2>
          <p className="mt-1 text-sm text-(--color-body)">
            Invite cofounders by email or phone number. They&apos;ll receive a link to join your team.
          </p>

          {cofounders.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">Linked Cofounders</p>
              {cofounders.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-(--color-hairline) px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-(--color-ink)">
                      {c.profile?.full_name || c.profile?.email || "Team member"}
                    </p>
                    {c.profile?.business_name && (
                      <p className="text-xs text-(--color-muted)">{c.profile.business_name}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}

          {invites.filter((i) => i.status === "pending").length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">Pending Invites</p>
              {invites.filter((i) => i.status === "pending").map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-(--color-hairline) px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-(--color-ink)">{inv.uid_value}</p>
                    <p className="text-xs text-(--color-muted)">
                      via {inv.uid_type} · expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelInvite(inv.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleInviteCofounder} className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-(--color-ink)">Invite a cofounder</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInviteUidType("email")}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  inviteUidType === "email"
                    ? "border-(--color-primary) bg-(--color-primary) text-white"
                    : "border-(--color-hairline) text-(--color-body) hover:border-(--color-primary) hover:text-(--color-primary)"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setInviteUidType("phone")}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  inviteUidType === "phone"
                    ? "border-(--color-primary) bg-(--color-primary) text-white"
                    : "border-(--color-hairline) text-(--color-body) hover:border-(--color-primary) hover:text-(--color-primary)"
                }`}
              >
                Phone
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type={inviteUidType === "email" ? "email" : "tel"}
                className="gn-input flex-1"
                value={inviteUidValue}
                onChange={(e) => { setInviteUidValue(e.target.value); setInviteError(""); }}
                placeholder={inviteUidType === "email" ? "cofounder@email.com" : "+63 912 345 6789"}
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="gn-btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {inviteLoading ? "Sending..." : "Send invite"}
              </button>
            </div>
            {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-green-600">{inviteSuccess}</p>}
          </form>
        </section>

        <section className="flex items-center justify-between gap-4">
          <Link
            href="/onboarding"
            className="text-sm text-(--color-primary) hover:underline"
          >
            Update your profile →
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center rounded-[10px] bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-primary-active)"
          >
            Purchase credits
          </Link>
        </section>
      </div>
    </div>
  );
}
