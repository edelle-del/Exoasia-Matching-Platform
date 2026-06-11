import { createAdminClient } from "@/lib/supabase/admin";

// ─── Bypass switch ────────────────────────────────────────────────────────────
// TEMPORARY — payment gateway integration is on hold for this deployment cycle.
// While true, ALL credit gates are disabled: no user is ever blocked and every
// action is deducted at 0 cost. A 0-amount ledger row is still written so
// idempotency checks remain operational throughout.
//
// To restore the full credit economy:  set BYPASS_CREDIT_GATES = false
// ─────────────────────────────────────────────────────────────────────────────
export const BYPASS_CREDIT_GATES = true;

export class InsufficientCreditsError extends Error {
  readonly balance: number;
  readonly required: number;

  constructor(balance: number, required: number) {
    super(`Insufficient credits: need ${required}, have ${balance}`);
    this.name = "InsufficientCreditsError";
    this.balance = balance;
    this.required = required;
  }
}

export const CREDIT_COSTS = {
  // ── Startup actions ──────────────────────────────────────────────────────
  UNLOCK_INVESTOR_PROFILE:  { base: 3,  reason: "Unlock investor profile" },
  REQUEST_INTRO_INVESTOR:   { base: 7,  reason: "Intro request to investor" },
  REGENERATE_MATCH_REPORT:  { base: 3,  reason: "Investor match report regeneration" },
  SEND_COFOUNDER_INVITE:    { base: 1,  reason: "Cofounder email invite" },

  // ── Investor: data screening (free for paid subscribers) ─────────────────
  VIEW_PITCH_DECK:          { base: 3,  reason: "View startup pitch deck" },
  VIEW_FINANCIALS:          { base: 5,  reason: "View startup financial snapshot" },
  VIEW_COMPATIBILITY:       { base: 2,  reason: "View compatibility score" },

  // ── Investor: transactional / outreach (always costs credits) ────────────
  REQUEST_FOUNDER_INTRO:    { base: 5,  reason: "Intro request to founder" },
  EXPORT_PIPELINE_REPORT:   { base: 8,  reason: "Deal pipeline export" },

  // ── Shared / community ────────────────────────────────────────────────────
  UNLOCK_COMMUNITY_PROFILE: { base: 2,  reason: "Unlock community profile" },
  REQUEST_COMMUNITY_INTRO:  { base: 2,  reason: "Community intro request" },

  // ── Ecosystem partner: platform tooling (free for paid subscribers) ──────
  POST_OPPORTUNITY:         { base: 5,  reason: "Post opportunity/program call" },
  VIEW_COHORT_DASHBOARD:    { base: 8,  reason: "View cohort analytics dashboard" },

  // ── Ecosystem partner: transactional / premium (always costs credits) ────
  BULK_AI_MATCH_STARTUPS:   { base: 15, reason: "Bulk AI match startups to program" },
  FEATURE_STARTUP_DIGEST:   { base: 10, reason: "Feature startup in digest" },
  SEND_PARTNERSHIP_INVITE:  { base: 1,  reason: "Partnership email invite" },

  // ── Other ─────────────────────────────────────────────────────────────────
  REDO_ASSESSMENT:          { base: 15, reason: "AI venture readiness assessment (redo)" },
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// These actions cost 0 credits for any active paid subscriber.
// deductCredits still writes a change_amount: 0 ledger row so that
// idempotency checks (e.g. "has this investor already viewed this deck?")
// continue to work without modification to calling routes.
const FREE_FOR_PAID_SUBSCRIBERS = new Set<CreditAction>([
  // Startup
  "UNLOCK_INVESTOR_PROFILE", // investor profile + compatibility breakdown
  // Investor
  "VIEW_PITCH_DECK",         // startup pitch deck
  "VIEW_FINANCIALS",         // startup financial snapshot
  "VIEW_COMPATIBILITY",      // compatibility score
  // Ecosystem partner
  "POST_OPPORTUNITY",        // post opportunity / program call
  "VIEW_COHORT_DASHBOARD",   // cohort analytics dashboard
]);

export async function getBalance(memberId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ad_credit_ledger")
    .select("change_amount")
    .eq("member_id", memberId);
  return (data ?? []).reduce((sum, r) => sum + Number(r.change_amount ?? 0), 0);
}

export async function isPayingSubscriber(memberId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("subscription_plan, subscription_ends_at")
    .eq("id", memberId)
    .single();

  if (!data?.subscription_plan || data.subscription_plan === "free") return false;
  if (data.subscription_ends_at && new Date(data.subscription_ends_at) < new Date()) return false;
  return true;
}

/**
 * Deducts credits for an action. Throws InsufficientCreditsError if the
 * member's balance is insufficient. For actions in FREE_FOR_PAID_SUBSCRIBERS,
 * active paid subscribers are charged 0 credits but a 0-amount ledger entry
 * is still written so ledger-based idempotency checks keep working.
 *
 * When BYPASS_CREDIT_GATES is true, cost is forced to 0 for every action and
 * no InsufficientCreditsError is ever thrown. The existing balance check and
 * error class are left intact — they simply never fire in bypass mode since
 * cost is always 0 and `cost > 0` is never satisfied.
 */
export async function deductCredits(
  memberId: string,
  action: CreditAction,
  reasonSuffix?: string,
): Promise<{ deducted: number; newBalance: number }> {
  const admin = createAdminClient();
  const config = CREDIT_COSTS[action];
  const fullReason = reasonSuffix ? `${config.reason}: ${reasonSuffix}` : config.reason;

  let cost: number = config.base;

  if (BYPASS_CREDIT_GATES) {
    // Gates disabled — force cost to 0, skip subscriber and balance checks.
    cost = 0;
  } else {
    if (FREE_FOR_PAID_SUBSCRIBERS.has(action)) {
      const isPaid = await isPayingSubscriber(memberId);
      if (isPaid) cost = 0;
    }
  }

  const balance = await getBalance(memberId);

  // Never fires when BYPASS_CREDIT_GATES is true (cost is always 0 above).
  if (cost > 0 && balance < cost) {
    throw new InsufficientCreditsError(balance, cost);
  }

  await admin.from("ad_credit_ledger").insert({
    member_id: memberId,
    change_amount: -cost,
    reason: fullReason,
  });

  return { deducted: cost, newBalance: balance - cost };
}
