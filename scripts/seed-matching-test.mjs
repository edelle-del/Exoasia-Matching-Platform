/**
 * Seed two test accounts for rigorous matching pipeline testing.
 *
 * Investor — Jonathan Reyes / Meridian Ventures
 *   Thesis: B2B fintech & enterprise SaaS, pre-Series A, Philippines/SEA
 *
 * Startup  — Camille Lim / PayFlow Technologies
 *   Project: API-first B2B payment infrastructure for Philippine SMEs
 *   (designed to score 85+ against the investor above)
 *
 * Usage:
 *   node scripts/seed-matching-test.mjs
 */

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

// ─── Account definitions ──────────────────────────────────────────────────────

const INVESTOR = {
  email: "test.investor.match@exoasia.com",
  password: "MatchTest123!",
  profile: {
    full_name: "Jonathan Reyes",
    business_name: "Meridian Ventures",
    role_title: "General Partner",
    city: "Makati",
    sector: "Financial Technology",
    short_bio:
      "General Partner at Meridian Ventures ($30M AUM) focused on B2B fintech and enterprise SaaS in Southeast Asia. Previously led corporate venture at BDO Unibank. 14 portfolio companies across PH, ID, and VN — 3 exits.",
    member_role: "investor",
    stage: "3",
    verification_status: "verified",
    account_status: "active",
    pdpa_matching_consent: true,
    ask_categories: ["Deal Flow", "Co-investment Opportunities", "Due Diligence Support"],
    offer_categories: ["Funding", "Enterprise Introductions", "Board Advisory", "Regulatory Guidance"],
    asks_summary:
      "Seeking pre-Series A B2B fintech and enterprise SaaS startups in Southeast Asia with $10K+ MRR, strong unit economics, and founding teams with domain expertise. Ticket: $500K–$3M USD.",
    offers_summary:
      "Pre-Series A equity investment ($500K–$3M), board seat, warm introductions to BDO, Metrobank, and SM Group as enterprise clients, and hands-on BSP regulatory compliance support.",
    primary_goal: "Find high-growth pre-Series A B2B fintech deals in the Philippines",
    open_to_new_business_conversations: "Yes",
  },
};

const STARTUP = {
  email: "test.startup.match@exoasia.com",
  password: "MatchTest123!",
  profile: {
    full_name: "Camille Lim",
    business_name: "PayFlow Technologies",
    role_title: "Co-Founder & CEO",
    city: "Taguig",
    sector: "Financial Technology",
    short_bio:
      "Co-founder of PayFlow Technologies. Ex-GCash product manager with 7 years in fintech. Building embedded payment infrastructure for Philippine SMEs — 200+ active clients, ₱50M/month TPV, 94% MoM retention.",
    member_role: "startup",
    stage: "2",
    verification_status: "verified",
    account_status: "active",
    pdpa_matching_consent: true,
    ask_categories: ["Funding", "Enterprise Partnerships", "Regulatory Guidance"],
    offer_categories: ["Fintech API Access", "SME Distribution Network", "Payment Infrastructure"],
    asks_summary:
      "Raising ₱15M pre-Series A to expand our B2B payment API to 3 new cities and onboard 2 additional bank partners. Seeking investors with Philippine banking relationships and BSP regulatory experience.",
    offers_summary:
      "API-first embedded payments for SMEs. ₱50M/month TPV across 200 clients, 94% retention. We offer integration partnerships, co-selling through our SME distribution network, and white-label checkout SDK licensing.",
    primary_goal: "Raise pre-Series A funding and secure enterprise bank partnerships",
    open_to_new_business_conversations: "Yes",
  },
  project: {
    name: "PayFlow — B2B Payment Infrastructure for Philippine SMEs",
    description:
      "PayFlow is an API-first B2B payment infrastructure platform enabling Philippine SMEs to accept, send, and reconcile digital payments in real time.\n\n" +
      "Traction: 200+ active SME clients · ₱50M/month total payment volume · 94% month-over-month retention · ₱2.1M ARR\n\n" +
      "Technology: Multi-bank API integration (UnionBank, BDO, Metrobank), automated reconciliation engine, real-time webhook notifications, white-label checkout SDK. BSP-registered payment system operator; EMI license application in progress.\n\n" +
      "Raise: ₱15M pre-Series A. Use of funds — 50% product & engineering (API expansion, fraud tooling), 30% sales & marketing (Cebu, Davao, Iloilo expansion), 20% regulatory compliance (EMI license, AML systems).\n\n" +
      "Why now: BSP's open finance framework mandates bank API interoperability by Q3 2026, creating a step-function increase in addressable SME demand. We are positioned as the middleware layer.",
    stage: "Pre-Series A",
    sector: "Financial Technology",
    is_active: true,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertUser(email, password, fullName) {
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, account_status: "active" },
  });

  if (!createResult.error) return createResult.data.user;

  if (!createResult.error.message.toLowerCase().includes("already")) {
    throw createResult.error;
  }

  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  const existing = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error(`User ${email} exists but could not be fetched`);

  await admin.auth.admin.updateUserById(existing.id, {
    password,
    user_metadata: { ...(existing.user_metadata ?? {}), full_name: fullName, account_status: "active" },
  });

  return existing;
}

async function seedAccount({ email, password, profile, project }) {
  const user = await upsertUser(email, password, profile.full_name);

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: user.id, email, ...profile }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "member" }, { onConflict: "user_id" });
  if (roleError) throw roleError;

  let projectId = null;
  if (project) {
    // Check for existing project by name to make this idempotent
    const { data: existing } = await admin
      .from("projects")
      .select("id")
      .eq("owner_id", user.id)
      .eq("name", project.name)
      .maybeSingle();

    if (existing) {
      projectId = existing.id;
      const { error: updateErr } = await admin
        .from("projects")
        .update({ ...project, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
    } else {
      const { data: inserted, error: insertErr } = await admin
        .from("projects")
        .insert({ owner_id: user.id, ...project })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      projectId = inserted.id;
    }
  }

  return { userId: user.id, projectId };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding matching test accounts…\n");

  const { userId: investorId } = await seedAccount(INVESTOR);
  console.log(`  ✓ Investor  ${INVESTOR.email}  (id: ${investorId})`);

  const { userId: startupId, projectId } = await seedAccount(STARTUP);
  console.log(`  ✓ Startup   ${STARTUP.email}  (id: ${startupId})`);
  console.log(`  ✓ Project   "${STARTUP.project.name}"  (id: ${projectId})`);

  console.log(`
─────────────────────────────────────────────────────
Test accounts — matching pipeline
─────────────────────────────────────────────────────

Investor  (Jonathan Reyes / Meridian Ventures)
  Email:    ${INVESTOR.email}
  Password: ${INVESTOR.password}
  Thesis:   B2B fintech & enterprise SaaS, pre-Series A, PH/SEA
  Tests:    Projects page → "Score this project" → Express Interest

Startup   (Camille Lim / PayFlow Technologies)
  Email:    ${STARTUP.email}
  Password: ${STARTUP.password}
  Project:  "${STARTUP.project.name}"
  Tests:    Projects page → "Find investors" → Request Intro
            Your Pipeline → Accept / Decline incoming intros

Expected fit score: 85–95 (this pair is intentionally well-aligned)

Testing checklist:
  1. Log in as startup → Projects → "Find investors" on PayFlow project
  2. Log in as investor → Projects → "Score this project" on PayFlow
  3. Startup requests intro with the investor (Your Pipeline)
  4. Log in as investor → Your Pipeline → Accept/Decline the pending intro
  5. Swap: investor expresses interest → startup responds
─────────────────────────────────────────────────────
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
