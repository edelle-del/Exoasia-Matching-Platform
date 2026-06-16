import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GEMINI_ECO_PARTNER_SCORES_INVESTOR_INSTRUCTIONS } from "@/lib/ai/geminiEcoPartnerScoresInvestorInstructions";

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  throw new Error("AI output did not contain JSON.");
}

async function callOpenRouter(systemInstruction: string, payload: unknown) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenRouter request failed: ${res.status} ${msg}`);
  }

  const raw = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(raw); } catch { data = null; }

  const anyData = data as { choices?: { message?: { content?: string } | string }[] } | null;
  const content = anyData?.choices?.[0]?.message
    ? (typeof anyData.choices[0].message === "string"
        ? anyData.choices[0].message
        : (anyData.choices[0].message as { content?: string }).content ?? raw)
    : raw;
  const text = typeof content === "string" ? content : JSON.stringify(content);

  try {
    return extractJson(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenRouter parse error: ${msg}. Raw response: ${raw}`);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, sector, city, member_role, offers_summary")
      .eq("id", user.id)
      .single();

    if (!partnerProfile || partnerProfile.member_role !== "ecosystem_partner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { investor_id } = (await request.json().catch(() => ({}))) as { investor_id?: string };
    if (!investor_id) {
      return NextResponse.json({ error: "investor_id is required" }, { status: 400 });
    }

    const { data: investorProfile } = await admin
      .from("profiles")
      .select("id, full_name, business_name, sector, city, ask_categories, offer_categories, short_bio")
      .eq("id", investor_id)
      .single();

    if (!investorProfile) {
      return NextResponse.json({ scores: [] });
    }

    const payload = {
      eco_partner: {
        id: partnerProfile.id,
        business_name: partnerProfile.business_name,
        full_name: partnerProfile.full_name,
        sector: partnerProfile.sector,
        city: partnerProfile.city,
        mandate: partnerProfile.offers_summary,
      },
      investor: {
        id: investor_id,
        business_name: investorProfile.business_name,
        full_name: investorProfile.full_name,
        sector: investorProfile.sector,
        city: investorProfile.city,
        ask_categories: investorProfile.ask_categories,
        offer_categories: investorProfile.offer_categories,
        bio: investorProfile.short_bio,
      },
    };

    const json = await callOpenRouter(GEMINI_ECO_PARTNER_SCORES_INVESTOR_INSTRUCTIONS, payload);

    type CategoryScores = {
      sector_match?: number;
      support_type_alignment?: number;
      geographic_fit?: number;
    };
    type ScoreEntry = {
      investor_profile_id: string;
      fit_score: number;
      summary: string;
      category_scores?: CategoryScores;
      rationale: Record<string, string>;
    };
    const result = JSON.parse(json) as ScoreEntry;

    if (!result.fit_score && result.fit_score !== 0) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const clampScore = (v: unknown) =>
      typeof v === "number" ? Math.max(0, Math.min(100, Math.round(v))) : undefined;

    const cs = result.category_scores;
    const rationale = {
      ...(result.rationale ?? {}),
      ...(cs?.sector_match           != null ? { _cs_sector_vertical:   clampScore(cs.sector_match)           } : {}),
      ...(cs?.support_type_alignment != null ? { _cs_investment_thesis: clampScore(cs.support_type_alignment)  } : {}),
      ...(cs?.geographic_fit         != null ? { _cs_geographic_fit:    clampScore(cs.geographic_fit)          } : {}),
    };
    
    const row = {
      investor_profile_id: investor_id,
      eco_partner_profile_id: user.id,
      fit_score: Math.max(0, Math.min(100, Math.round(Number(result.fit_score) || 0))),
      summary: String(result.summary || ""),
      rationale,
      generated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await admin
      .from("ecosystem_investor_match_scores")
      .upsert(row, { onConflict: "investor_profile_id,eco_partner_profile_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ scores: [row] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
