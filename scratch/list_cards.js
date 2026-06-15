import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: cards, error } = await supabase.from("deal_cards").select("id, match_id, stage");
  console.log("Cards:", cards);
}
run().catch(console.error);
