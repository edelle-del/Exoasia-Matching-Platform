import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  console.log("Checking background_jobs...");
  const { data, error } = await admin.from("background_jobs").select("*").limit(1);
  console.log("Result:", { data, error });
}

check();
