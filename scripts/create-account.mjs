import fs from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
  npm run create:account -- <email> [password] [first_name] [last_name] [role] [member_role]
  npm run create:account -- random <role> <member_role>
  npm run create:account -- --random --role=member --member-role=investor

Roles:
  member | advisor | staff | admin

Member roles:
  investor | startup | ecopart | ecosystem_partner

Examples:
  npm run create:account -- random member investor
  npm run create:account -- test.member@exoasia.local Sample123! Test Member advisor
  npm run create:account -- test.startup@exoasia.local ChangeMe123! Camille Lim member startup
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const named = new Map();
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    const key = (eq >= 0 ? raw.slice(0, eq) : raw).trim();
    const value = eq >= 0 ? raw.slice(eq + 1) : "true";
    named.set(key, value);
  }

  const flag = (name) => {
    const value = named.get(name);
    if (value === undefined) return undefined;
    return ["1", "true", "yes", "random"].includes(value.toLowerCase());
  };

  return { named, positional, flag };
}

function normalizeRole(role) {
  const normalized = (role || "member").toLowerCase();
  if (!["member", "advisor", "staff", "admin"].includes(normalized)) {
    throw new Error("Role must be one of: member, advisor, staff, admin");
  }
  return normalized;
}

function normalizeMemberRole(memberRole) {
  const normalized = (memberRole || "").toLowerCase().trim();
  if (!normalized) return null;
  if (["investor", "startup", "ecosystem_partner"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "ecopart") return "ecosystem_partner";
  throw new Error(
    "member_role must be one of: investor, startup, ecopart, ecosystem_partner",
  );
}

function deriveStage(role, memberRole) {
  if (role !== "member") return "1";
  if (memberRole === "startup") return "2";
  if (memberRole === "investor" || memberRole === "ecosystem_partner")
    return "3";
  return "1";
}

function deriveVerification(role) {
  return role === "member" ? "verified" : "verified";
}

function buildManualProfile({ email, fullName, role, memberRole }) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const businessName = role === "member" ? `${fullName} Ventures` : null;
  return {
    email,
    full_name: fullName,
    business_name: businessName,
    role_title:
      role === "member"
        ? `${firstName} ${memberRole ? memberRole.replace(/_/g, " ") : "Member"}`.trim()
        : role,
    city: null,
    short_bio: null,
    sector: null,
    employee_band: null,
    annual_revenue_estimate: null,
    how_heard_about: null,
    referred_by: null,
    phone_whatsapp: null,
    years_in_operation: null,
    ask_categories: [],
    offer_categories: [],
    open_to_new_business_conversations: null,
    primary_goal: null,
    attend_monthly_dinner: null,
    pdpa_matching_consent: false,
    additional_notes: null,
    asks_summary: null,
    offers_summary: null,
    member_role: memberRole,
    paid_project_slots: 0,
    linkedin_url: null,
    venture_readiness_report: null,
    subscription_plan: null,
    subscription_ends_at: null,
    stage: deriveStage(role, memberRole),
    verification_status: deriveVerification(role),
    account_status: "active",
  };
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
  if (!apiKey)
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Exoasia Test Account Seeder",
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

async function generateRandomProfile({ email, role, memberRole }) {
  const systemInstruction = `
You generate realistic test profile data for a private matching platform.
Return JSON only. Do not wrap in markdown.
Use concise but believable values that fit the requested role.
The output must be an object with these keys:
full_name, business_name, role_title, city, short_bio, sector, employee_band,
annual_revenue_estimate, how_heard_about, referred_by, phone_whatsapp,
years_in_operation, ask_categories, offer_categories,
open_to_new_business_conversations, primary_goal, attend_monthly_dinner,
additional_notes, asks_summary, offers_summary, linkedin_url

Rules:
- ask_categories and offer_categories must be arrays of 3 to 5 short strings.
- short_bio and summaries should be 1 to 2 sentences.
- open_to_new_business_conversations and attend_monthly_dinner should be short strings or null.
- Use a Philippine-context business profile.
- Keep the content safe, professional, and suitable for internal test data.
`;

  const result = await callOpenRouter(systemInstruction, {
    email,
    role,
    member_role: memberRole,
  });

  return {
    email,
    full_name: result.full_name ?? `Test ${role}`,
    business_name: result.business_name ?? null,
    role_title: result.role_title ?? null,
    city: result.city ?? null,
    short_bio: result.short_bio ?? null,
    sector: result.sector ?? null,
    employee_band: result.employee_band ?? null,
    annual_revenue_estimate: result.annual_revenue_estimate ?? null,
    how_heard_about: result.how_heard_about ?? null,
    referred_by: result.referred_by ?? null,
    phone_whatsapp: result.phone_whatsapp ?? null,
    years_in_operation: result.years_in_operation ?? null,
    ask_categories: Array.isArray(result.ask_categories)
      ? result.ask_categories
      : [],
    offer_categories: Array.isArray(result.offer_categories)
      ? result.offer_categories
      : [],
    open_to_new_business_conversations:
      result.open_to_new_business_conversations ?? null,
    primary_goal: result.primary_goal ?? null,
    attend_monthly_dinner: result.attend_monthly_dinner ?? null,
    pdpa_matching_consent: true,
    additional_notes: result.additional_notes ?? null,
    asks_summary: result.asks_summary ?? null,
    offers_summary: result.offers_summary ?? null,
    member_role: memberRole,
    paid_project_slots: 0,
    linkedin_url: result.linkedin_url ?? null,
    venture_readiness_report: null,
    subscription_plan: null,
    subscription_ends_at: null,
    stage: deriveStage(role, memberRole),
    verification_status: deriveVerification(role),
    account_status: "active",
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

async function findOrCreateUser({ email, password, fullName }) {
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName ?? null,
      account_status: "active",
    },
  });

  let user = createResult.data?.user ?? null;

  if (createResult.error) {
    if (!createResult.error.message.toLowerCase().includes("already")) {
      throw createResult.error;
    }

    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) throw users.error;
    user =
      users.data.users.find(
        (item) => item.email?.toLowerCase() === email.toLowerCase(),
      ) ?? null;

    if (!user) throw new Error("User already exists but could not be fetched.");

    await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: {
        ...(user.user_metadata || {}),
        full_name: fullName ?? user.user_metadata?.full_name ?? null,
        account_status: "active",
      },
    });
  }

  if (!user) throw new Error("Unable to create or fetch user.");
  return user;
}

async function upsertProfile(userId, profile) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      ...profile,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function upsertRole(userId, role) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) throw error;
}

async function main() {
  const argv = process.argv.slice(2);
  const { named, positional, flag } = parseArgs(argv);

  const randomFromFlag =
    flag("random") ?? flag("is-random") ?? flag("is_random");
  const randomFromPositional = ["random", "true", "1", "yes"].includes(
    (positional[0] || "").toLowerCase(),
  );
  const isRandom = randomFromFlag ?? randomFromPositional;

  const positionalOffset = isRandom && randomFromPositional ? 1 : 0;

  const roleInput =
    named.get("role") ??
    positional[positionalOffset + (isRandom ? 0 : 4)] ??
    "member";
  const role = normalizeRole(roleInput);

  const memberRoleInput =
    named.get("member-role") ??
    named.get("member_role") ??
    positional[positionalOffset + (isRandom ? 1 : 5)] ??
    null;
  const memberRole = normalizeMemberRole(memberRoleInput);

  const emailInput = named.get("email") ?? positional[0];
  const passwordInput = named.get("password") ?? positional[1];
  const firstName =
    named.get("first-name") ?? named.get("first_name") ?? positional[2] ?? "";
  const lastName =
    named.get("last-name") ?? named.get("last_name") ?? positional[3] ?? "";

  let email;
  let password;
  let profile;
  let fullName;

  if (isRandom) {
    if (!["member", "advisor", "staff", "admin"].includes(role)) {
      usage();
    }

    email = `test${randomInt(100000, 999999)}@exoasia.local`;
    password = "Sample123!";

    profile = await generateRandomProfile({ email, role, memberRole });
    fullName = profile.full_name;
  } else {
    if (!emailInput || !emailInput.includes("@")) {
      usage();
    }

    email = emailInput;
    password = passwordInput || "ChangeMe123!";
    fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) {
      const localPart = email.split("@")[0];
      fullName =
        localPart
          .split(/[._-]/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") || email;
    }
    profile = buildManualProfile({ email, fullName, role, memberRole });
  }

  const user = await findOrCreateUser({ email, password, fullName });
  await upsertProfile(user.id, profile);
  await upsertRole(user.id, role);

  console.log(`Created/updated user: ${email}`);
  console.log(`role: ${role}`);
  if (memberRole) console.log(`member_role: ${memberRole}`);
  console.log(`id: ${user.id}`);
  console.log(`password: ${password}`);
  if (isRandom) {
    console.log("random profile: AI-generated via OpenRouter");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
