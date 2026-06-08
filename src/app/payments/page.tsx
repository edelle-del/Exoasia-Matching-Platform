"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from "@/types/constants";

const CREDIT_COSTS = [
  { action: "Generate investor match report",   cost: 5,  note: "Per project · regeneration costs 3 cr" },
  { action: "View full investor profile + bio",  cost: 2,  note: "Top 3 visible free on all tiers" },
  { action: "Request intro to investor",          cost: 10, note: "Creates a deal card" },
  { action: "AI venture readiness assessment",   cost: 15, note: "Full VR report" },
  { action: "Unlock compatibility breakdown",     cost: 3,  note: "Per investor–project pair" },
  { action: "Send cofounder invite (email)",      cost: 1,  note: "Free for existing platform users" },
];

const FREE_FEATURES = [
  "10 welcome credits",
  "1 project slot",
  "Top 3 matches visible",
  "Basic profile",
  "Invitation to Networking Events",
];

const PAID_FEATURES = [
  "Unlimited project slots",
  "All investor matches unlocked",
  "Priority advisor queue",
];

// Replace with real DB query when credit history table is ready
const MOCK_HISTORY = [
  { id: "h1", amount: 10,  description: "Welcome bonus — account created",  date: "2026-05-01" },
  { id: "h2", amount: -5,  description: "Investor match report generated",   date: "2026-05-03" },
  { id: "h3", amount: -2,  description: "Full investor profile unlocked",    date: "2026-05-05" },
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
  const { user } = useAuth();

  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("credits, subscription_plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCredits(data.credits ?? 0);
          setSubscriptionPlan(data.subscription_plan ?? null);
        }
        setLoadingProfile(false);
      });
  }, [user, supabase]);

  const annualFactor  = billing === "annual" ? 0.8 : 1;
  const currentPlanId = subscriptionPlan ?? "free";
  const currentPaid   = SUBSCRIPTION_PLANS.find((p) => p.id === currentPlanId);
  const usedCredits   = currentPaid ? currentPaid.credits - (credits ?? 0) : 0;
  const progressPct   = currentPaid ? Math.min(100, (usedCredits / currentPaid.credits) * 100) : 0;

  const handleUpgrade = (planId: string) => {
    // TODO: integrate PayMongo
    console.log("upgrade", planId);
  };

  const handleBuyPack = (packId: string) => {
    // TODO: integrate PayMongo
    console.log("buy-pack", packId);
  };

  return (
    <div className="min-h-screen bg-[#1A0B2E]">

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
                    {currentPaid ? currentPaid.name : "Free"} Plan
                  </p>
                  <p className="text-white/40 text-[0.8rem] mt-0.5">
                    {currentPaid ? `${currentPaid.credits} credits/month` : "10 welcome credits included"}
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

            {/* Progress bar — only on paid plans */}
            {currentPaid && (
              <div className="mt-6">
                <div className="flex justify-between fa-eyebrow text-white/35 mb-2">
                  <span>USED THIS CYCLE</span>
                  <span>{usedCredits} / {currentPaid.credits}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#4A1040] overflow-hidden">
                  {/* width is dynamic — only inline value needed, not a style object */}
                  <div
                    className="h-1.5 rounded-full fa-gradient-primary transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Subscription plans ── */}
        <section id="plans">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <span className="fa-eyebrow">SUBSCRIPTION PLANS</span>
              <h2 className="font-display mt-1 text-[1.6rem] text-white">Choose Your Plan</h2>
            </div>
            {/* Billing toggle */}
            <div className="flex bg-[#2D0A28] border border-[#C9A040]/20 rounded-full p-1">
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  className={[
                    "fa-eyebrow rounded-full px-4 py-[7px] border-none cursor-pointer transition-all text-[0.65rem]",
                    billing === b
                      ? "fa-gradient-primary text-white"
                      : "bg-transparent text-white/45 hover:text-white/70",
                  ].join(" ")}
                >
                  {b === "monthly" ? "MONTHLY" : "ANNUAL −20%"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Free tier card */}
            {(() => {
              const isCurrent = currentPlanId === "free";
              return (
                <div className={[
                  "rounded-[20px] bg-[#2D0A28] p-6 flex flex-col",
                  isCurrent ? "ring-[1.5px] ring-[#FF6B1F]" : "border border-white/[0.08]",
                ].join(" ")}>
                  {isCurrent && (
                    <span className="self-start fa-eyebrow bg-[#FF6B1F]/15 text-[#FF6B1F] rounded-full px-3 py-0.5 mb-3 text-[0.6rem]">
                      CURRENT
                    </span>
                  )}
                  <span className="fa-eyebrow">FREE</span>
                  <p className="font-display text-[2rem] text-white mt-1">$0</p>
                  <p className="text-white/35 text-[0.7rem] font-mono mt-0.5">forever</p>
                  <ul className="mt-5 flex flex-col gap-2 flex-1 list-none p-0">
                    {FREE_FEATURES.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-white/60">
                        <span className="text-[#C9A040] shrink-0">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 text-center py-2.5 rounded-[10px] border border-white/10 text-white/30 text-sm font-semibold">
                    {isCurrent ? "Current plan" : "Free forever"}
                  </div>
                </div>
              );
            })()}

            {/* Paid plan cards */}
            {SUBSCRIPTION_PLANS.map((plan, i) => {
              const isCurrent  = currentPlanId === plan.id;
              const isFeatured = i === 1;
              const price      = Math.round(plan.price * annualFactor);
              return (
                <div
                  key={plan.id}
                  className={[
                    "rounded-[20px] p-6 flex flex-col relative",
                    isFeatured
                      ? "fa-gradient-featured"
                      : "bg-[#2D0A28]",
                    !isFeatured && isCurrent  ? "ring-[1.5px] ring-[#FF6B1F]" : "",
                    !isFeatured && !isCurrent ? "border border-white/[0.08]"  : "",
                  ].join(" ")}
                >
                  {isFeatured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 fa-eyebrow bg-[#1A0B2E] text-[#FF6B1F] rounded-full px-3 py-1 border border-[#FF6B1F]/40 whitespace-nowrap text-[0.6rem]">
                      MOST POPULAR
                    </span>
                  )}
                  {isCurrent && (
                    <span className={[
                      "self-start fa-eyebrow rounded-full px-3 py-0.5 mb-3 text-[0.6rem]",
                      isFeatured ? "bg-white/20 text-white" : "bg-[#FF6B1F]/15 text-[#FF6B1F]",
                    ].join(" ")}>
                      CURRENT
                    </span>
                  )}
                  <span className={["fa-eyebrow", isFeatured ? "text-white/70" : ""].join(" ")}>
                    {plan.name.toUpperCase()}
                  </span>
                  <p className="font-display text-[2rem] text-white mt-1">
                    ${price}
                  </p>
                  <p className={["text-[0.7rem] font-mono mt-0.5", isFeatured ? "text-white/60" : "text-white/35"].join(" ")}>
                    /month{billing === "annual" ? " · billed annually" : ""}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2 flex-1 list-none p-0">
                    {[`${plan.credits} credits/month`, ...PAID_FEATURES, `$${(plan.price / plan.credits).toFixed(2)}/credit`].map((f) => (
                      <li key={f} className={["flex gap-2 text-sm", isFeatured ? "text-white/85" : "text-white/60"].join(" ")}>
                        <span className={isFeatured ? "text-white/90 shrink-0" : "text-[#C9A040] shrink-0"}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className={[
                      "mt-6 text-center py-2.5 rounded-[10px] text-sm font-bold",
                      isFeatured ? "bg-white/20 text-white" : "bg-[#FF6B1F]/10 text-[#FF6B1F]",
                    ].join(" ")}>
                      Current plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(plan.id)}
                      className={[
                        "mt-6 w-full py-2.5 rounded-[10px] text-sm font-bold text-white border-none cursor-pointer hover:opacity-90 transition-opacity",
                        isFeatured ? "bg-[#1A0B2E]" : "fa-gradient-primary",
                      ].join(" ")}
                    >
                      {currentPlanId === "free" ? "Get started" : "Upgrade"}
                    </button>
                  )}
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
                    onClick={() => handleBuyPack(pkg.id)}
                    className={[
                      "mt-5 w-full py-2.5 rounded-[10px] text-sm font-bold text-white border-none cursor-pointer hover:opacity-90 transition-opacity",
                      isBest ? "fa-gradient-primary" : "border border-white/20 bg-transparent hover:border-white/35",
                    ].join(" ")}
                  >
                    Buy now
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Credit economy ── */}
        <section>
          <span className="fa-eyebrow">CREDIT ECONOMY</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-6">What Credits Buy</h2>
          <div className="rounded-[16px] overflow-hidden border border-white/[0.07]">
            {CREDIT_COSTS.map((item, i) => (
              <div
                key={item.action}
                className={[
                  "flex items-center justify-between gap-4 px-5 py-4",
                  i < CREDIT_COSTS.length - 1 ? "border-b border-white/[0.05]" : "",
                  i % 2 === 0 ? "bg-[#2D0A28]" : "bg-[#1A0B2E]",
                ].join(" ")}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 font-semibold text-sm">{item.action}</p>
                  <p className="text-white/30 text-[0.7rem] font-mono mt-0.5">{item.note}</p>
                </div>
                <span className="shrink-0 fa-eyebrow bg-[#FF6B1F]/12 text-[#FF6B1F] rounded-full px-3 py-1 text-[0.78rem]">
                  {item.cost} cr
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Credit history ── */}
        <section>
          <span className="fa-eyebrow">TRANSACTION LOG</span>
          <h2 className="font-display mt-1 text-[1.6rem] text-white mb-6">Credit History</h2>
          <div className="rounded-[16px] overflow-hidden border border-white/[0.07]">
            {MOCK_HISTORY.map((tx, i) => (
              <div
                key={tx.id}
                className={[
                  "flex items-center gap-4 px-5 py-4",
                  i < MOCK_HISTORY.length - 1 ? "border-b border-white/[0.05]" : "",
                  i % 2 === 0 ? "bg-[#2D0A28]" : "bg-[#1A0B2E]",
                ].join(" ")}
              >
                <div className={[
                  "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
                  tx.amount > 0 ? "bg-emerald-500/15" : "bg-[#FF6B1F]/12",
                ].join(" ")}>
                  <span className={tx.amount > 0 ? "text-emerald-400 text-sm" : "text-[#FF6B1F] text-sm"}>
                    {tx.amount > 0 ? "↓" : "↑"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 font-semibold text-sm">{tx.description}</p>
                  <p className="text-white/30 text-[0.7rem] font-mono mt-0.5">{tx.date}</p>
                </div>
                <span className={[
                  "font-bold text-sm shrink-0",
                  tx.amount > 0 ? "text-emerald-400" : "text-[#FF6B1F]",
                ].join(" ")}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} cr
                </span>
              </div>
            ))}
          </div>
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
