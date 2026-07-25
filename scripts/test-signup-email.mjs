/**
 * Test script: simulate a brand-new signup email notification, then delete the user.
 * Usage: node scripts/test-signup-email.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// ── env ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    });
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── email ────────────────────────────────────────────────────────────────────

async function sendTestNotification(user) {
  if (!RESEND_API_KEY || RESEND_API_KEY === "re_your_api_key_here" || !ADMIN_NOTIFICATION_EMAIL) {
    console.warn("⚠  RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not set — skipping email send.");
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const signedUpAt = new Date(user.created_at).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[TEST] New signup: ${user.email}`,
    html: `
<body style="font-family:sans-serif;padding:24px">
  <h2 style="color:#0f172a">Test: New Member Signup</h2>
  <p><strong>Email:</strong> ${user.email}</p>
  <p><strong>Signed up:</strong> ${signedUpAt} (PHT)</p>
  <p><strong>User ID:</strong> ${user.id}</p>
  <p style="color:#64748b;font-size:12px">This is a test email from the signup-email test script.</p>
</body>`,
  });

  if (error) {
    console.error("✗  Resend error:", error);
  } else {
    console.log("✓  Email sent — Resend ID:", data?.id);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

const TEST_EMAIL = `test-signup-${Date.now()}@exoasia.local`;

async function main() {
  // 1. Create user (no profile, simulating brand-new signup)
  console.log(`\nCreating test user: ${TEST_EMAIL}`);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: "TestPass123!",
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error("✗  Failed to create user:", createError?.message);
    process.exit(1);
  }

  const user = created.user;
  console.log("✓  User created — ID:", user.id);

  // 2. Simulate the callback check: profile exists (from DB trigger) but full_name is null
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
  const isNewSignup = !profile?.full_name && accountAgeMs < 60 * 60 * 1000;

  console.log(`  profile.full_name: ${profile?.full_name ?? "null"}`);
  console.log(`  account age: ${Math.round(accountAgeMs / 1000)}s`);
  console.log(`  isNewSignup: ${isNewSignup}`);

  if (isNewSignup) {
    console.log("  → Notification email would fire.");
    await sendTestNotification(user);
  } else {
    console.log("  → Email would NOT fire (returning user or already onboarded).");
  }

  // 3. Delete user
  console.log("\nDeleting test user…");
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("✗  Failed to delete user:", deleteError.message);
    process.exit(1);
  }
  console.log("✓  User deleted — cleanup complete.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
