import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GEMINI_INVESTOR_SCORES_PROJECT_INSTRUCTIONS,
  GEMINI_STARTUP_FINDS_INVESTORS_INSTRUCTIONS,
} from "@/lib/ai/geminiProjectMatchingInstructions";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

async function callGemini(systemInstruction: string, payload: unknown) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable.");

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${msg}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
  return extractJson(text);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
        "id, full_name, business_name, role_title, city, short_bio, sector, stage, member_role, ask_categories, offer_categories, asks_summary, offers_summary",
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
        .select("id, full_name, business_name, sector, stage, asks_summary, offers_summary")
        .eq("id", project.owner_id)
        .single();

      const payload = {
        investor: callerProfile,
        project: { ...project, owner: ownerProfile },
      };

      const json = await callGemini(GEMINI_INVESTOR_SCORES_PROJECT_INSTRUCTIONS, payload);
      type InvestorScoreResult = {
        project_id: string;
        fit_score: number;
        summary: string;
        rationale: Record<string, string>;
      };
      const result = JSON.parse(json) as InvestorScoreResult;

      const fitScore = Math.max(0, Math.min(100, Math.round(Number(result.fit_score) || 0)));

      const { error: upsertError } = await admin
        .from("project_match_scores")
        .upsert(
          {
            project_id: projectId,
            investor_profile_id: user.id,
            fit_score: fitScore,
            summary: String(result.summary || ""),
            rationale: result.rationale ?? {},
            generated_at: new Date().toISOString(),
          },
          { onConflict: "project_id,investor_profile_id" },
        );

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }

      return NextResponse.json({
        mode: "investor_scores_project",
        score: { project_id: projectId, fit_score: fitScore, summary: result.summary, rationale: result.rationale },
      });
    }

    // ── Startup finds matching investors for their project ─────────────────
    if (project.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: investors } = await admin
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, sector, stage, member_role, ask_categories, offer_categories, asks_summary, offers_summary",
      )
      .eq("member_role", "investor")
      .limit(50);

    if (!investors || investors.length === 0) {
      return NextResponse.json({ mode: "startup_finds_investors", scores: [] });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, sector, stage, asks_summary, offers_summary")
      .eq("id", user.id)
      .single();

    const payload = {
      project: { ...project, owner: ownerProfile },
      investors,
    };

    const json = await callGemini(GEMINI_STARTUP_FINDS_INVESTORS_INSTRUCTIONS, payload);
    type InvestorRec = {
      investor_id: string;
      fit_score: number;
      summary: string;
      rationale: Record<string, string>;
    };
    type InvestorRecsResult = { recommendations: InvestorRec[] };
    const result = JSON.parse(json) as InvestorRecsResult;

    if (!Array.isArray(result.recommendations)) {
      return NextResponse.json({ error: "Invalid Gemini response" }, { status: 500 });
    }

    const validInvestorIds = new Set(investors.map((i) => i.id));
    const rows = result.recommendations
      .filter((r) => r.investor_id && validInvestorIds.has(r.investor_id))
      .slice(0, 5)
      .map((r) => ({
        project_id: projectId,
        investor_profile_id: r.investor_id,
        fit_score: Math.max(0, Math.min(100, Math.round(Number(r.fit_score) || 0))),
        summary: String(r.summary || ""),
        rationale: r.rationale ?? {},
        generated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from("project_match_scores")
        .upsert(rows, { onConflict: "project_id,investor_profile_id" });

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    const investorMap = new Map(investors.map((i) => [i.id, i]));
    const scores = rows.map((r) => {
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
