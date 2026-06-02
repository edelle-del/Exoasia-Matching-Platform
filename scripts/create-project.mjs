import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_STAGES = [
  "Ideation",
  "MVP",
  "Growth",
  "Scaling",
  "Revenue-Generating",
];

const SECTOR_OPTIONS = [
  "Advanced Manufacturing",
  "Aerospace & Defense",
  "Agtech",
  "Animal Health",
  "Brand & Retail",
  "Crypto & Digital Assets",
  "Deeptech",
  "Energy",
  "Enterprise & AI",
  "Fintech",
  "Food & Beverage",
  "GOAL",
  "Health",
  "Insurtech",
  "Lifetech",
  "Maritime",
  "Media & Advertising",
  "Medtech",
  "Mobility & Physical AI",
  "New Materials & Packaging",
  "Real Estate & Construction",
  "Semiconductors",
  "Smart Cities",
  "Sportstech",
  "Supply Chain",
  "Sustainability",
  "Travel & Hospitality",
];

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

function usage(exitCode = 1) {
  console.log(`
Usage:
  npm run create:project -- <owner_id> [name] [description]

Behavior:
  - If name and description are both omitted, AI generates both.
  - If only one is provided, AI uses it to generate the other.
  - venture_readiness_report is always left null.

Examples:
  npm run create:project -- 11111111-1111-1111-1111-111111111111
  npm run create:project -- 11111111-1111-1111-1111-111111111111 "SmartSupply PH"
  npm run create:project -- 11111111-1111-1111-1111-111111111111 "SmartSupply PH" "AI logistics platform for SMEs"
`);
  process.exit(exitCode);
}

function extractJson(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("OpenRouter returned an empty response.");
  if (trimmed.startsWith("{")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  throw new Error("OpenRouter output did not contain JSON.");
}

async function callOpenRouter(systemInstruction, payload) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Exoasia Project Seeder",
    },
    body: JSON.stringify({
      model: "openrouter/owl-alpha",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: JSON.stringify(payload) },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenRouter request failed: ${res.status} ${msg}`);
  }

  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  const content =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message ?? raw;
  const text = typeof content === "string" ? content : JSON.stringify(content);
  return JSON.parse(extractJson(text));
}

function splitText(value) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function normalizeGeneratedText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text.length > 0 ? text : fallback;
}

function normalizeChoice(value, choices, fallback) {
  if (typeof value !== "string") return fallback;
  const match = choices.find(
    (choice) => choice.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ?? fallback;
}

async function generateProjectFields({ ownerId, name, description }) {
  const hasName = !!name?.trim();
  const hasDescription = !!description?.trim();

  const systemInstruction = `
You generate realistic project seed data for an internal matching platform.
Return JSON only. Do not wrap in markdown.
Use concise, believable, professional language.
The output must be an object with these keys:
name, description, stage, sector

Rules:
- If the user provided name or description, preserve that value exactly.
- If name is missing, generate a strong project name.
- If description is missing, generate a concise description of 1 to 3 sentences.
- stage must be one of: ${PROJECT_STAGES.join(", ")}
- sector must be one of: ${SECTOR_OPTIONS.join(", ")}
- Choose a stage and sector that fit the project well.
- Avoid generic filler.
`;

  const prompt = {
    owner_id: ownerId,
    provided_name: hasName ? name.trim() : null,
    provided_description: hasDescription ? description.trim() : null,
    generate_missing_fields: {
      name: !hasName,
      description: !hasDescription,
    },
  };

  const result = await callOpenRouter(systemInstruction, prompt);

  const resolvedName = hasName
    ? name.trim()
    : normalizeGeneratedText(result.name, "New Project");
  const resolvedDescription = hasDescription
    ? description.trim()
    : normalizeGeneratedText(
        result.description,
        "A new venture project created for internal testing.",
      );
  const resolvedStage = normalizeChoice(
    result.stage,
    PROJECT_STAGES,
    "Ideation",
  );
  const resolvedSector = normalizeChoice(
    result.sector,
    SECTOR_OPTIONS,
    "Enterprise & AI",
  );

  return {
    name: resolvedName,
    description: resolvedDescription,
    stage: resolvedStage,
    sector: resolvedSector,
    venture_readiness_report: null,
  };
}

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const ownerId = process.argv[2];
  const providedName = process.argv[3] ?? "";
  const providedDescription = process.argv[4] ?? "";

  if (!ownerId) usage();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, business_name")
    .eq("id", ownerId)
    .single();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error(`No profile found for owner_id ${ownerId}`);
  }

  const projectFields = await generateProjectFields({
    ownerId,
    name: providedName,
    description: providedDescription,
  });

  const { data, error } = await admin
    .from("projects")
    .insert({
      owner_id: ownerId,
      name: projectFields.name,
      description: projectFields.description,
      stage: projectFields.stage,
      sector: projectFields.sector,
      venture_readiness_report: null,
    })
    .select("id, name, stage, sector")
    .single();

  if (error) throw error;

  console.log("Created project:");
  console.log(`id: ${data.id}`);
  console.log(`owner_id: ${ownerId}`);
  console.log(`name: ${data.name}`);
  console.log(`description: ${projectFields.description}`);
  console.log(`stage: ${data.stage}`);
  console.log(`sector: ${data.sector}`);
  console.log("venture_readiness_report: null");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
