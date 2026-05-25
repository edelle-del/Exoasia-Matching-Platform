/**
 * Seeds portfolio_companies to link PayFlow (startup) to FinTech Philippines Network (partner).
 * Run once before testing the ecosystem partner flow.
 *
 * Usage:
 *   node scripts/seed-ecosystem-portfolio.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`User not found: ${email}`);
  return user;
}

async function main() {
  console.log("\nSeeding ecosystem portfolio…\n");

  const [partner, startup] = await Promise.all([
    findUserByEmail("test.ecosys.partner@exoasia.com"),
    findUserByEmail("test.startup.match@exoasia.com"),
  ]);

  console.log(`Partner:  ${partner.email}  (${partner.id})`);
  console.log(`Startup:  ${startup.email}  (${startup.id})\n`);

  const { error } = await admin.from("portfolio_companies").upsert(
    {
      partner_id:   partner.id,
      startup_id:   startup.id,
      status:       "active",
      notes:        "Seeded for testing — PayFlow Technologies cohort member",
    },
    { onConflict: "partner_id,startup_id" },
  );

  if (error) throw error;

  console.log("✓ portfolio_companies row upserted (active)");
  console.log("\nEcosystem partner can now:");
  console.log("  → /ecosystem        — view Portfolio Command Center with PayFlow");
  console.log("  → Co-Pilot Kanban   — track PayFlow's match pipeline");
  console.log("  → Deep-dive panel   — inspect PayFlow's projects and intro history\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
