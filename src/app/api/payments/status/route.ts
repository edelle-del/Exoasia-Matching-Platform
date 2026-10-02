import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sessionId = params.get("session_id");
  const paymentId = params.get("payment_id");
  const validPaymentId = paymentId && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(paymentId);
  if (!validPaymentId && (!sessionId || !/^cs_[a-zA-Z0-9_-]+$/.test(sessionId))) {
    return NextResponse.json({ error: "Invalid checkout reference" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("payments")
    .select("status")
    .eq(validPaymentId ? "id" : "paymongo_session_id", validPaymentId ? paymentId! : sessionId!)
    .eq("member_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not verify payment" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
  return NextResponse.json({ status: data.status }, { headers: { "Cache-Control": "no-store" } });
}
