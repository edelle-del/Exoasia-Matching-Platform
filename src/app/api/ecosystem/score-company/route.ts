import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GEMINI_ECO_PARTNER_SCORES_STARTUP_INSTRUCTIONS } from "@/lib/ai/geminiProjectMatchingInstructions";

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
      model: "openrouter/owl-alpha",
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

    const { startup_id } = (await request.json().catch(() => ({}))) as { startup_id?: string };
    if (!startup_id) {
      return NextResponse.json({ error: "startup_id is required" }, { status: 400 });
    }

    const { data: portfolioEntry } = await admin
      .from("portfolio_companies")
      .select("id")
      .eq("partner_id", user.id)
      .eq("startup_id", startup_id)
      .eq("status", "active")
      .single();

    if (!portfolioEntry) {
      return NextResponse.json({ error: "Startup not in your active portfolio" }, { status: 404 });
    }

    const { data: startupProfile } = await admin
      .from("profiles")
      .select("id, full_name, business_name, sector, stage, city, asks_summary")
      .eq("id", startup_id)
      .single();

    const { data: projects } = await admin
      .from("projects")
      .select("id, name, description, stage, sector")
      .eq("owner_id", startup_id)
      .eq("is_active", true);

    if (!projects || projects.length === 0) {
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
      startup: {
        id: startup_id,
        business_name: startupProfile?.business_name,
        full_name: startupProfile?.full_name,
        sector: startupProfile?.sector,
        stage: startupProfile?.stage,
        city: startupProfile?.city,
        profile: startupProfile?.asks_summary,
      },
      projects,
    };

    const json = await callOpenRouter(GEMINI_ECO_PARTNER_SCORES_STARTUP_INSTRUCTIONS, payload);

    type ScoreEntry = {
      project_id: string;
      fit_score: number;
      summary: string;
      rationale: Record<string, string>;
    };
    const result = JSON.parse(json) as { scores: ScoreEntry[] };

    if (!Array.isArray(result.scores)) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    const validProjectIds = new Set(projects.map((p) => p.id));
    const rows = result.scores
      .filter((s) => s.project_id && validProjectIds.has(s.project_id))
      .map((s) => ({
        project_id: s.project_id,
        eco_partner_profile_id: user.id,
        fit_score: Math.max(0, Math.min(100, Math.round(Number(s.fit_score) || 0))),
        summary: String(s.summary || ""),
        rationale: s.rationale ?? {},
        generated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("ecosystem_match_scores")
        .upsert(rows, { onConflict: "project_id,eco_partner_profile_id" });

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ scores: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
