import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, USD_TO_PHP_RATE } from "@/lib/paymongo";
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from "@/types/constants";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = (await request.json()) as {
      type: "subscription" | "credits";
      id: string;
    };

    if (!type || !id) {
      return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    let lineItem: {
      name: string;
      description: string;
      amount: number;
      currency: "PHP";
      quantity: number;
    };
    let planId: string | null = null;
    let packageId: string | null = null;

    if (type === "subscription") {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 400 });

      // plan.price is in USD — convert to PHP centavos for PayMongo
      const phpAmount = Math.round(plan.price * USD_TO_PHP_RATE * 100);
      lineItem = {
        name: `${plan.name} Plan`,
        description: `$${plan.price}/mo · ${plan.credits} credits/month · charged in PHP at ₱${USD_TO_PHP_RATE}/$`,
        amount: phpAmount,
        currency: "PHP",
        quantity: 1,
      };
      planId = id;
    } else {
      const pkg = CREDIT_PACKAGES.find((p) => p.id === id);
      if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 400 });

      // pkg.price is in USD — convert to PHP centavos for PayMongo
      const phpAmount = Math.round(pkg.price * USD_TO_PHP_RATE * 100);
      lineItem = {
        name: pkg.name,
        description: `${pkg.credits} credits · $${pkg.price} charged in PHP at ₱${USD_TO_PHP_RATE}/$`,
        amount: phpAmount,
        currency: "PHP",
        quantity: 1,
      };
      packageId = id;
    }

    const { sessionId, checkoutUrl } = await createCheckoutSession({
      lineItems: [lineItem],
      successUrl: `${siteUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/payments`,
      metadata: {
        member_id: user.id,
        type,
        ...(planId && { plan_id: planId }),
        ...(packageId && { package_id: packageId }),
      },
      billingEmail: user.email,
      billingName: profile?.full_name ?? undefined,
    });

    // Record the pending payment so we can reconcile on webhook
    await supabase.from("payments").insert({
      member_id: user.id,
      paymongo_session_id: sessionId,
      type,
      plan_id: planId,
      package_id: packageId,
      amount: lineItem.amount,
      status: "pending",
    });

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
