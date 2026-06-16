import { GEMINI_MATCHING_SYSTEM_INSTRUCTIONS } from "@/lib/ai/geminiMatchingInstructions";

type MatchingPayload = {
  subject: Record<string, unknown>;
  candidates: Array<Record<string, unknown>>;
};

type GeminiRecommendation = {
  counterpart_id: string;
  fit_score: number;
  summary: string;
  rationale: Record<string, string>;
};

type GeminiResponse = {
  recommendations: GeminiRecommendation[];
};

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Gemini output did not contain JSON.");
}

export async function generateGeminiMatches(payload: MatchingPayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: GEMINI_MATCHING_SYSTEM_INSTRUCTIONS }],
      },
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify(payload),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n") ?? "";

  const json = extractJson(text);
  const parsed = JSON.parse(json) as GeminiResponse;

  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("Gemini response missing recommendations array.");
  }

  return parsed.recommendations
    .filter((rec) => !!rec.counterpart_id)
    .slice(0, 5)
    .map((rec) => ({
      counterpart_id: rec.counterpart_id,
      fit_score: Math.max(
        0,
        Math.min(100, Math.round(Number(rec.fit_score) || 0)),
      ),
      summary: String(rec.summary || "Strategic compatibility"),
      rationale: rec.rationale ?? {},
    }));
}
