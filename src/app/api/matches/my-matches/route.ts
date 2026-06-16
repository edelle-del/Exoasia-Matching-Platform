import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserMatches } from "@/lib/app-data";
import { hasPermanentUnlock } from "@/lib/quotas";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("member_role")
      .eq("id", user.id)
      .single();

    const role = profile?.member_role || "startup";

    // Define caps based on role
    let limit = 3; // Founder default
    if (role === "investor") limit = 10;
    if (role === "ecosystem_partner") limit = 5;

    // Fetch raw matches
    const rawMatches = await fetchUserMatches(supabase, user.id);

    // Enrich with sector and apply limits
    const cpIds = [...new Set(rawMatches.map((m) => (m.member_a_id === user.id ? m.member_b_id : m.member_a_id)))];
    let sectorMap = new Map<string, string | null>();
    let nameMap = new Map<string, string | null>();
    
    if (cpIds.length > 0) {
      const { data } = await supabase.from("profiles").select("id, sector, full_name, business_name").in("id", cpIds);
      sectorMap = new Map((data ?? []).map((p) => [p.id, p.sector ?? null]));
      nameMap = new Map((data ?? []).map((p) => [p.id, p.business_name || p.full_name || "Member"]));
    }

    // Process and mask matches if over limit
    const processedMatches = await Promise.all(
      rawMatches.map(async (m, index) => {
        const cpId = m.member_a_id === user.id ? m.member_b_id : m.member_a_id;
        const originalSector = sectorMap.get(cpId) ?? null;
        const originalName = nameMap.get(cpId) ?? null;
        
        let isLocked = false;
        let counterpart_sector = originalSector;
        let counterpart_name = originalName;
        let summary = m.summary;

        if (index >= limit) {
          const unlocked = await hasPermanentUnlock(user.id, "match", m.id);
          if (!unlocked) {
            isLocked = true;
            counterpart_sector = "Hidden Sector";
            counterpart_name = "Locked Match";
            summary = "This match summary is hidden. Unlock to view details.";
          }
        }

        return {
          ...m,
          counterpart_sector,
          counterpart_name,
          summary,
          is_locked: isLocked,
        };
      })
    );

    return NextResponse.json({ matches: processedMatches });
  } catch (error: any) {
    console.error("My Matches fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
