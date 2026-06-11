import { createAdminClient } from "@/lib/supabase/admin";

// ─── Bypass switch ────────────────────────────────────────────────────────────
// TEMPORARY — payment gateway integration is on hold for this deployment cycle.
// While true, ALL credit gates are disabled: no user is ever blocked and every
// action is deducted at 0 cost. isPayingSubscriber also short-circuits to true
// so subscriber-only features are accessible to everyone during staging.
//
// To restore the full Hybrid SaaS + Premium Add-On model: set to false.
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
  // ── Startup: workflow utilities (free for paid subscribers) ───────────────
  UNLOCK_INVESTOR_PROFILE:  { base: 1,  reason: "Unlock investor profile" },
  REGENERATE_MATCH_REPORT:  { base: 1,  reason: "Investor match report regeneration" },
  SEND_COFOUNDER_INVITE:    { base: 1,  reason: "Cofounder email invite" },

  // ── Investor: data screening (free for paid subscribers) ─────────────────
  VIEW_PITCH_DECK:          { base: 1,  reason: "View startup pitch deck" },
  VIEW_FINANCIALS:          { base: 1,  reason: "View startup financial snapshot" },
  VIEW_COMPATIBILITY:       { base: 1,  reason: "View compatibility score" },
  EXPORT_PIPELINE_REPORT:   { base: 1,  reason: "Deal pipeline export" },

  // ── Outreach: 1 credit = 1 match / introduction (drawn from match bundle) ─
  REQUEST_INTRO_INVESTOR:   { base: 1,  reason: "Intro request to investor" },
  REQUEST_FOUNDER_INTRO:    { base: 1,  reason: "Intro request to founder" },
  REQUEST_COMMUNITY_INTRO:  { base: 1,  reason: "Community intro request" },

  // ── Shared / community ────────────────────────────────────────────────────
  UNLOCK_COMMUNITY_PROFILE: { base: 1,  reason: "Unlock community profile" },

  // ── Ecosystem partner: platform tooling (free for paid subscribers) ──────
  POST_OPPORTUNITY:         { base: 1,  reason: "Post opportunity/program call" },
  VIEW_COHORT_DASHBOARD:    { base: 1,  reason: "View cohort analytics dashboard" },

  // ── Ecosystem partner: transactional ─────────────────────────────────────
  BULK_AI_MATCH_STARTUPS:   { base: 1,  reason: "Bulk AI match startups to program" },
  FEATURE_STARTUP_DIGEST:   { base: 1,  reason: "Feature startup in digest" },
  SEND_PARTNERSHIP_INVITE:  { base: 1,  reason: "Partnership email invite" },

  // ── Premium flat-rate add-on ($99 purchase = 100-credit block) ───────────
  // OPEN_MATCH_BUNDLE costs 1 credit per match (100-credit block = 100 matches).
  // VCR generation is handled on confidence.exoasia.org, not this platform.
  OPEN_MATCH_BUNDLE:        { base: 1,   reason: "Open match bundle (1 match)" },

  // ── Redo assessment ───────────────────────────────────────────────────────
  // Costs a full 100-credit block ($99 add-on) — equivalent to one VCR on confidence.exoasia.org.
  REDO_ASSESSMENT:          { base: 100, reason: "AI venture readiness assessment (redo)" },
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// Actions that cost 0 credits for any active paid subscriber (6-month or 12-month).
// deductCredits still writes a change_amount: 0 ledger row so idempotency checks
// (e.g. "has this investor already viewed this deck?") continue to work unchanged.
const FREE_FOR_PAID_SUBSCRIBERS = new Set<CreditAction>([
  // Startup workflow utilities
  "UNLOCK_INVESTOR_PROFILE",
  "REGENERATE_MATCH_REPORT",
  "SEND_COFOUNDER_INVITE",
  // Investor data screening
  "VIEW_PITCH_DECK",
  "VIEW_FINANCIALS",
  "VIEW_COMPATIBILITY",
  "EXPORT_PIPELINE_REPORT",
  // Community
  "UNLOCK_COMMUNITY_PROFILE",
  // Ecosystem partner tooling
  "POST_OPPORTUNITY",
  "VIEW_COHORT_DASHBOARD",
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
  if (BYPASS_CREDIT_GATES) return true;

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
    cost = 0;
  } else {
    if (FREE_FOR_PAID_SUBSCRIBERS.has(action)) {
      const isPaid = await isPayingSubscriber(memberId);
      if (isPaid) cost = 0;
    }
  }

  const balance = await getBalance(memberId);

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
