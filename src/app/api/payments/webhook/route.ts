import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES, DURATION_PLANS } from "@/types/constants";

// Webhook uses service role — no user session available
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Paymongo-Signature") ?? "";
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";

  if (webhookSecret) {
    const valid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (event.data as { attributes?: { type?: string } })?.attributes?.type;

  // Only handle successful checkout payments
  if (eventType !== "checkout_session.payment.paid") {
    return NextResponse.json({ received: true });
  }

  const sessionData = (
    event.data as { attributes: { data: { id: string; attributes: { metadata: Record<string, string> } } } }
  ).attributes.data;

  const sessionId = sessionData.id;
  const metadata = sessionData.attributes.metadata;
  const memberId = metadata?.member_id;

  if (!memberId) return NextResponse.json({ received: true });

  const supabase = getServiceClient();

  // Mark payment paid
  await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), paymongo_payment_id: sessionId })
    .eq("paymongo_session_id", sessionId);

  if (metadata.type === "subscription") {
    const durPlan = DURATION_PLANS.find((p) => p.id === metadata.plan_id);
    const legacyPlan = SUBSCRIPTION_PLANS.find((p) => p.id === metadata.plan_id);
    const plan = durPlan ?? legacyPlan;
    if (!plan) return NextResponse.json({ received: true });

    const months = durPlan ? durPlan.months : 1;
    const planLabel = durPlan ? durPlan.label : legacyPlan!.name;
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + months);

    await supabase
      .from("profiles")
      .update({
        subscription_plan: plan.id,
        subscription_ends_at: endsAt.toISOString(),
      })
      .eq("id", memberId);

    await supabase.from("ad_credit_ledger").insert({
      member_id: memberId,
      change_amount: plan.credits,
      reason: `Subscription ${planLabel}: ${plan.credits} credits`,
    });
  } else if (metadata.type === "credits") {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === metadata.package_id);
    if (!pkg) return NextResponse.json({ received: true });

    await supabase.from("ad_credit_ledger").insert({
      member_id: memberId,
      change_amount: pkg.credits,
      reason: `Credit purchase: ${pkg.name}`,
    });
  }

  return NextResponse.json({ received: true });
}
