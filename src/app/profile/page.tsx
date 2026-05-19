"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
  }, [supabase, user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
