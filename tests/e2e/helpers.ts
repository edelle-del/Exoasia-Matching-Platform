import fs from "fs";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createOrResetTestUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const createResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Test", account_status: "active" },
  });

  if (!createResult.error) {
    const userId = createResult.data.user.id;
    // Ensure member role exists so AuthGate doesn't block
    await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "member" }, { onConflict: "user_id" });
    return userId;
  }

  if (!createResult.error.message.toLowerCase().includes("already")) {
    throw createResult.error;
  }

  // User already exists — find it and reset onboarding state
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`User ${email} exists but could not be fetched`);

  await admin.auth.admin.updateUserById(user.id, {
    password,
    user_metadata: { full_name: "E2E Test", account_status: "active" },
  });

  // Clear member_role so the onboarding flow starts from step 1 (role selection)
  await admin.from("profiles").update({ member_role: null }).eq("id", user.id);

  // Delete any projects created during a previous test run
  await admin.from("projects").delete().eq("owner_id", user.id);

  return user.id;
}

export async function deleteTestUser(admin: SupabaseClient, userId: string) {
  await admin.from("projects").delete().eq("owner_id", userId);
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
}
