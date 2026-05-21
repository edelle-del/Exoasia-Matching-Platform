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

const TEST_MEMBERS = [
  {
    email: "test.startup@exoasia.com",
    password: "TestMember123!",
    full_name: "Alex Rivera",
    business_name: "NovaTech Solutions",
    role_title: "Founder & CEO",
    sector: "Technology",
    city: "Manila",
    short_bio: "Building AI-powered logistics tools for Southeast Asian SMEs. Looking for strategic investors and distribution partners.",
    member_role: "startup",
    stage: "2",
    verification_status: "verified",
    ask_categories: ["Funding", "Distribution Partners", "Mentorship"],
    offer_categories: ["Tech Integration", "Market Access", "Product Development"],
    asks_summary: "Seeking Series A investors and logistics partners with regional distribution networks.",
    offers_summary: "Can offer AI/ML product development expertise and access to our existing SME customer base of 500+ businesses.",
  },
  {
    email: "test.investor@exoasia.com",
    password: "TestMember123!",
    full_name: "Maria Santos",
    business_name: "Visionary Capital",
    role_title: "Managing Partner",
    sector: "Finance",
    city: "Makati",
    short_bio: "Angel investor and startup mentor with 12 years in venture capital. Focused on fintech, logistics, and consumer tech.",
    member_role: "investor",
    stage: "3",
    verification_status: "verified",
    ask_categories: ["Deal Flow", "Co-investment Opportunities", "Market Research"],
    offer_categories: ["Funding", "Mentorship", "Network Access"],
    asks_summary: "Looking for high-growth startups in fintech and logistics with strong unit economics and a clear path to profitability.",
    offers_summary: "Offer seed to Series A funding (₱5M–₱50M), board advisory, and access to a network of 200+ founders and investors.",
  },
];

async function upsertMember(member) {
  const { email, password, full_name, ...profileFields } = member;

  // Create or fetch auth user
  let user = null;
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, account_status: "active" },
  });

  if (createResult.error) {
    if (!createResult.error.message.toLowerCase().includes("already")) {
      throw createResult.error;
    }
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (list.error) throw list.error;
    user = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (!user) throw new Error(`User ${email} exists but could not be fetched.`);
    await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { ...(user.user_metadata || {}), full_name, account_status: "active" },
    });
  } else {
    user = createResult.data.user;
  }

  if (!user) throw new Error(`Failed to create/fetch user for ${email}`);

  // Upsert profile
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name,
      account_status: "active",
      ...profileFields,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  // Upsert role
  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "member" }, { onConflict: "user_id" });
  if (roleError) throw roleError;

  console.log(`  ✓ ${email}  (${member.member_role}, Stage ${member.stage})`);
}

async function main() {
  console.log("Seeding test member accounts…\n");
  for (const member of TEST_MEMBERS) {
    await upsertMember(member);
  }
  console.log(`
─────────────────────────────────────────
Test logins
─────────────────────────────────────────
Startup member:
  Email:    test.startup@exoasia.com
  Password: TestMember123!

Investor member:
  Email:    test.investor@exoasia.com
  Password: TestMember123!
─────────────────────────────────────────
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
