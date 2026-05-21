"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

// ─── Matching profile renderer ────────────────────────────────────────────────

type V2Investor = {
  _v: 2;
  investor_type?: string;
  entity_class?: string[];
  investment_interests?: string[];
  target_regions?: string[];
  target_industries?: string[];
  target_stages?: string[];
  lp_check_min?: string;
  lp_check_max?: string;
  direct_check_min?: string;
  direct_check_max?: string;
};

type V2Startup = {
  _v: 2;
  target_regions?: string[];
  target_industries?: string[];
  fundraising_stage?: string;
  target_raise_min?: string;
  target_raise_max?: string;
};

function parseV2(raw: string | null | undefined): V2Investor | V2Startup | null {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (parsed?._v === 2) return parsed;
  } catch { /* legacy */ }
  return null;
}

function ProfileTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-(--color-primary)/10 px-2.5 py-0.5 text-xs font-medium text-(--color-primary)">
      {children}
    </span>
  );
}

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
        {label}
      </p>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-(--color-muted)">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => <ProfileTag key={item}>{item}</ProfileTag>)}
    </div>
  );
}

function CheckRange({ min, max }: { min?: string; max?: string }) {
  if (!min && !max) return <p className="text-sm text-(--color-muted)">—</p>;
  return (
    <p className="text-sm font-medium text-(--color-ink)">
      ${min || "—"} – ${max || "—"}
    </p>
  );
}

function InvestorMatchingProfile({ data }: { data: V2Investor }) {
  const hasLp = !!(data.lp_check_min || data.lp_check_max);
  return (
    <div className="space-y-5">
      {data.investor_type && (
        <ProfileRow label="Investor Type">
          <ProfileTag>{data.investor_type}</ProfileTag>
        </ProfileRow>
      )}
      {!!data.entity_class?.length && (
        <ProfileRow label="Entity Class">
          <TagList items={data.entity_class} />
        </ProfileRow>
      )}
      {!!data.investment_interests?.length && (
        <ProfileRow label="Investment Interests">
          <TagList items={data.investment_interests} />
        </ProfileRow>
      )}
      {!!data.target_regions?.length && (
        <ProfileRow label="Target Regions">
          <TagList items={data.target_regions} />
        </ProfileRow>
      )}
      {!!data.target_industries?.length && (
        <ProfileRow label="Target Industries">
          <TagList items={data.target_industries} />
        </ProfileRow>
      )}
      {!!data.target_stages?.length && (
        <ProfileRow label="Target Stage">
          <TagList items={data.target_stages} />
        </ProfileRow>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {hasLp && (
          <ProfileRow label="LP Investment Check Size">
            <CheckRange min={data.lp_check_min} max={data.lp_check_max} />
          </ProfileRow>
        )}
        <ProfileRow label="Direct Startup Check Size">
          <CheckRange min={data.direct_check_min} max={data.direct_check_max} />
        </ProfileRow>
      </div>
    </div>
  );
}

function StartupMatchingProfile({ data }: { data: V2Startup }) {
  return (
    <div className="space-y-5">
      {!!data.target_regions?.length && (
        <ProfileRow label="Target Regions">
          <TagList items={data.target_regions} />
        </ProfileRow>
      )}
      {!!data.target_industries?.length && (
        <ProfileRow label="Industries">
          <TagList items={data.target_industries} />
        </ProfileRow>
      )}
      {data.fundraising_stage && (
        <ProfileRow label="Fundraising Stage">
          <ProfileTag>{data.fundraising_stage}</ProfileTag>
        </ProfileRow>
      )}
      <ProfileRow label="Target Raise Amount">
        <CheckRange min={data.target_raise_min} max={data.target_raise_max} />
      </ProfileRow>
    </div>
  );
}

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

        {(() => {
          const v2 = parseV2(profile?.asks_summary);
          const roleLabel =
            profile?.member_role === "investor"
              ? "Investor / Ecosystem Partner"
              : profile?.member_role === "startup"
              ? "Startup / Founder"
              : null;

          if (v2) {
            return (
              <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-(--color-ink)">Matching Profile</h2>
                  {roleLabel && (
                    <span className="rounded-full bg-(--color-primary)/10 px-3 py-1 text-xs font-semibold text-(--color-primary)">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <div className="mt-6">
                  {profile.member_role === "investor"
                    ? <InvestorMatchingProfile data={v2 as V2Investor} />
                    : <StartupMatchingProfile data={v2 as V2Startup} />}
                </div>
              </section>
            );
          }

          // Legacy fallback
          return (
            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
                <h3 className="text-base font-semibold text-(--color-ink)">ASKS</h3>
                {profile?.ask_categories?.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {profile.ask_categories.map((cat: string, idx: number) => (
                      <li key={idx} className="text-sm text-(--color-body)">• {cat}</li>
                    ))}
                  </ul>
                )}
                {!profile?.asks_summary && (
                  <p className="mt-4 text-sm text-(--color-muted)">
                    Complete your onboarding to set your ASKS summary.
                  </p>
                )}
              </div>
              <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
                <h3 className="text-base font-semibold text-(--color-ink)">OFFERS</h3>
                {profile?.offer_categories?.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {profile.offer_categories.map((cat: string, idx: number) => (
                      <li key={idx} className="text-sm text-(--color-body)">• {cat}</li>
                    ))}
                  </ul>
                )}
                {!profile?.offers_summary && (
                  <p className="mt-4 text-sm text-(--color-muted)">
                    Complete your onboarding to set your OFFERS summary.
                  </p>
                )}
              </div>
            </section>
          );
        })()}

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
