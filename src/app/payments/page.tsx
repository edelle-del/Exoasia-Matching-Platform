"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_PACKAGES, DURATION_PLANS, type CreditPackage } from "@/types/constants";

type CreditRole = "startup" | "investor" | "ecosystem_partner";

// Reflected with new weekly non-stacking limits, 3cr unblurs, and Bulk AI Sweeps.
const CREDIT_COSTS: {
  action: string;
  cost: number;
  note: string;
  reason: string;
  includedWithPlan: boolean;
  roles: CreditRole[];
  href: string;
}[] = [
    // ── Startup (Founder) ───────────────────────────────────────────────────────
    {
      action: "Unlock Blurred Investor Match",
      cost: 3,
      note: "3 cr per match · applies on all tiers",
      reason: "On the free tier, you can see up to 3 unblurred investor matches. Any additional matching profiles generated beyond this limit are visually masked. You can permanently unlock any individual blurred card for 3 credits across both free and paid plans.",
      includedWithPlan: false,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Bulk AI Match Sweep",
      cost: 3,
      note: "3 cr per sweep · applies on all tiers",
      reason: "Triggers a heavy database-wide background AI computation worker that processes all existing platform records against your thesis parameters, building a ranked ecosystem shortlist. Runs asynchronously via background pipelines and costs a flat credit fee per execution on all tiers.",
      includedWithPlan: false,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Investor profiles & compatibility breakdowns",
      cost: 0,
      note: "Free · applies on all tiers",
      reason: "Detailed investor profile views and compatibility breakdowns are completely free for all founders. There are no weekly limits or fallback credit costs.",
      includedWithPlan: true,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Cofounder email invite",
      cost: 0,
      note: "Free · applies on all tiers",
      reason: "Cofounder Email Invites remain 100% free with zero weekly limits across all tiers to encourage network growth and collaboration.",
      includedWithPlan: true,
      roles: ["startup"],
      href: "/requests",
    },
    {
      action: "Unlock Blurred Investor Match",
      cost: 3,
      note: "3 cr per match · applies on all tiers",
      reason: "Free tier founders can see up to 3 unblurred investor recommendations matching their project. Matches beyond this cap are rendered blurred. Spending 3 credits permanently unmasks the investor profile details.",
      includedWithPlan: false,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Bulk AI Match Sweep ('Create Matches')",
      cost: 3,
      note: "Free for first run · then 3 cr per sweep",
      reason: "Triggers a heavy database-wide background AI computation worker that processes all existing platform records against your project parameters, building a ranked ecosystem shortlist. The initial run is free; subsequent executions cost a flat 3-credit fee on all tiers.",
      includedWithPlan: false,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Investor Profiles & Compatibility",
      cost: 0,
      note: "Free for every unblurred match",
      reason: "Always Free for every unblurred match with no weekly caps. Paid subscribers enjoy unlimited views.",
      includedWithPlan: true,
      roles: ["startup"],
      href: "/matches",
    },
    {
      action: "Request intro to investor",
      cost: 2,
      note: "2 free/wk · then 2 cr fallback · unlimited with plan",
      reason: "Initiating a formal, managed introduction request applies a warm platform vouch and surfaces your venture parameters directly to an investor's board. Free tier accounts are subject to weekly outreach limits; exceeding this limit invokes a 2-credit High-Value Outreach Fallback.",
      includedWithPlan: true,
      roles: ["startup"],
      href: "/matches",
    },
    // ── Shared ────────────────────────────────────────────────────────────────
    {
      action: "Community member profile unlock",
      cost: 1,
      note: "5 free/wk · then 1 cr fallback · unlimited with plan",
      reason: "Basic membership cards remain globally viewable. Accessing deep contact parameters, portfolio bios, and custom asks/offers is limited to 5 free community unlocks per week on the free tier. Bypassing an exhausted weekly quota costs 1 fallback credit per profile, whereas paid plan tiers are fully unrestricted.",
      includedWithPlan: true,
      roles: ["startup", "investor"],
      href: "/community",
    },
    {
      action: "Community introduction request",
      cost: 1,
      note: "Weekly limit · then 1 cr fallback",
      reason: "Establishes a double-opt-in connection request between standard community members. Exceeding your weekly allowance requires a 1-credit fallback fee.",
      includedWithPlan: true,
      roles: ["startup", "investor", "ecosystem_partner"],
      href: "/community",
    },
    // ── Investor ──────────────────────────────────────────────────────────────
    {
      action: "Unlock Blurred Startup Match",
      cost: 3,
      note: "3 cr per match · applies on all tiers",
      reason: "Free tier investors can see up to 10 unblurred startup recommendations matching their high-level configurations. Matches beyond this cap are rendered blurred on your dashboard. Spending 3 credits permanently unmasks the startup asset profile details.",
      includedWithPlan: false,
      roles: ["investor"],
      href: "/matches",
    },
    {
      action: "Bulk AI Match Sweep",
      cost: 3,
      note: "3 cr per sweep · applies on all tiers",
      reason: "Triggers a heavy database-wide background AI computation worker that processes all existing platform records against your thesis parameters, building a ranked ecosystem shortlist. Runs asynchronously via background pipelines and costs a flat credit fee per execution on all tiers.",
      includedWithPlan: false,
      roles: ["investor"],
      href: "/matches",
    },
    {
      action: "Startup pitch deck access",
      cost: 1,
      note: "1 free/wk · then 1 cr fallback · unlimited with plan",
      reason: "To safeguard sensitive venture materials, free investors are allotted 1 pitch deck unlock per week. Additional data room access within the same cycle requires a 1-credit asset fallback payment. Paid tier subscriptions bypass this cap entirely for deep pipeline vetting.",
      includedWithPlan: true,
      roles: ["investor"],
      href: "/data-room",
    },
    {
      action: "Startup financial snapshot",
      cost: 1,
      note: "1 free/wk · then 1 cr fallback · unlimited with plan",
      reason: "Gated access to self-reported startup operational matrices including runway lengths, revenue estimations, and burn rates. Free tier structures permit 1 view per week, charging a 1-credit fallback fee per snapshot thereafter. Free and unrestricted on paid plans.",
      includedWithPlan: true,
      roles: ["investor"],
      href: "/data-room",
    },
    {
      action: "Request intro to startup founder",
      cost: 3,
      note: "Weekly limit · then 3 cr fallback · unlimited with plan",
      reason: "Triggers a managed pipeline handshake that establishes an active board tracking node and signals serious investor thesis commitment. Exceeding your weekly free limit incurs a 3-credit High-Value Outreach Fallback fee.",
      includedWithPlan: true,
      roles: ["investor"],
      href: "/matches",
    },
    // ── Ecosystem Partner ─────────────────────────────────────────────────────
    {
      action: "Unlock Blurred Program Match",
      cost: 3,
      note: "3 cr per match · applies on all tiers",
      reason: "Ecosystem partner free tracking views provide up to 5 unblurred startup alignment matches. Results populated above this numerical visibility boundary are locked and require 3 credits to permanently reveal.",
      includedWithPlan: false,
      roles: ["ecosystem_partner"],
      href: "/matches",
    },
    {
      action: "Bulk AI Match Sweep ('Create Matches')",
      cost: 8,
      note: "8 cr per sweep · applies on all tiers",
      reason: "Triggers a heavy database-wide background AI computation worker that processes all existing platform records against your thesis parameters, building a ranked ecosystem shortlist. Runs asynchronously via background pipelines and costs a flat 8-credit fee per execution on all tiers for Ecosystem Partners.",
      includedWithPlan: false,
      roles: ["ecosystem_partner"],
      href: "/matches",
    },
    {
      action: "Publish Feed Announcement",
      cost: 1,
      note: "1 free/wk · paid subscribers have unlimited posts",
      reason: "Broadcast calls, incubator entries, or updates onto the centralized global /announcements board. Free partners receive 1 post allowance per week (resets Mondays, non-stacking). Paid subscribers post announcements limitlessly.",
      includedWithPlan: true,
      roles: ["ecosystem_partner"],
      href: "/announcements",
    },
    {
      action: "Feature Announcement in Partner Digest",
      cost: 1,
      note: "1 cr per spotlight · applies on all tiers",
      reason: "Highlights your program or opportunity announcement inside our network-wide premium newsletter digest. This premium transactional real estate boost always costs 1 credit across all subscription tiers.",
      includedWithPlan: false,
      roles: ["ecosystem_partner"],
      href: "/announcements",
    },
  ];

const PAYMENT_INFO = [
  "Prices shown in USD · charged in PHP at a fixed rate of ₱56 per $1",
  "All payments processed securely via PayMongo",
  "Accepted: GCash · Maya · GrabPay · Visa/Mastercard",
  "Credits added to your account immediately after payment",
  "Subscriptions renew automatically unless cancelled",
  "Refunds available within 30 days for unused credits",
];

export default function PaymentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, memberRole } = useAuth();

  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [confirmPack, setConfirmPack] = useState<CreditPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openCreditItem, setOpenCreditItem] = useState<string | null>(null);
  const [creditRoleFilter, setCreditRoleFilter] = useState<CreditRole>("startup");
  const [creditHistory, setCreditHistory] = useState<{ id: string; change_amount: number; reason: string | null; created_at: string }[]>([]);
  const [planModal, setPlanModal] = useState<typeof DURATION_PLANS[0] | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>("bundle-100");

  const [showRequestCredits, setShowRequestCredits] = useState(false);
  const [requestCreditsAmount, setRequestCreditsAmount] = useState<number | "">("");
  const [requestCreditsReason, setRequestCreditsReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (memberRole === "investor" || memberRole === "startup" || memberRole === "ecosystem_partner") {
      setCreditRoleFilter(memberRole);
    }
    
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("request") === "true") {
        setShowRequestCredits(true);
      }
    }
  }, [memberRole]);

  const fetchCredits = useMemo(
    () => async (uid: string) => {
      const { data: rows } = await supabase
        .from("ad_credit_ledger")
        .select("change_amount, created_at, expires_at")
        .eq("member_id", uid);
      
      const { calculateCurrentBalance } = await import("@/lib/credits-util");
      return calculateCurrentBalance(rows ?? []);
    },
    [supabase],
  );

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single(),
      fetchCredits(user.id),
      supabase
        .from("ad_credit_ledger")
        .select("id, change_amount, reason, created_at")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([{ data }, total, { data: history }]) => {
      setSubscriptionPlan(data?.subscription_plan ?? null);
      setCredits(total);
      setCreditHistory(
        (history ?? []).map((r) => ({
          id: r.id as string,
          change_amount: Number(r.change_amount ?? 0),
          reason: r.reason as string | null,
          created_at: r.created_at as string,
        })),
      );
      setLoadingProfile(false);
    });
  }, [user, supabase, fetchCredits]);

  const hasActivePlan = !!subscriptionPlan && subscriptionPlan !== "free";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleRequestCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestCreditsReason) return;
    setSubmittingRequest(true);
    setRequestError("");
    try {
      const res = await fetch("/api/user/credit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, reason: requestCreditsReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request.");
      
      showToast("Credit request submitted successfully! It will be reviewed by an admin.");
      setShowRequestCredits(false);
      setRequestCreditsAmount("");
      setRequestCreditsReason("");
    } catch (err: any) {
      setRequestError(err.message);
    }
    setSubmittingRequest(false);
  };

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlanId(planId);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", id: planId }),
      });
      const json = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.checkoutUrl;
    } catch (err) {
      showToast((err as Error).message ?? "Something went wrong. Please try again.");
      setUpgradingPlanId(null);
    }
  };

  const handleBuyPack = (packId: string) => {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packId);
    if (pkg) setConfirmPack(pkg);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmPack) return;
    setPurchasing(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credits", id: confirmPack.id }),
      });
      const json = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.checkoutUrl;
    } catch (err) {
      showToast((err as Error).message ?? "Something went wrong. Please try again.");
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A0B2E]">

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[12px] bg-[#1A0B2E] border border-[#C9A040]/40 text-white text-sm font-semibold shadow-xl whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ── Confirm purchase modal ── */}
      {confirmPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-[20px] bg-[#2D0A28] border border-[#C9A040]/25 p-7 flex flex-col gap-5">
            <div>
              <span className="fa-eyebrow text-[#C9A040]">CONFIRM PURCHASE</span>
              <p className="font-display text-[1.3rem] text-white mt-1">{confirmPack.name}</p>
              <p className="text-white/50 text-sm mt-1">
                {confirmPack.credits} credits · ${confirmPack.price}
              </p>
            </div>
            <p className="text-white/40 text-[0.78rem] leading-relaxed">
              You&apos;ll be redirected to PayMongo to complete payment. Credits are added to your account automatically once the transaction clears.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmPack(null)}
                disabled={purchasing}
                className="flex-1 py-2.5 rounded-[10px] border border-white/15 bg-transparent text-white/60 text-sm font-semibold cursor-pointer hover:border-white/30 hover:text-white/80 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmPurchase()}
                disabled={purchasing}
                className="flex-1 py-2.5 rounded-[10px] fa-gradient-primary text-white text-sm font-bold border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {purchasing ? "Redirecting…" : "Pay with PayMongo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Credits Modal ── */}
      {showRequestCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-[#1A0B2E] border border-white/10 p-7 shadow-2xl relative">
            <h3 className="font-display text-xl text-white">Request Custom Top-up</h3>
            <p className="mt-2 text-sm text-white/50 mb-1 leading-relaxed">
              Submit a request to the network administrators for additional credits.
            </p>
            <p className="text-xs text-[#FF6B1F] font-semibold mb-6">
              100 credits fixed request subject to approval
            </p>
            <form onSubmit={handleRequestCredits} className="flex flex-col gap-4">
              <div className="rounded-[12px] bg-white/[0.03] border border-white/10 px-4 py-3 mb-2 flex items-center justify-between">
                <span className="text-white font-medium">100 Credits</span>
                <span className="fa-eyebrow text-[0.6rem] bg-[#FF6B1F]/15 text-[#FF6B1F] rounded-full px-2 py-0.5">FIXED AMOUNT</span>
              </div>
              <div>
                <label className="block fa-eyebrow text-[0.65rem] text-white/50 mb-1.5">REASON / RATIONALE</label>
                <input
                  type="text"
                  placeholder="Why do you need these credits?"
                  value={requestCreditsReason}
                  onChange={(e) => setRequestCreditsReason(e.target.value)}
                  className="w-full rounded-[12px] bg-white/[0.03] border border-white/10 px-4 py-3 text-white placeholder-white/20 focus:border-[#FF6B1F] focus:outline-none transition-colors"
                  required
                />
              </div>
              {requestError && (
                <div className="rounded-[10px] bg-red-500/10 px-3 py-2 text-xs text-red-400 border border-red-500/20">
                  {requestError}
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowRequestCredits(false); setRequestError(""); }}
                  disabled={submittingRequest}
                  className="flex-1 rounded-[12px] bg-white/5 py-3 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 rounded-[12px] fa-gradient-primary py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submittingRequest ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Plan Modal ── */}
      {planModal && (() => {
        const planRole: "startup" | "investor" | "ecosystem_partner" =
          memberRole === "investor" || memberRole === "ecosystem_partner" ? memberRole : "startup";
        const isCurrent = subscriptionPlan === planModal.id;
        const roleActions = CREDIT_COSTS.filter((c) => c.roles.includes(planRole));
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            onClick={() => setPlanModal(null)}
          >
            <div
              className="w-full max-w-lg rounded-[24px] bg-[#1A0B2E] border border-[#C9A040]/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-[#2D0A28] to-[#1A0B2E] px-7 pt-7 pb-5 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="fa-eyebrow text-[0.65rem]">{planModal.label.toUpperCase()} PLAN</span>
                      {planModal.savings && (
                        <span className="fa-eyebrow bg-emerald-500/15 text-emerald-400 rounded-full px-2.5 py-0.5 text-[0.58rem]">
                          {planModal.savings}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-end gap-1.5">
                      <p className="font-display text-[2rem] text-white leading-none">${planModal.perMonth}</p>
                      <p className="text-white/40 text-[0.7rem] font-mono mb-1">/mo</p>
                    </div>
                    <p className="text-white/35 text-[0.68rem] font-mono mt-0.5">
                      ${planModal.upfront} billed {planModal.months === 12 ? "annually" : "bi-annually"}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                      <span className="font-bold text-[0.78rem] text-emerald-400">All features</span>
                      <span className="text-[0.65rem] font-mono text-white/35">free with subscription</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlanModal(null)}
                    aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:bg-white/[0.12] hover:text-white/70 transition-colors mt-0.5"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-3 text-[0.78rem] text-white/50 leading-relaxed">
                  {planModal.tagline[planRole]}
                </p>
              </div>

              <div className="overflow-y-auto px-7 py-6 flex flex-col gap-6">
                {/* Features */}
                <div>
                  <span className="fa-eyebrow text-[0.6rem]">WHAT&apos;S INCLUDED</span>
                  <ul className="mt-3 flex flex-col gap-2 list-none p-0">
                    {planModal.features[planRole].map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-white/75">
                        <span className="text-[#C9A040] shrink-0">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Credit usage breakdown — free-tier reference */}
                {roleActions.length > 0 && (
                  <div>
                    <span className="fa-eyebrow text-[0.6rem]">WHAT CREDITS BUY (FREE TIER)</span>
                    <p className="text-white/30 text-[0.68rem] font-mono mt-1 mb-3">1 credit per action · $99 add-on = 100 credits</p>
                    <div className="flex flex-col gap-1.5">
                      {roleActions.map((c) => (
                        <div key={c.action} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/60 truncate">{c.action}</span>
                          {c.includedWithPlan ? (
                            <span className="shrink-0 text-emerald-400 font-mono text-[0.72rem]">free with plan</span>
                          ) : (
                            <span className="shrink-0 text-white/40 font-mono text-[0.72rem]">
                              {c.cost === 0 ? "Free" : `${c.cost} cr ea`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {isCurrent ? (
                  <div className="py-3 rounded-[12px] bg-[#FF6B1F]/10 text-center text-sm font-bold text-[#FF6B1F]">
                    Current plan
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3 rounded-[12px] fa-gradient-primary text-white text-sm font-bold border-none cursor-not-allowed opacity-40 transition-opacity"
                  >
                    Coming soon
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Page header ── */}
      <section className="fa-gradient-hero border-b border-[#C9A040]/15 px-4 sm:px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="fa-eyebrow text-[#C9A040] no-underline hover:text-[#FFA04F] transition-colors">
            ← BACK TO DASHBOARD
          </Link>
          <div className="mt-6">
            <span className="fa-eyebrow">BILLING &amp; CREDITS</span>
            <h1 className="font-display mt-2 text-[clamp(1.7rem,3.5vw,2.6rem)] leading-[1.1] text-white">
              Stop Guessing What You Can Afford.{" "}
              <span className="text-[#FF6B1F]">Every Match Has a Plan Built for It.</span>
            </h1>
            <p className="mt-3 text-base leading-relaxed text-white/60">
              Start free. Scale when you&apos;re ready. Credits never expire.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 flex flex-col gap-16">

        {/* ── Credit balance ── */}
        <section>
          <span className="fa-eyebrow">YOUR BALANCE</span>
          <div className="mt-4 rounded-[20px] bg-[#2D0A28] border border-[#C9A040]/20 p-7 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-8">
                <div>
                  <div className="font-display text-[3.5rem] leading-none text-[#FF6B1F]">
                    {loadingProfile ? "—" : (credits ?? 0)}
                  </div>
                  <span className="fa-eyebrow mt-1 block">CREDITS REMAINING</span>
                </div>
                <div className="hidden sm:block w-px h-14 bg-white/[0.08]" />
                <div>
                  <p className="font-semibold text-white/85 text-[0.95rem]">
                    {hasActivePlan ? "Premium" : "Free"} Plan
                  </p>
                  <p className="text-white/40 text-[0.8rem] mt-0.5">
                    {hasActivePlan ? "Active subscription" : "10 welcome credits included"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="flex flex-col gap-1 items-start">
                  <button
                    type="button"
                    disabled
                    className="fa-gradient-primary rounded-[10px] px-5 py-2.5 text-sm font-bold text-white border-none cursor-not-allowed opacity-50"
                  >
                    Top up (Coming Soon)
                  </button>
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <button
                    type="button"
                    onClick={() => setShowRequestCredits(true)}
                    className="rounded-[10px] px-5 py-2.5 text-sm font-bold bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    Request custom top-up
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white/65 border border-white/15 bg-transparent cursor-pointer hover:border-white/35 hover:text-white/85 transition-all"
                >
                  View plans
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Subscription plans ── */}
        <section id="plans" className="-mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="mb-8">
            <span className="fa-eyebrow">SUBSCRIPTION PLANS</span>
            <h2 className="font-display mt-1 text-[1.6rem] text-white">Commit Longer. Save More.</h2>
            <p className="text-white/50 text-sm mt-1">All platform features from day one. Intros and premium actions use credits — purchased separately as $99 add-on bundles.</p>
          </div>

          {/* ── 3 plan cards (free + 2 paid) ── */}
          {/*
            On lg (3-col desktop) this grid defines 6 explicit row tracks shared across
            all 3 columns. Each card spans all 6 tracks via grid-row:span-6 and uses
            grid-template-rows:subgrid to align its children to those tracks, so every
            section (badges, price, billing, credits, spacer, CTA) sits at exactly the
            same baseline across all three cards.
          */}
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-0 lg:[grid-template-rows:auto_auto_auto_auto_1fr_auto]">

            {/* ── Free plan card ── */}
            <div className={[
              "rounded-[20px] relative transition-all duration-150",
              "flex flex-col p-5",
              "lg:p-0 lg:grid lg:[grid-row:span_6] lg:[grid-template-rows:subgrid]",
              "bg-[#2D0A28]",
              !hasActivePlan
                ? "ring-[1.5px] ring-[#FF6B1F]"
                : "border border-white/[0.08]",
            ].join(" ")}>
              {/* Track 1 — Status badges */}
              <div className="flex items-center gap-1.5 min-h-[1.25rem] mb-4 lg:mb-0 lg:px-5 lg:pt-6">
                {!hasActivePlan && (
                  <span className="fa-eyebrow bg-[#FF6B1F]/15 text-[#FF6B1F] rounded-full px-2.5 py-0.5 text-[0.58rem]">CURRENT</span>
                )}
              </div>

              {/* Track 2 — Label + Price */}
              <div className="lg:px-5 lg:pt-4">
                <span className="fa-eyebrow text-[0.6rem] text-white/35">FREE</span>
                <div className="mt-0.5 flex items-end gap-1 leading-none">
                  <p className="font-display text-[2.6rem] text-white leading-none">$0</p>
                  <p className="text-[0.63rem] font-mono mb-1.5 text-white/25">/mo</p>
                </div>
              </div>

              {/* Track 3 — Billing note */}
              <p className="text-[0.62rem] font-mono mt-0.5 lg:mt-0 lg:pt-1 lg:px-5 text-white/22">
                for casual exploration
              </p>

              {/* Track 4 — Credits */}
              <div className="mt-5 lg:mt-0 lg:px-5 lg:pt-5">
                <div className="rounded-[12px] px-4 py-3 bg-[#FF6B1F]/[0.08] border border-[#FF6B1F]/[0.12]">
                  <p className="font-display text-[1.9rem] leading-none text-[#FF6B1F]">10</p>
                  <p className="text-[0.58rem] font-mono mt-0.5 tracking-wide text-white/30">WELCOME CREDITS INCLUDED</p>
                </div>
              </div>

              {/* Track 5 — Spacer */}
              <div className="flex-1 min-h-[1.5rem]" />

              {/* Track 6 — CTA */}
              <div className="lg:px-5 lg:pb-6">
                <div className="mt-4 lg:mt-0 text-center py-2.5 rounded-[10px] text-sm font-bold border border-white/10 text-white/30">
                  {!hasActivePlan ? "Current plan" : "Free forever"}
                </div>
              </div>
            </div>

            {/* ── Duration plan cards ── */}
            {DURATION_PLANS.map((plan) => {
              const isCurrent = subscriptionPlan === plan.id;
              const isFeatured = plan.featured;
              return (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPlanModal(plan)}
                  onKeyDown={(e) => e.key === "Enter" && setPlanModal(plan)}
                  className={[
                    "group rounded-[20px] relative cursor-pointer transition-all duration-150",
                    "flex flex-col p-5",
                    "lg:p-0 lg:grid lg:[grid-row:span_6] lg:[grid-template-rows:subgrid]",
                    "bg-[#2D0A28] hover:bg-[#341030]",
                    isFeatured
                      ? "ring-2 ring-[#FF6B1F] shadow-[0_0_22px_rgba(255,107,31,0.22)] hover:shadow-[0_0_30px_rgba(255,107,31,0.32)]"
                      : isCurrent
                        ? "ring-[1.5px] ring-[#FF6B1F]"
                        : "border border-white/[0.08] hover:border-white/[0.18]",
                  ].join(" ")}
                >
                  {/* Expand affordance — appears on hover */}
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
                    className="absolute top-4 right-4 w-3.5 h-3.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="21" y1="3" x2="10" y2="14" />
                  </svg>

                  {/* Track 1 — Status badges */}
                  <div className="flex items-center gap-1.5 min-h-[1.25rem] mb-4 lg:mb-0 lg:px-5 lg:pt-6">
                    {isFeatured ? (
                      <span className="fa-eyebrow bg-[#FF6B1F] !text-[#1A0B2E] rounded-full px-2.5 py-0.5 text-[0.58rem]">BEST VALUE</span>
                    ) : plan.savings ? (
                      <span className="fa-eyebrow bg-emerald-500/15 text-emerald-400 rounded-full px-2.5 py-0.5 text-[0.58rem]">{plan.savings}</span>
                    ) : null}
                    {isCurrent && (
                      <span className="fa-eyebrow bg-[#FF6B1F]/15 text-[#FF6B1F] rounded-full px-2.5 py-0.5 text-[0.58rem]">
                        CURRENT
                      </span>
                    )}
                  </div>

                  {/* Track 2 — Duration label + Price (grouped so they move as one unit) */}
                  <div className="lg:px-5 lg:pt-4">
                    <span className="fa-eyebrow text-[0.6rem] text-white/35">
                      {plan.label.toUpperCase()}
                    </span>
                    <div className="mt-0.5 flex items-end gap-1 leading-none">
                      <p className="font-display text-[2.6rem] text-white leading-none">${plan.perMonth}</p>
                      <p className="text-[0.63rem] font-mono mb-1.5 text-white/25">/mo</p>
                    </div>
                  </div>

                  {/* Track 3 — Billing note */}
                  <p className="text-[0.62rem] font-mono mt-0.5 lg:mt-0 lg:pt-1 lg:px-5 text-white/22">
                    {`$${plan.upfront} billed ${plan.months === 12 ? "annually" : "bi-annually"}`}
                  </p>

                  {/* Track 4 — Free access highlight */}
                  <div className="mt-5 lg:mt-0 lg:px-5 lg:pt-5">
                    <div className="rounded-[12px] px-4 py-3 bg-[#FF6B1F]/[0.08] border border-[#FF6B1F]/[0.12]">
                      <p className="font-display text-[1.9rem] leading-none text-[#FF6B1F]">ALL</p>
                      <p className="text-[0.58rem] font-mono mt-0.5 tracking-wide text-white/30">
                        FEATURES INCLUDED FREE
                      </p>
                    </div>
                  </div>

                  {/* Track 5 — Spacer */}
                  <div className="flex-1 min-h-[1.5rem]" />

                  {/* Track 6 — CTA */}
                  <div className="lg:px-5 lg:pb-6">
                    {isCurrent ? (
                      <div className="mt-4 lg:mt-0 text-center py-2.5 rounded-[10px] text-sm font-bold bg-[#FF6B1F]/10 text-[#FF6B1F]">
                        Current plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="mt-4 lg:mt-0 w-full py-2.5 rounded-[10px] text-sm font-bold text-white border-none cursor-not-allowed opacity-40 fa-gradient-primary"
                      >
                        Coming soon
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Credit add-on ── */}
        <section id="credit-packs">
          <span className="fa-eyebrow">PREMIUM ADD-ON</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-6">
            Credits for Intros &amp; Outreach.
          </h2>
          <div className="rounded-[20px] bg-[#2D0A28] border border-[#C9A040]/20 p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-8">
            {/* Left — pricing */}
            <div className="shrink-0 flex flex-col gap-3 min-w-[200px]">
              <span className="fa-eyebrow text-[0.6rem] text-white/35">SELECT BUNDLE</span>
              <div className="flex flex-col gap-2 mt-1">
                {CREDIT_PACKAGES.map((pkg) => (
                  <label
                    key={pkg.id}
                    className={[
                      "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                      selectedPackId === pkg.id
                        ? "bg-[#FF6B1F]/10 border-[#FF6B1F]"
                        : "bg-white/[0.02] border-white/10 hover:border-white/30"
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={[
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        selectedPackId === pkg.id ? "border-[#FF6B1F]" : "border-white/30"
                      ].join(" ")}>
                        {selectedPackId === pkg.id && <div className="w-2 h-2 rounded-full bg-[#FF6B1F]" />}
                      </div>
                      <div>
                        <p className={["font-display leading-none text-lg", selectedPackId === pkg.id ? "text-[#FF6B1F]" : "text-white"].join(" ")}>{pkg.credits}</p>
                        <p className="fa-eyebrow text-[0.55rem] mt-0.5">CREDITS</p>
                      </div>
                    </div>
                    <p className="font-semibold text-white/90">${pkg.price}</p>
                    <input
                      type="radio"
                      name="credit-bundle"
                      value={pkg.id}
                      checked={selectedPackId === pkg.id}
                      onChange={() => setSelectedPackId(pkg.id)}
                      className="sr-only"
                    />
                  </label>
                ))}
              </div>
              <p className="text-white/30 text-[0.68rem] font-mono mt-1 text-center">one-time purchase · never expires</p>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px self-stretch bg-white/[0.07]" />
            <div className="sm:hidden h-px w-full bg-white/[0.07]" />

            {/* Right — what it covers */}
            <div className="flex-1 flex flex-col gap-4">
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {[
                  "Unlock additional blurred investor, founder, or partner matches (3 cr each)",
                  "Bypass exhausted weekly view allowances with on-demand fallback unlocks (1 cr each)",
                  "Request warm intros to matched parameters and send community requests",
                  "Run comprehensive database-wide background AI matching sweeps via the Create Matches engine",
                  "Retake your full Venture Readiness Assessment on confidence.exoasia.org",
                  "Credits never expire and work across both Free and Paid subscription tiers",
                ].map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-white/65">
                    <span className="text-[#C9A040] shrink-0 mt-px">✓</span> {line}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleBuyPack(selectedPackId)}
                className="self-start px-6 py-2.5 rounded-[10px] text-sm font-bold text-white fa-gradient-primary border-none cursor-pointer hover:opacity-90 transition-opacity"
              >
                Buy {CREDIT_PACKAGES.find(p => p.id === selectedPackId)?.credits} Credits
              </button>
            </div>
          </div>
        </section>

        {/* ── Credit economy ── */}
        <section>
          <span className="fa-eyebrow">CREDIT ECONOMY</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-4">What Credits Buy</h2>

          {/* Role filter tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(
              [
                { value: "startup" as CreditRole, label: "Startup" },
                { value: "investor" as CreditRole, label: "Investor" },
                { value: "ecosystem_partner" as CreditRole, label: "Ecosystem Partner" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCreditRoleFilter(value);
                  setOpenCreditItem(null);
                }}
                className={[
                  "px-4 py-1.5 rounded-full text-[0.78rem] font-semibold transition-colors border",
                  creditRoleFilter === value
                    ? "bg-[#FF6B1F] border-[#FF6B1F] text-white"
                    : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-[16px] overflow-hidden border border-white/[0.07]">
            {CREDIT_COSTS.filter((item) => item.roles.includes(creditRoleFilter)).map((item, i, arr) => {
              const isOpen = openCreditItem === item.action;
              return (
                <div
                  key={item.action}
                  className={[
                    i < arr.length - 1 ? "border-b border-white/[0.05]" : "",
                    i % 2 === 0 ? "bg-[#2D0A28]" : "bg-[#1A0B2E]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => setOpenCreditItem(isOpen ? null : item.action)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 font-semibold text-sm">{item.action}</p>
                      <p className="text-white/30 text-[0.7rem] font-mono mt-0.5">{item.note}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="fa-eyebrow bg-[#FF6B1F]/12 text-[#FF6B1F] rounded-full px-3 py-1 text-[0.78rem]">
                        {item.cost} cr
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={["text-white/30 transition-transform duration-200", isOpen ? "rotate-180" : ""].join(" ")}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-0">
                      <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-3">
                        <p className="text-white/50 text-[0.8rem] leading-relaxed">
                          {item.reason}
                        </p>
                        {memberRole && item.roles.includes(memberRole as CreditRole) && (
                          <Link
                            href={item.href}
                            className="self-start inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B1F]/12 border border-[#FF6B1F]/20 px-3 py-1.5 text-[0.75rem] font-semibold text-[#FF6B1F] hover:bg-[#FF6B1F]/20 transition-colors"
                          >
                            Go to action
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Credit history ── */}
        <section>
          <span className="fa-eyebrow">TRANSACTION LOG</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-6">Credit History</h2>
          {loadingProfile ? (
            <div className="rounded-[16px] border border-white/[0.07] bg-[#2D0A28] px-5 py-8 text-center text-white/30 text-sm">
              Loading…
            </div>
          ) : creditHistory.length === 0 ? (
            <div className="rounded-[16px] border border-white/[0.07] bg-[#2D0A28] px-5 py-8 text-center text-white/30 text-sm">
              No transactions yet
            </div>
          ) : (
            <>
              <div className="rounded-[16px] overflow-hidden border border-white/[0.07]">
                {(showAllHistory ? creditHistory : creditHistory.slice(0, 5)).map((tx, i, arr) => (
                  <div
                    key={tx.id}
                    className={[
                      "flex items-center gap-4 px-5 py-4",
                      i < arr.length - 1 ? "border-b border-white/[0.05]" : "",
                      i % 2 === 0 ? "bg-[#2D0A28]" : "bg-[#1A0B2E]",
                    ].join(" ")}
                  >
                    <div className={[
                      "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
                      tx.change_amount > 0 ? "bg-emerald-500/15" : "bg-[#FF6B1F]/12",
                    ].join(" ")}>
                      <span className={tx.change_amount > 0 ? "text-emerald-400 text-sm" : "text-[#FF6B1F] text-sm"}>
                        {tx.change_amount > 0 ? "↓" : "↑"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 font-semibold text-sm">{tx.reason ?? "Credit transaction"}</p>
                      <p className="text-white/30 text-[0.7rem] font-mono mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={[
                      "font-bold text-sm shrink-0",
                      tx.change_amount > 0 ? "text-emerald-400" : "text-[#FF6B1F]",
                    ].join(" ")}>
                      {tx.change_amount > 0 ? "+" : ""}{tx.change_amount} cr
                    </span>
                  </div>
                ))}
              </div>
              {creditHistory.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllHistory((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/[0.1] bg-white/[0.03] text-white/60 text-xs font-semibold hover:bg-white/[0.06] hover:text-white/90 transition-colors"
                  >
                    {showAllHistory ? "Show less" : `Show all ${creditHistory.length} transactions`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Payment info ── */}
        <div className="rounded-[16px] bg-[#2D0A28] border border-[#C9A040]/15 p-6 sm:p-7">
          <span className="fa-eyebrow">PAYMENT INFORMATION</span>
          <ul className="mt-4 flex flex-col gap-2.5 list-none p-0">
            {PAYMENT_INFO.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-white/50">
                <span className="text-[#C9A040] shrink-0">·</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Final CTA ── */}
      <section className="fa-gradient-cta px-4 py-16 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-[clamp(1.4rem,3vw,2rem)] leading-[1.15] text-white">
            The Right Investor Is Already Looking for You.
          </h2>
          <p className="text-white/80 mt-3 text-[0.95rem]">
            Start with 10 free credits. No card needed.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#1A0B2E] text-white font-bold text-[0.9rem] px-7 py-3 rounded-[10px] border-none cursor-pointer hover:bg-[#2D0A28] transition-colors"
            >
              View all plans
            </button>
            <Link
              href="/dashboard"
              className="text-white/80 font-semibold text-[0.9rem] hover:text-white transition-colors"
            >
              Back to dashboard →
            </Link>
          </div>
          <span className="fa-eyebrow mt-10 block text-white/60 text-[0.65rem]">
            NOT BY CHANCE. BY DESIGN.
          </span>
        </div>
      </section>
    </div>
  );
}
