import fs from "node:fs";
import path from "node:path";
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

loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertUser(email, password) {
  const result = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_status: "active" },
  });

  if (result.data?.user) return result.data.user;

  if (!result.error?.message?.toLowerCase().includes("already")) {
    throw result.error;
  }

  // Already exists — fetch and update password
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`User ${email} exists but could not be fetched.`);

  await admin.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: { ...existing.user_metadata, account_status: "active" },
  });
  return existing;
}

async function main() {
  const PASSWORD = "TestPass123!";

  // ── Account 1: Role selection pre-step ───────────────────────────────────────
  // No profile row → AuthGate sends them to /onboarding → step === "role"
  const EMAIL_1 = "test.onboarding.role@founders-arena.test";
  const user1 = await upsertUser(EMAIL_1, PASSWORD);
  console.log(`\n✓ Account 1 created: ${EMAIL_1}`);
  console.log(`  Password : ${PASSWORD}`);
  console.log(`  State    : No profile — will show the role selection screen at /onboarding`);

  // ── Account 2: Startup registration step ─────────────────────────────────────
  // Profile row has member_role = "startup" + all required basic fields filled.
  // On /onboarding the form loads pre-filled at "Step 1 of 2". One click on
  // "Save profile" advances the session to the startup registration step (Step 2).
  const EMAIL_2 = "test.startup.registration@founders-arena.test";
  const user2 = await upsertUser(EMAIL_2, PASSWORD);

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: user2.id,
      full_name: "Test Startup",
      business_name: "Test Startup Co.",
      role_title: "CEO & Co-Founder",
      city: "Manila",
      short_bio: "Building a fintech platform to serve underbanked communities in Southeast Asia.",
      linkedin_url: "https://linkedin.com/in/test-startup",
      how_heard_about: "Social Media",
      referred_by: null,
      phone_whatsapp: "+639171234567",
      years_in_operation: "1-3 years",
      sector: "Fintech",
      employee_band: "1-10",
      annual_revenue_estimate: "Under $20K",
      member_role: "startup",
      ask_categories: ["Funding / Investment capital"],
      offer_categories: ["Technology / Product"],
      asks_summary: null,
      pdpa_matching_consent: true,
      stage: "1",
      verification_status: "pending",
    },
    { onConflict: "id" },
  );

  if (profileErr) throw profileErr;

  console.log(`\n✓ Account 2 created: ${EMAIL_2}`);
  console.log(`  Password : ${PASSWORD}`);
  console.log(`  State    : Profile saved (member_role=startup, all fields filled)`);
  console.log(`  Action   : Sign in → go to /onboarding → click "Save profile" → reaches startup registration (Step 2 of 2)`);

  console.log(`\n──────────────────────────────────────────────────────`);
  console.log(`Both accounts confirmed, no email verification needed.`);
  console.log(`Sign in at /sign-in then navigate to /onboarding.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
