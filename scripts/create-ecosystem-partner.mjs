/**
 * Creates a test ecosystem_partner member account.
 *
 * Profile is fully populated to match what the onboarding form writes,
 * including the _v: 2 JSON blob in asks_summary for role-specific fields.
 *
 * Usage:
 *   node scripts/create-ecosystem-partner.mjs
 *
 * The account is pre-configured to align with the existing test pair:
 *   - Investor: Jonathan Reyes / Meridian Ventures (test.investor.match@exoasia.com)
 *   - Startup:  Camille Lim  / PayFlow Technologies (test.startup.match@exoasia.com)
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return;
      const eq = t.indexOf("=");
      if (eq <= 0) return;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}

loadEnv();

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Account details ──────────────────────────────────────────────────────────

const ACCOUNT = {
  email:    "test.ecosys.partner@exoasia.com",
  password: "MatchTest123!",
  profile: {
    full_name:        "Maria Santos",
    business_name:    "FinTech Philippines Network",
    role_title:       "Managing Director",
    sector:           "Financial Services",
    stage:            "3",
    short_bio:        "We accelerate early-stage Philippine fintech startups and connect them with institutional capital. Focused on B2B infrastructure, payments, and enterprise SaaS.",
    city:             "Makati City",
    linkedin_url:     "https://www.linkedin.com/in/maria-santos-ftph",
    how_heard_about:  "Referred by a member",
    referred_by:      "Jonathan Reyes",
    phone_whatsapp:   "+639171234003",
    years_in_operation: "3-5 years",
    employee_band:    "11-50",
    annual_revenue_estimate: "$100K – $350K",
    member_role:      "ecosystem_partner",
    verification_status: "verified",
    account_status:   "active",
    pdpa_matching_consent: true,
    ask_categories:   ["Investor Introductions", "Strategic Partnerships"],
    offer_categories: ["Deal Flow", "Portfolio Support", "Network Access"],
    asks_summary:     JSON.stringify({
      _v: 2,
      support_types: [
        "Mentorship / Advisory",
        "Business Development",
        "Industry Connections",
        "Corporate Partnerships",
      ],
      target_industries: ["Fintech", "B2B SaaS"],
      target_regions:    ["Asia Pacific"],
      target_stages:     ["Pre-seed", "Seed"],
      referrals: [
        { name: "Ramon Cruz",       contact: "ramon.cruz@fintech.ph" },
        { name: "Isabel Dela Cruz", contact: "linkedin.com/in/isabel-delacruz" },
        { name: "Alex Gomez",       contact: "+639189990003" },
      ],
    }),
    offers_summary:   "We offer curated deal flow from our accelerator cohorts, hands-on portfolio support, and access to our 200+ member network of founders, investors, and corporates.",
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nCreating ecosystem partner: ${ACCOUNT.email}`);

  // 1. Create or fetch auth user
  let user = null;

  const createResult = await admin.auth.admin.createUser({
    email:          ACCOUNT.email,
    password:       ACCOUNT.password,
    email_confirm:  true,
    user_metadata:  { account_status: "active", full_name: ACCOUNT.profile.full_name },
  });

  if (createResult.error) {
    if (!createResult.error.message.toLowerCase().includes("already")) {
      throw createResult.error;
    }
    console.log("  Auth user already exists — fetching…");
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw listErr;
    user = users.users.find((u) => u.email?.toLowerCase() === ACCOUNT.email.toLowerCase()) ?? null;
    if (!user) throw new Error("User already exists but could not be fetched.");
    await admin.auth.admin.updateUserById(user.id, {
      password:      ACCOUNT.password,
      user_metadata: { ...(user.user_metadata ?? {}), account_status: "active" },
    });
  } else {
    user = createResult.data.user;
  }

  if (!user) throw new Error("Unable to create or fetch user.");
  console.log(`  Auth user id: ${user.id}`);

  // 2. Upsert profile with ecosystem_partner member_role
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: ACCOUNT.email,
      ...ACCOUNT.profile,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  console.log("  Profile upserted.");

  // 3. Set RBAC role to 'member' (ecosystem_partner uses member RBAC + member_role field)
  const { error: roleError } = await admin.from("user_roles").upsert(
    { user_id: user.id, role: "member" },
    { onConflict: "user_id" },
  );
  if (roleError) throw roleError;
  console.log("  RBAC role set to 'member'.");

  // 4. Summary
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Ecosystem Partner test account ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Name:         ${ACCOUNT.profile.full_name}
  Organisation: ${ACCOUNT.profile.business_name}
  Email:        ${ACCOUNT.email}
  Password:     ${ACCOUNT.password}
  Member role:  ${ACCOUNT.profile.member_role}
  RBAC role:    member
  Stage:        ${ACCOUNT.profile.stage} (verified)
  User ID:      ${user.id}

  Profile fields set:
  ─────────────────────────────────────────────────────
  LinkedIn:     ${ACCOUNT.profile.linkedin_url}
  WhatsApp:     ${ACCOUNT.profile.phone_whatsapp}
  Years op:     ${ACCOUNT.profile.years_in_operation}
  Employees:    ${ACCOUNT.profile.employee_band}
  Revenue:      ${ACCOUNT.profile.annual_revenue_estimate}
  Heard about:  ${ACCOUNT.profile.how_heard_about} (via ${ACCOUNT.profile.referred_by})
  Support:      Mentorship, Biz Dev, Industry Connections, Corporate Partnerships
  Industries:   Fintech, B2B SaaS
  Regions:      Asia Pacific
  Stages:       Pre-seed, Seed

  Testing checklist:
  ─────────────────────────────────────────────────────
  [ ] Log in at /sign-in
  [ ] Visit /ecosystem — should load Portfolio Command Center
  [ ] Click "Nominate Startup" → invite test.startup.match@exoasia.com
  [ ] After startup exists in portfolio, view Co-Pilot Kanban
  [ ] Deep-dive into PayFlow — verify projects + match timeline
  [ ] Stale alerts appear after 7 days of match inactivity
  ─────────────────────────────────────────────────────
  Aligned with:
    Investor  → test.investor.match@exoasia.com  (Meridian Ventures)
    Startup   → test.startup.match@exoasia.com   (PayFlow Technologies)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
