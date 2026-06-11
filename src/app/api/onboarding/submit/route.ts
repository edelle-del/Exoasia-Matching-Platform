import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";

type OnboardingPayload = {
  full_name: string;
  business_name?: string;
  role_title?: string;
  city?: string;
  short_bio?: string;
  linkedin_url?: string;
  how_heard_about?: string;
  referred_by?: string;
  phone_whatsapp?: string;
  years_in_operation?: string;
  sector?: string;
  employee_band?: string;
  annual_revenue_estimate?: string;
  member_role?: string;
  ask_categories?: string[];
  offer_categories?: string[];
  asks_summary?: string;
  offers_summary?: string;
  pdpa_matching_consent?: boolean;
  additional_notes?: string;
  asks?: string[];
  offers?: string[];
};

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

    const { data: { session } } = await supabase.auth.getSession();
    const role = getRoleFromAccessToken(session?.access_token);
    const isAdminView = ["advisor", "admin"].includes(role ?? "");

    const body = (await request.json()) as OnboardingPayload;

    if (!body || !body.full_name || !body.sector) {
      return NextResponse.json(
        { error: "Missing required fields: full_name and sector" },
        { status: 400 },
      );
    }

    if (!body.how_heard_about) {
      return NextResponse.json(
        { error: "Missing required field: how_heard_about" },
        { status: 400 },
      );
    }

    if (!body.phone_whatsapp) {
      return NextResponse.json(
        { error: "Missing required field: phone_whatsapp" },
        { status: 400 },
      );
    }

    if (!body.years_in_operation) {
      return NextResponse.json(
        { error: "Missing required field: years_in_operation" },
        { status: 400 },
      );
    }

    if (!isAdminView && (!body.ask_categories || body.ask_categories.length === 0)) {
      return NextResponse.json(
        { error: "Select at least one ASK category" },
        { status: 400 },
      );
    }

    if (!isAdminView && (!body.offer_categories || body.offer_categories.length === 0)) {
      return NextResponse.json(
        { error: "Select at least one OFFER category" },
        { status: 400 },
      );
    }

    if (!body.pdpa_matching_consent) {
      return NextResponse.json(
        { error: "PDPA matching consent is required" },
        { status: 400 },
      );
    }

    const normalizedAskCategories = Array.from(
      new Set(
        (body.ask_categories ?? [])
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ).slice(0, 3);
    const normalizedOfferCategories = Array.from(
      new Set(
        (body.offer_categories ?? [])
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ).slice(0, 3);

    if (
      body.how_heard_about === "Referred by a member" &&
      !body.referred_by?.trim()
    ) {
      return NextResponse.json(
        { error: "Missing required field: referred_by" },
        { status: 400 },
      );
    }

    // Upsert profile
    const { error: upsertError } = await supabase.from("profiles").upsert(
      [
        {
          id: user.id,
          full_name: body.full_name.trim(),
          business_name: body.business_name?.trim() ?? null,
          role_title: body.role_title?.trim() ?? null,
          city: body.city?.trim() ?? null,
          short_bio: body.short_bio?.trim() ?? null,
          linkedin_url: body.linkedin_url?.trim() ?? null,
          how_heard_about: body.how_heard_about,
          referred_by: body.referred_by?.trim() ?? null,
          phone_whatsapp: body.phone_whatsapp.trim(),
          years_in_operation: body.years_in_operation,
          sector: body.sector ?? null,
          member_role: body.member_role ?? null,
          employee_band: body.employee_band ?? null,
          annual_revenue_estimate: body.annual_revenue_estimate?.trim() ?? null,
          stage: "1",
          ask_categories: normalizedAskCategories,
          offer_categories: normalizedOfferCategories,
          asks_summary: body.asks_summary?.trim() ?? null,
          offers_summary: body.offers_summary?.trim() ?? null,
          pdpa_matching_consent: body.pdpa_matching_consent,
          additional_notes: body.additional_notes?.trim() ?? null,
        },
      ],
      { onConflict: "id" },
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await supabase.auth.updateUser({
      data: { full_name: body.full_name.trim() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
