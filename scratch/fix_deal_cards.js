import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: cards } = await supabase
    .from("deal_cards")
    .select("id, buyer_member_id, provider_member_id")
    .is("match_id", null);
    
  console.log(`Found ${cards?.length || 0} cards to fix.`);
  if (!cards || cards.length === 0) return;

  for (const card of cards) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, fit_score")
      .or(`and(member_a_id.eq.${card.buyer_member_id},member_b_id.eq.${card.provider_member_id}),and(member_a_id.eq.${card.provider_member_id},member_b_id.eq.${card.buyer_member_id})`)
      .limit(1);

    if (matches && matches.length > 0) {
      const match = matches[0];
      await supabase
        .from("deal_cards")
        .update({ match_id: match.id, fit_score: match.fit_score })
        .eq("id", card.id);
      console.log(`Updated card ${card.id} with match ${match.id}`);
    } else {
      console.log(`No match found for card ${card.id}`);
    }
  }
}

run().catch(console.error);
