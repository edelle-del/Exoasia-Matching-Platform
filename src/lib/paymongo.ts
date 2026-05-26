import { createHmac } from "crypto";

const PAYMONGO_BASE_URL = "https://api.paymongo.com/v1";

function getAuthHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export interface LineItem {
  name: string;
  description: string;
  amount: number; // in centavos
  currency: "PHP";
  quantity: number;
}

export interface CheckoutOptions {
  lineItems: LineItem[];
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
  billingEmail?: string;
  billingName?: string;
}

export async function createCheckoutSession(opts: CheckoutOptions) {
  const res = await fetch(`${PAYMONGO_BASE_URL}/checkout_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          ...(opts.billingEmail && {
            billing: { email: opts.billingEmail, name: opts.billingName },
          }),
          line_items: opts.lineItems,
          payment_method_types: ["card", "gcash", "paymaya", "grab_pay"],
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          metadata: opts.metadata,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errors?.[0]?.detail ?? "Failed to create PayMongo checkout session");
  }

  const json = await res.json();
  return {
    sessionId: json.data.id as string,
    checkoutUrl: json.data.attributes.checkout_url as string,
  };
}

// PayMongo Signature header format: t=<timestamp>,te=<test_sig>,li=<live_sig>
// Signature = HMAC-SHA256 of `${timestamp}.${rawBody}` using webhook secret
export function verifyWebhookSignature(rawBody: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const timestamp = parts["t"];
  const signature = parts["te"] ?? parts["li"];

  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return expected === signature;
}
