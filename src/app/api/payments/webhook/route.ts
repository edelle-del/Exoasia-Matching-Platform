import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("Paymongo-Signature") ?? "", secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  let event;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (event?.data?.attributes?.type !== "checkout_session.payment.paid") {
    return NextResponse.json({ received: true });
  }
  const session = event.data.attributes.data;
  if (!session?.id || !Array.isArray(session.attributes?.line_items)) {
    return NextResponse.json({ error: "Invalid checkout event" }, { status: 400 });
  }
  const lineItems = session.attributes.line_items as { amount: number; quantity: number; currency: string }[];
  if (!lineItems.length || lineItems.some(item => item.currency !== "PHP" || !Number.isSafeInteger(item.amount) || item.amount <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }
  const amount = lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const admin = createAdminClient();
  const { error } = await admin.rpc("fulfill_checkout_payment", {
    p_session_id: session.id,
    p_amount: amount,
    p_member_id: session.attributes.metadata?.member_id ?? "",
  });
  if (error) return NextResponse.json({ error: "Payment could not be reconciled" }, { status: 500 });
  return NextResponse.json({ received: true });
}
