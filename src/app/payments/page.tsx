"use client";

import Link from "next/link";
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from "@/types/constants";

const currentSubscription = {
  plan: "starter" as const,
  credits: 50,
  renewalDate: "2024-05-15",
  status: "active" as const,
};

const creditHistory = [
  {
    id: "credit-1",
    type: "purchase" as const,
    amount: 100,
    description: "Credit Pack - 100 Credits",
    date: "2024-04-10",
    cost: 250,
  },
  {
    id: "credit-2",
    type: "usage" as const,
    amount: -25,
    description: "Match acceptance - TechFlow Systems",
    date: "2024-04-12",
    cost: 0,
  },
  {
    id: "credit-3",
    type: "usage" as const,
    amount: -10,
    description: "Deal board access - Week 15",
    date: "2024-04-15",
    cost: 0,
  },
];

export default function PaymentsPage() {
  const currentPlanDetails =
    SUBSCRIPTION_PLANS.find((plan) => plan.id === currentSubscription.plan) ??
    SUBSCRIPTION_PLANS[0];

  const handleUpgradePlan = (planId: string) => {
    console.log("upgrade-plan", planId);
  };

  const handlePurchaseCredits = (packageId: string) => {
    console.log("purchase-credits", packageId);
  };

  const getTransactionIcon = (type: string) =>
    type === "purchase" ? "ri-bank-card-line" : "ri-send-plane-line";

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      {/* Header */}
      <section className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/dashboard"
            className="text-sm font-500 text-[var(--color-primary)] hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-700 text-[var(--color-ink)]">
            Payments & Credits
          </h1>
          <p className="mt-2 text-[var(--color-body)]">
            Manage your subscription and credit balance
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[1280px]">
          {/* Current Subscription */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-600 text-[var(--color-ink)]">
              Current subscription
            </h2>
            <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-600 text-[var(--color-ink)]">
                    {currentPlanDetails.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-body)]">
                    {currentPlanDetails.credits} credits/month · ₱
                    {(
                      currentPlanDetails.price / currentPlanDetails.credits
                    ).toFixed(2)}{" "}
                    per credit
                  </p>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Renews on {currentSubscription.renewalDate}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-700 text-[var(--color-primary)]">
                    ₱{currentPlanDetails.price}/mo
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-600 text-green-700">
                    <i
                      className="ri-check-line mr-1 align-[-2px]"
                      aria-hidden="true"
                    />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Credit Balance */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-600 text-[var(--color-ink)]">
              Credit balance
            </h2>
            <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-600 text-[var(--color-ink)]">
                    Available credits
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-body)]">
                    Use credits to accept matches and access premium features
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-700 text-[var(--color-primary)]">
                    {currentSubscription.credits}
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">credits</p>
                </div>
              </div>
            </div>
          </section>

          {/* Upgrade Plans */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-600 text-[var(--color-ink)]">
              Upgrade your plan
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6 ${
                    plan.id === currentSubscription.plan
                      ? "ring-2 ring-[var(--color-primary)]"
                      : ""
                  }`}
                >
                  <div className="text-center">
                    <h3 className="font-600 text-[var(--color-ink)]">
                      {plan.name}
                    </h3>
                    <div className="mt-2 text-2xl font-700 text-[var(--color-primary)]">
                      ₱{plan.price}/mo
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-body)]">
                      {plan.billingCycle} billing cycle
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-[var(--color-body)]">
                      <li>• {plan.credits} credits/month</li>
                      <li className="text-xs text-[var(--color-muted)]">
                        ₱{(plan.price / plan.credits).toFixed(2)} per credit
                      </li>
                      <li>• Unlimited project slots</li>
                      <li>• All investor matches unlocked</li>
                      <li>• Priority advisor queue</li>
                    </ul>
                    {plan.id === currentSubscription.plan ? (
                      <span className="mt-4 inline-block rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-600 text-white">
                        Current plan
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgradePlan(plan.id)}
                        className="mt-4 rounded-lg bg-[var(--color-primary)] px-6 py-2 font-500 text-white hover:bg-[var(--color-primary-active)]"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Purchase Credits */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-600 text-[var(--color-ink)]">
              Purchase credits
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6"
                >
                  <div className="text-center">
                    <h3 className="font-600 text-[var(--color-ink)]">
                      {pkg.name}
                    </h3>
                    <div className="mt-2 text-2xl font-700 text-[var(--color-primary)]">
                      ₱{pkg.price}
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-body)]">
                      {pkg.credits} credits
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      ₱{(pkg.price / pkg.credits).toFixed(2)} per credit
                    </p>
                    <button
                      type="button"
                      onClick={() => handlePurchaseCredits(pkg.id)}
                      className="mt-4 rounded-lg bg-[var(--color-primary)] px-6 py-2 font-500 text-white hover:bg-[var(--color-primary-active)]"
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Credit History */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-600 text-[var(--color-ink)]">
              Credit history
            </h2>
            <div className="space-y-4">
              {creditHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <i
                        className={`${getTransactionIcon(transaction.type)} text-2xl text-[var(--color-primary)]`}
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="font-600 text-[var(--color-ink)]">
                          {transaction.description}
                        </h3>
                        <p className="text-sm text-[var(--color-muted)]">
                          {transaction.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-600 ${
                          transaction.amount > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount} credits
                      </div>
                      {transaction.cost > 0 && (
                        <p className="text-sm text-[var(--color-muted)]">
                          ₱{transaction.cost}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Payment Info */}
          <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6">
            <p className="text-sm font-600 text-[var(--color-muted)] uppercase">
              Payment information
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[var(--color-body)]">
              <li>• All payments are processed securely through PayMongo</li>
              <li>• Accepted: GCash, Maya, GrabPay, Visa/Mastercard</li>
              <li>
                • Credits are added to your account immediately after payment
              </li>
              <li>• Subscription renews automatically unless cancelled</li>
              <li>• Refunds available within 30 days for unused credits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
