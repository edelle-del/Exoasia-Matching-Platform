import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BYPASS_CREDIT_GATES } from "@/lib/credits";
import {
  GEMINI_INVESTOR_SCORES_PROJECT_INSTRUCTIONS,
  GEMINI_STARTUP_FINDS_INVESTORS_INSTRUCTIONS,
} from "@/lib/ai/geminiProjectMatchingInstructions";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Keys inside asks_summary that are admin/platform metadata and should not
// be included in the AI payload — they add noise without improving match quality.
const ASKS_NOISE_KEYS = ["referrals", "pitch_deck_url", "anp_affiliated", "demo_day_judge"];

function cleanAsksForAI(raw: string | null | undefined): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (!parsed || parsed._v !== 2) return null;
    const cleaned = { ...parsed };
    for (const key of ASKS_NOISE_KEYS) delete cleaned[key];
    return cleaned;
  } catch {
    return null;
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  throw new Error("Gemini output did not contain JSON.");
}

async function callOpenRouter(systemInstruction: string, payload: unknown) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  const res = await fetch(endpoint, {
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

  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  const content =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message ?? raw;
  const text = typeof content === "string" ? content : JSON.stringify(content);

  try {
    return extractJson(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenRouter parse error: ${msg}. Raw response: ${raw}`);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Debug helper: call this endpoint with ?debug=true to bypass auth and
  // invoke OpenRouter with a small synthetic payload. Useful for reproducing
  // parsing / 500 errors when developing locally. Remove before production.
  try {
    const debugHeader = _req.headers.get("x-debug");
    if (debugHeader === "true") {
      const { id: projectId } = await params;
      const payload = {
        project: {
          id: projectId,
          owner_id: "debug-owner",
          name: "Debug Project",
          stage: "Seed",
          sector: "Tech",
        },
        investors: [
          {
            id: "inv-1",
            full_name: "Investor One",
            business_name: "InvCo",
            sector: "Tech",
            stage: "Seed",
            member_role: "investor",
          },
        ],
      };

      try {
        const json = await callOpenRouter(
          GEMINI_STARTUP_FINDS_INVESTORS_INSTRUCTIONS,
          payload,
        );
        return NextResponse.json({ debug: true, raw: json });
      } catch (err) {
        return NextResponse.json(
          {
            debug: true,
            error: err instanceof Error ? err.message : String(err),
          },
          { status: 500 },
        );
      }
    }
  } catch (err) {
    // fall through to regular handling
  }
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, short_bio, sector, member_role, ask_categories, offer_categories, asks_summary, offers_summary, employee_band, annual_revenue_estimate",
      )
      .eq("id", user.id)
      .single();

    if (!callerProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id, name, description, stage, sector")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // ── Investor scores this one project ──────────────────────────────────
    if (callerProfile.member_role === "investor") {
      const { data: ownerProfile } = await admin
        .from("profiles")
        .select(
          "id, full_name, business_name, sector, asks_summary, offers_summary, employee_band, annual_revenue_estimate",
        )
        .eq("id", project.owner_id)
        .single();

      const payload = {
        investor: {
          ...callerProfile,
          asks_summary: cleanAsksForAI(callerProfile.asks_summary),
        },
        project: {
          ...project,
          owner: ownerProfile
            ? { ...ownerProfile, asks_summary: cleanAsksForAI(ownerProfile.asks_summary) }
            : ownerProfile,
        },
      };

      const json = await callOpenRouter(
        GEMINI_INVESTOR_SCORES_PROJECT_INSTRUCTIONS,
        payload,
      );
      type CategoryScores = { sector_vertical?: number; stage_fit?: number; investment_thesis?: number; geographic_fit?: number };
      type InvestorScoreResult = {
        project_id: string;
        fit_score: number;
        summary: string;
        category_scores?: CategoryScores;
        rationale: Record<string, string>;
      };
      const result = JSON.parse(json) as InvestorScoreResult;

      const fitScore = Math.max(
        0,
        Math.min(100, Math.round(Number(result.fit_score) || 0)),
      );

      const clampScore = (v: unknown) => typeof v === "number" ? Math.max(0, Math.min(100, Math.round(v))) : undefined;
      const cs = result.category_scores;
      const rationale = {
        ...(result.rationale ?? {}),
        ...(cs?.sector_vertical    != null ? { _cs_sector_vertical:    clampScore(cs.sector_vertical)    } : {}),
        ...(cs?.stage_fit          != null ? { _cs_stage_fit:          clampScore(cs.stage_fit)          } : {}),
        ...(cs?.investment_thesis  != null ? { _cs_investment_thesis:  clampScore(cs.investment_thesis)  } : {}),
        ...(cs?.geographic_fit     != null ? { _cs_geographic_fit:     clampScore(cs.geographic_fit)     } : {}),
      };

      const { error: upsertError } = await admin
        .from("project_match_scores")
        .upsert(
          {
            project_id: projectId,
            investor_profile_id: user.id,
            fit_score: fitScore,
            summary: String(result.summary || ""),
            rationale,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,investor_profile_id" },
        );

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        mode: "investor_scores_project",
        score: {
          project_id: projectId,
          fit_score: fitScore,
          summary: result.summary,
          rationale: result.rationale,
        },
      });
    }

    // ── Startup finds matching investors for their project ─────────────────
    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const REGEN_COST = 3;

    // First generation is free; every subsequent run costs 3 credits.
    const { count: existingScoreCount } = await admin
      .from("project_match_scores")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    const isRegen = (existingScoreCount ?? 0) > 0;

    if (isRegen) {
      const { data: ledgerRows } = await admin
        .from("ad_credit_ledger")
        .select("change_amount")
        .eq("member_id", user.id);

      const balance = (ledgerRows ?? []).reduce(
        (sum, r) => sum + Number(r.change_amount ?? 0),
        0,
      );

      if (!BYPASS_CREDIT_GATES && balance < REGEN_COST) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${REGEN_COST} credits but have ${balance}.`, needed: REGEN_COST, balance },
          { status: 402 },
        );
      }

      const { error: deductError } = await admin.from("ad_credit_ledger").insert({
        member_id: user.id,
        change_amount: -REGEN_COST,
        reason: `Regenerate match report: ${projectId}`,
      });

      if (deductError) {
        return NextResponse.json({ error: deductError.message }, { status: 500 });
      }
    }

    const { data: investors } = await admin
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, sector, member_role, ask_categories, offer_categories, asks_summary, offers_summary, employee_band, annual_revenue_estimate",
      )
      .eq("member_role", "investor")
      .limit(50);

    if (!investors || investors.length === 0) {
      return NextResponse.json({ mode: "startup_finds_investors", scores: [] });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, sector, stage, asks_summary, offers_summary, employee_band, annual_revenue_estimate",
      )
      .eq("id", user.id)
      .single();

    const payload = {
      project: {
        ...project,
        owner: ownerProfile
          ? { ...ownerProfile, asks_summary: cleanAsksForAI(ownerProfile.asks_summary) }
          : ownerProfile,
      },
      investors: investors.map((inv) => ({
        ...inv,
        asks_summary: cleanAsksForAI(inv.asks_summary),
      })),
    };

    const json = await callOpenRouter(
      GEMINI_STARTUP_FINDS_INVESTORS_INSTRUCTIONS,
      payload,
    );
    type CategoryScores = { sector_vertical?: number; stage_fit?: number; investment_thesis?: number; geographic_fit?: number };
    type InvestorRec = {
      investor_id: string;
      fit_score: number;
      summary: string;
      category_scores?: CategoryScores;
      rationale: Record<string, string>;
    };
    type InvestorRecsResult = { recommendations: InvestorRec[] };
    const result = JSON.parse(json) as InvestorRecsResult;

    if (!Array.isArray(result.recommendations)) {
      return NextResponse.json(
        { error: "Invalid Gemini response" },
        { status: 500 },
      );
    }

    const clampCS = (v: unknown) => typeof v === "number" ? Math.max(0, Math.min(100, Math.round(v))) : undefined;

    const validInvestorIds = new Set(investors.map((i) => i.id));
    const rows = result.recommendations
      .filter((r) => r.investor_id && validInvestorIds.has(r.investor_id))
      .slice(0, 5)
      .map((r) => {
        const cs = r.category_scores;
        const rationale = {
          ...(r.rationale ?? {}),
          ...(cs?.sector_vertical   != null ? { _cs_sector_vertical:   clampCS(cs.sector_vertical)   } : {}),
          ...(cs?.stage_fit         != null ? { _cs_stage_fit:         clampCS(cs.stage_fit)         } : {}),
          ...(cs?.investment_thesis != null ? { _cs_investment_thesis: clampCS(cs.investment_thesis) } : {}),
          ...(cs?.geographic_fit    != null ? { _cs_geographic_fit:    clampCS(cs.geographic_fit)    } : {}),
        };
        return {
          project_id: projectId,
          investor_profile_id: r.investor_id,
          fit_score: Math.max(0, Math.min(100, Math.round(Number(r.fit_score) || 0))),
          summary: String(r.summary || ""),
          rationale,
          generated_at: new Date().toISOString(),
        };
      });

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("project_match_scores")
        .upsert(rows, { onConflict: "project_id,investor_profile_id" });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 },
        );
      }
    }

    // Always return the full current set of scores for this project so the
    // client never ends up with an empty list when the AI produces no new rows.
    const { data: allScoreRows } = await admin
      .from("project_match_scores")
      .select("project_id, investor_profile_id, fit_score, summary, rationale, generated_at")
      .eq("project_id", projectId)
      .order("fit_score", { ascending: false });

    const investorMap = new Map(investors.map((i) => [i.id, i]));
    const scores = (allScoreRows ?? []).map((r) => {
      const inv = investorMap.get(r.investor_profile_id);
      return {
        ...r,
        investor_name: inv?.business_name || inv?.full_name || "Investor",
        investor_sector: inv?.sector,
      };
    });

    return NextResponse.json({ mode: "startup_finds_investors", scores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
