import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from("deal_cards").select("stage");
  console.log("DB Stages:", Array.from(new Set(data?.map(d => d.stage))));
}
run().catch(console.error);
