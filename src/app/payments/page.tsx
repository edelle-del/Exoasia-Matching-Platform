"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_PACKAGES, DURATION_PLANS, type CreditPackage } from "@/types/constants";


type CreditRole = "startup" | "investor" | "ecosystem_partner";

const CREDIT_COSTS: {
  action: string;
  cost: number;
  note: string;
  reason: string;
  roles: CreditRole[];
  href: string;
}[] = [
  // ── Startup ──────────────────────────────────────────────────────────────
  {
    action: "Regenerate investor match report",
    cost: 3,
    note: "Per project · first match report is free",
    reason: "Your first investor match report is free. Regeneration costs 3 credits — for when you've updated your project details and want a fresh set of matches that reflects where your startup is now. The small credit cost prevents founders from regenerating repeatedly without making meaningful updates, which keeps the match data accurate and relevant for investors on the other side.",
    roles: ["startup"],
    href: "/matches",
  },
  {
    action: "View full investor profile + compatibility breakdown",
    cost: 0,
    note: "Free on any paid plan · 3 cr on free tier",
    reason: "On any paid subscription, investor profiles and compatibility breakdowns are fully unlocked at no credit cost — this is the core benefit of subscribing. On the free tier, each unlock costs 3 credits. Either way, the unlock is permanent: once you've accessed a profile, it stays open with no repeat charges.",
    roles: ["startup"],
    href: "/matches",
  },
  {
    action: "Request intro to investor",
    cost: 7,
    note: "Creates a deal card · investors pay 5 cr",
    reason: "When a startup requests an intro, the platform vouches for your profile, attaches your match score, and surfaces the request to an investor who has opted into deal flow — that warm context is what makes investors respond. Startups pay 7 credits (vs. 5 for investors) because you are the demand side: you're the one seeking access to capital. Investors are the scarce supply that makes the platform valuable, so slightly lower friction for them keeps deal flow healthy for everyone. The asymmetry isn't a penalty — it's how two-sided marketplaces stay balanced.",
    roles: ["startup"],
    href: "/matches",
  },
  {
    action: "Send cofounder invite (email)",
    cost: 1,
    note: "Free for existing platform users",
    reason: "Inviting someone already on the platform is free — no credit needed. The 1-credit cost applies only to external email invites, which trigger a server-side outreach email and onboarding flow. The nominal cost prevents invite abuse (mass-spamming non-users) while keeping team-building accessible for founders who genuinely need to bring in co-founders.",
    roles: ["startup"],
    href: "/requests",
  },
  {
    action: "Unlock full community profile",
    cost: 2,
    note: "Bio, asks & offers, experience, financials",
    reason: "Community member cards show name, role, location, and sector for free — enough to decide if someone is worth a closer look. The 2-credit unlock opens the full profile: bio, what they're asking for, what they're offering, team size, revenue, and contact details. The cost prevents bulk-scraping of member data while keeping meaningful discovery accessible.",
    roles: ["startup", "investor"],
    href: "/community",
  },
  {
    action: "Request community introduction",
    cost: 2,
    note: "Sends a connection request to any member",
    reason: "A community intro request creates a two-sided connection — both parties are notified and either can accept. The 2-credit cost ensures members only reach out when there's genuine intent, keeping inboxes signal-rich. It's intentionally low enough not to block networking, but high enough to prevent blanket connection spam that degrades everyone's experience.",
    roles: ["startup", "investor", "ecosystem_partner"],
    href: "/community",
  },
  // ── Investor ─────────────────────────────────────────────────────────────
  {
    action: "View full startup pitch deck",
    cost: 3,
    note: "Unlocks attached documents per startup",
    reason: "Pitch decks are the most sensitive assets a startup uploads. The 3-credit unlock gates casual browsing and signals serious investor intent — startups see who accessed their deck, creating accountability on both sides. Pricing is intentionally low enough not to block due diligence, but high enough to filter out non-serious views.",
    roles: ["investor"],
    href: "/data-room",
  },
  {
    action: "Request intro to startup founder",
    cost: 5,
    note: "Creates a deal card · startups pay 7 cr",
    reason: "When an investor initiates contact, it triggers a managed warm intro flow — the startup is notified, a deal card is opened, and both parties are placed in a structured pipeline. Investors pay 5 credits (vs. 7 for startups) because investors are the supply side — the capital and credibility that makes the platform worth joining. Slightly lower friction keeps deal flow active and ensures founders see quality inbound, not silence. The gap isn't a discount for the wealthy — it's a deliberate design choice to keep the marketplace liquid on both sides.",
    roles: ["investor"],
    href: "/matches",
  },
  {
    action: "Unlock startup financial snapshot",
    cost: 5,
    note: "Revenue, burn rate, runway data",
    reason: "Financial snapshots include self-reported revenue estimates, burn rate, and runway — data startups share only with serious potential investors. The 5-credit cost mirrors the seriousness of the ask, creating a natural filter so founders only share sensitive data with investors who have real intent.",
    roles: ["investor"],
    href: "/data-room",
  },
  {
    action: "Unlock startup–investor compatibility score",
    cost: 2,
    note: "Per startup–investor pair",
    reason: "The compatibility score breaks down thesis alignment, stage fit, sector overlap, and potential red flags for a specific startup–investor pairing. At 2 credits it's low enough to use regularly during deal sourcing, but ensures investors are evaluating fit deliberately rather than skimming every startup on the platform.",
    roles: ["investor"],
    href: "/matches",
  },
  {
    action: "Export deal pipeline report",
    cost: 8,
    note: "PDF summary of your tracked startups",
    reason: "The pipeline export compiles your tracked startups into a structured PDF with scores, notes, and status — useful for sharing with co-investors or internal investment committees. The 8-credit cost reflects the value of the aggregated, curated output and discourages exporting as a substitute for actually reviewing deals.",
    roles: ["investor"],
    href: "/deal-board",
  },
  // ── Ecosystem Partner ─────────────────────────────────────────────────────
  {
    action: "Post opportunity or program call",
    cost: 5,
    note: "Broadcast to matched startups",
    reason: "Posting an accelerator call, grant opportunity, or program opening broadcasts to a curated list of startups that match your criteria. The 5-credit cost prevents spam postings and ensures partners only publish opportunities they intend to actively manage — protecting startups from wasted applications.",
    roles: ["ecosystem_partner"],
    href: "/events",
  },
  {
    action: "Feature startup in partner digest",
    cost: 10,
    note: "Highlights startup to your network",
    reason: "Featuring a startup amplifies their visibility across your partner network and newsletter, which can surface them to investors and other partners outside the platform. The 10-credit cost ensures this spotlight is used for startups that genuinely deserve the exposure, not as a default action for every startup in a cohort.",
    roles: ["ecosystem_partner"],
    href: "/ecosystem",
  },
  {
    action: "Access cohort analytics dashboard",
    cost: 8,
    note: "Aggregated data across tracked startups",
    reason: "The cohort analytics view shows aggregated readiness scores, funding stage distributions, and sector breakdowns across all startups you're tracking — useful for program reporting and portfolio health checks. The 8-credit cost is set per report generation, not per startup, reflecting the computational cost of aggregating live data.",
    roles: ["ecosystem_partner"],
    href: "/ecosystem",
  },
  {
    action: "Bulk AI match startups to program",
    cost: 15,
    note: "AI scores your pipeline against program criteria",
    reason: "This runs an AI matching pass across your entire tracked pipeline, scoring each startup against your program's specific criteria (stage, sector, geography, team size). At 15 credits it's the most expensive partner action because it's the most computationally intensive — and the output is a ranked shortlist that directly informs cohort selection.",
    roles: ["ecosystem_partner"],
    href: "/matches",
  },
  {
    action: "Send partnership invite (email)",
    cost: 1,
    note: "Free for existing platform users",
    reason: "Inviting a startup or investor already on the platform is free. The 1-credit cost applies only to external email invites, covering the server-side outreach and onboarding flow. The nominal cost prevents bulk-invite abuse while keeping ecosystem-building accessible for partners actively growing their network.",
    roles: ["ecosystem_partner"],
    href: "/requests",
  },
];

const FREE_FEATURES = [
  "10 welcome credits",
  "1 project slot",
  "Top 3 matches visible",
  "Basic profile",
  "Invitation to Networking Events",
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

  useEffect(() => {
    if (memberRole === "investor" || memberRole === "startup" || memberRole === "ecosystem_partner") {
      setCreditRoleFilter(memberRole);
    }
  }, [memberRole]);

  const fetchCredits = useMemo(
    () => async (uid: string) => {
      const { data: rows } = await supabase
        .from("ad_credit_ledger")
        .select("change_amount")
        .eq("member_id", uid);
      return (rows ?? []).reduce((sum, r) => sum + Number(r.change_amount ?? 0), 0);
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

      {/* ── Plan detail modal ── */}
      {planModal && (() => {
        const planRole: "startup" | "investor" | "ecosystem_partner" =
          memberRole === "investor" || memberRole === "ecosystem_partner" ? memberRole : "startup";
        const isCurrent = subscriptionPlan === planModal.id;
        const roleActions = CREDIT_COSTS.filter((c) => c.roles.includes(planRole));
        const freeActions = roleActions.filter((c) => c.cost === 0);
        const paidActions = roleActions.filter((c) => c.cost > 0);
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
                    {planModal.months > 1 && (
                      <p className="text-white/35 text-[0.68rem] font-mono mt-0.5">
                        ${planModal.upfront} billed upfront · {planModal.months} mo
                      </p>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#FF6B1F]/10 px-2.5 py-1">
                      <span className="font-bold text-[0.78rem] text-[#FF6B1F]">{planModal.credits} cr</span>
                      <span className="text-[0.65rem] font-mono text-white/35">delivered upfront</span>
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

                {/* Credit usage breakdown */}
                <div>
                  <span className="fa-eyebrow text-[0.6rem]">WHAT {planModal.credits} CREDITS BUYS YOU</span>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {freeActions.map((c) => (
                      <div key={c.action} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-white/60 truncate">{c.action}</span>
                        <span className="shrink-0 text-emerald-400 font-mono text-[0.72rem]">free</span>
                      </div>
                    ))}
                    {paidActions.map((c) => (
                      <div key={c.action} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-white/60 truncate">{c.action}</span>
                        <span className="shrink-0 text-white/40 font-mono text-[0.72rem]">
                          ~{Math.floor(planModal.credits / c.cost)}× <span className="text-white/25">({c.cost} cr ea)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

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
                <button
                  type="button"
                  onClick={() => document.getElementById("credit-packs")?.scrollIntoView({ behavior: "smooth" })}
                  className="fa-gradient-primary rounded-[10px] px-5 py-2.5 text-sm font-bold text-white border-none cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Top up credits
                </button>
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
            <p className="text-white/50 text-sm mt-1">All features from day one. Credits delivered upfront — use them at your pace.</p>
          </div>

          {/* ── Free tier — full-width banner ── */}
          <div className={[
            "rounded-[20px] bg-[#2D0A28] px-6 py-5 mb-4",
            !hasActivePlan ? "ring-[1.5px] ring-[#FF6B1F]" : "border border-white/[0.08]",
          ].join(" ")}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">

              {/* Price block */}
              <div className="shrink-0">
                {!hasActivePlan && (
                  <span className="fa-eyebrow bg-[#FF6B1F]/15 text-[#FF6B1F] rounded-full px-3 py-0.5 text-[0.6rem] mb-2 inline-block">
                    CURRENT
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="fa-eyebrow text-white/50 mr-1">FREE</span>
                  <p className="font-display text-[2.4rem] text-white leading-none">$0</p>
                </div>
                <p className="text-white/35 text-[0.7rem] font-mono mt-0.5">for casual exploration</p>
              </div>

              <div className="hidden sm:block w-px self-stretch bg-white/[0.07]" />

              {/* Features — horizontal wrap */}
              <ul className="flex flex-wrap gap-x-6 gap-y-2 flex-1 list-none p-0">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-sm text-white/55">
                    <span className="text-[#C9A040] text-xs shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="shrink-0">
                <div className="py-2 px-5 rounded-[10px] border border-white/10 text-white/30 text-sm font-semibold text-center whitespace-nowrap">
                  {!hasActivePlan ? "Current plan" : "Free forever"}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4 paid plan cards ── */}
          {/*
            On lg (4-col desktop) this grid defines 6 explicit row tracks shared across
            all 4 columns. Each card spans all 6 tracks via grid-row:span-6 and uses
            grid-template-rows:subgrid to align its children to those tracks, so every
            section (badges, price, billing, credits, spacer, CTA) sits at exactly the
            same baseline across all four cards.
          */}
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0 lg:[grid-template-rows:auto_auto_auto_auto_1fr_auto]">

            {/* ── Duration plan cards ── */}
            {DURATION_PLANS.map((plan) => {
              const isCurrent  = subscriptionPlan === plan.id;
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
                    {plan.months > 1 ? `$${plan.upfront} billed upfront` : "billed monthly"}
                  </p>

                  {/* Track 4 — Credits */}
                  <div className="mt-5 lg:mt-0 lg:px-5 lg:pt-5">
                    <div className="rounded-[12px] px-4 py-3 bg-[#FF6B1F]/[0.08] border border-[#FF6B1F]/[0.12]">
                      <p className="font-display text-[1.9rem] leading-none text-[#FF6B1F]">
                        {plan.credits}
                      </p>
                      <p className="text-[0.58rem] font-mono mt-0.5 tracking-wide text-white/30">
                        CREDITS · DELIVERED UPFRONT
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

        {/* ── Credit packs ── */}
        <section id="credit-packs">
          <span className="fa-eyebrow">TOP UP ANYTIME</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-6">
            Buy Credits. No Subscription Needed.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CREDIT_PACKAGES.map((pkg, i) => {
              const isBest = i === 1;
              return (
                <div
                  key={pkg.id}
                  className={[
                    "rounded-[20px] bg-[#2D0A28] p-6 flex flex-col relative",
                    isBest ? "ring-[1.5px] ring-[#C9A040]/50" : "border border-white/[0.08]",
                  ].join(" ")}
                >
                  {isBest && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 fa-eyebrow bg-[#C9A040]/15 text-[#C9A040] rounded-full px-3 py-1 border border-[#C9A040]/40 whitespace-nowrap text-[0.6rem]">
                      BEST VALUE
                    </span>
                  )}
                  <span className="fa-eyebrow">{pkg.name.toUpperCase()}</span>
                  <p className="font-display text-[2.4rem] leading-none text-[#FF6B1F] mt-2">
                    {pkg.credits}
                  </p>
                  <span className="fa-eyebrow text-[0.62rem]">CREDITS</span>
                  <p className="font-display text-[1.4rem] text-white mt-3">
                    ${pkg.price}
                  </p>
                  <p className="text-white/30 text-[0.7rem] font-mono mt-0.5">
                    ${(pkg.price / pkg.credits).toFixed(2)}/credit
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-5 w-full py-2.5 rounded-[10px] text-sm font-bold text-white border-none cursor-not-allowed opacity-40 border border-white/20 bg-transparent"
                  >
                    Coming soon
                  </button>
                </div>
              );
            })}
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
            <div className="rounded-[16px] overflow-hidden border border-white/[0.07]">
              {creditHistory.map((tx, i) => (
                <div
                  key={tx.id}
                  className={[
                    "flex items-center gap-4 px-5 py-4",
                    i < creditHistory.length - 1 ? "border-b border-white/[0.05]" : "",
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
