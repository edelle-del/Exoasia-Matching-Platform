import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateGeminiMatches } from "@/lib/ai/gemini";
import { getRoleFromAccessToken } from "@/lib/auth/jwt";

type CandidateSignal = {
  member_id: string;
  kind: string;
  title: string;
  description: string;
  status: string;
};

function canonicalPair(memberAId: string, memberBId: string) {
  return memberAId < memberBId
    ? { member_a_id: memberAId, member_b_id: memberBId }
    : { member_a_id: memberBId, member_b_id: memberAId };
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block advisors from using the AI matching generation endpoint
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? null;
    const tokenRole = getRoleFromAccessToken(accessToken);
    if (tokenRole && ["advisor", "admin"].includes(tokenRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: subjectProfile, error: subjectError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, short_bio, how_heard_about, referred_by, phone_whatsapp, years_in_operation, sector, employee_band, annual_revenue_estimate, ask_categories, offer_categories, asks_summary, offers_summary, additional_notes, stage, verification_status",
      )
      .eq("id", user.id)
      .single();

    if (subjectError || !subjectProfile) {
      return NextResponse.json(
        { error: `Unable to load subject profile. ${subjectError?.message}` },
        { status: 400 },
      );
    }

    const { data: subjectSignals } = await supabase
      .from("member_asks_offers")
      .select("member_id, kind, title, description, status")
      .eq("member_id", user.id)
      .limit(20);

    const { data: candidateProfiles } = await supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, short_bio, how_heard_about, referred_by, phone_whatsapp, years_in_operation, sector, employee_band, annual_revenue_estimate, ask_categories, offer_categories, asks_summary, offers_summary, additional_notes, stage, verification_status",
      )
      .neq("id", user.id)
      .in("verification_status", ["pending", "verified"])
      .limit(50);

    const candidateIds = (candidateProfiles ?? []).map((profile) => profile.id);

    let signalsByMember = new Map<string, CandidateSignal[]>();
    if (candidateIds.length > 0) {
      const { data: candidateSignals } = await supabase
        .from("member_asks_offers")
        .select("member_id, kind, title, description, status")
        .in("member_id", candidateIds)
        .limit(400);

      signalsByMember = (candidateSignals ?? []).reduce((map, signal) => {
        const arr = map.get(signal.member_id) ?? [];
        arr.push(signal as CandidateSignal);
        map.set(signal.member_id, arr);
        return map;
      }, new Map<string, CandidateSignal[]>());
    }

    const allRelevantIds = Array.from(new Set([user.id, ...candidateIds]));
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("member_a_id, member_b_id")
      .or(
        `member_a_id.in.(${allRelevantIds.join(",")}),member_b_id.in.(${allRelevantIds.join(",")})`,
      );

    const existingPairKeys = new Set(
      (existingMatches ?? []).map((match) => {
        const pair = canonicalPair(match.member_a_id, match.member_b_id);
        return `${pair.member_a_id}:${pair.member_b_id}`;
      }),
    );

    const payload = {
      subject: {
        ...subjectProfile,
        asks_offers: subjectSignals ?? [],
      },
      candidates: (candidateProfiles ?? []).map((profile) => ({
        ...profile,
        asks_offers: signalsByMember.get(profile.id) ?? [],
      })),
    };

    console.log("Payload for Gemini:", JSON.stringify(payload, null, 2));
    const recommendations = await generateGeminiMatches(payload);

    const admin = createAdminClient();

    await admin
      .from("matches")
      .delete()
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .in("status", ["pending", "approved"]);
    console.log("Recommendations from Gemini:", recommendations);
    const rows = recommendations
      .map((rec) => {
        const pair = canonicalPair(user.id, rec.counterpart_id);
        return {
          ...pair,
          fit_score: rec.fit_score,
          summary: rec.summary,
          rationale: rec.rationale,
          status: "approved",
          member_a_status: "pending",
          member_b_status: "pending",
        };
      })
      .filter(
        (row) => !existingPairKeys.has(`${row.member_a_id}:${row.member_b_id}`),
      );

    if (rows.length > 0) {
      const { error: insertError } = await admin
        .from("matches")
        .insert(rows);
      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      generated: rows.length,
      recommendations,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
