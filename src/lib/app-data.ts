import type { SupabaseClient } from "@supabase/supabase-js";

export type AdvisorMemberListRecord = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  role_title: string | null;
  city: string | null;
  stage: string;
  verification_status: string;
  account_status: string;
  created_at: string;
};

export type AdvisorMemberDetailRecord = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  role_title: string | null;
  city: string | null;
  short_bio: string | null;
  sector: string | null;
  employee_band: string | null;
  annual_revenue_estimate: string | null;
  member_role: string | null;
  stage: string;
  verification_status: string;
  account_status: string;
  phone_whatsapp: string | null;
  years_in_operation: string | null;
  ask_categories: string[];
  offer_categories: string[];
  asks_summary: string | null;
  offers_summary: string | null;
  how_heard_about: string | null;
  referred_by: string | null;
  additional_notes: string | null;
  pdpa_matching_consent: boolean;
  created_at: string;
  updated_at: string;
};

export type MatchRecord = {
  id: string;
  member_a_id: string;
  member_b_id: string;
  fit_score: number | null;
  summary: string | null;
  status: "pending" | "approved" | "flagged" | "accepted" | "declined" | "introduced";
  member_a_status: "pending" | "accepted" | "declined";
  member_b_status: "pending" | "accepted" | "declined";
  created_at: string;
};

type MatchQueueMemberProfile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  stage: string;
  ask_categories: string[];
  offer_categories: string[];
  asks_summary: string | null;
  offers_summary: string | null;
};

export type AdvisorMatchQueueRecord = {
  id: string;
  fit_score: number | null;
  summary: string | null;
  status: string;
  member_a_status: string;
  member_b_status: string;
  created_at: string;
  member_a: MatchQueueMemberProfile | null;
  member_b: MatchQueueMemberProfile | null;
};

export type AdvisorIntroQueueRecord = {
  id: string;
  fit_score: number | null;
  summary: string | null;
  created_at: string;
  member_a: MatchQueueMemberProfile | null;
  member_b: MatchQueueMemberProfile | null;
};

export type AdvisorCompanyRecord = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  sector: string | null;
  stage: string | null;
  verification_status: string | null;
};

export type AdvisorMatchRecord = MatchRecord;

export async function fetchAdvisorDashboardData(supabase: SupabaseClient) {
  const [profilesResponse, matchesResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, business_name, full_name, sector, stage, verification_status",
      )
      .order("full_name", { ascending: true }),
    supabase
      .from("matches")
      .select(
        "id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at",
      )
      .in("status", ["pending", "approved", "flagged", "accepted", "declined", "introduced"])
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return {
    companies: (profilesResponse.data ?? []) as AdvisorCompanyRecord[],
    matches: (matchesResponse.data ?? []) as AdvisorMatchRecord[],
  };
}

export type DashboardProfile = {
  full_name: string | null;
  stage: string | null;
  verification_status: string | null;
  business_name: string | null;
  role_title: string | null;
  city: string | null;
  short_bio: string | null;
  sector: string | null;
  phone_whatsapp: string | null;
  ask_categories: string[] | null;
  offer_categories: string[] | null;
  asks_summary: string | null;
  offers_summary: string | null;
};

export type DashboardMatch = {
  id: string;
  member_a_id: string;
  member_b_id: string;
  fit_score: number | null;
  status: string;
  member_a_status: string;
  member_b_status: string;
  created_at: string;
  counterpart_name: string | null;
};

export async function fetchDashboardSummary(
  supabase: SupabaseClient,
  userId: string,
) {
  const [
    { count: pendingMatches },
    { count: dealCardCount },
    { count: acceptedMatchCount },
    { data: creditRows },
    { data: profile },
    { data: rawMatches },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`member_a_id.eq.${userId},member_b_id.eq.${userId}`)
      .in("status", ["pending", "approved"]),
    supabase
      .from("deal_cards")
      .select("id", { count: "exact", head: true })
      .or(`buyer_member_id.eq.${userId},provider_member_id.eq.${userId}`)
      .not("stage", "in", '("Closed-Won","Closed-Lost / On Hold")'),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`member_a_id.eq.${userId},member_b_id.eq.${userId}`)
      .in("status", ["accepted", "introduced"]),
    supabase
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", userId),
    supabase
      .from("profiles")
      .select(
        "full_name, stage, verification_status, business_name, role_title, city, short_bio, sector, phone_whatsapp, ask_categories, offer_categories, asks_summary, offers_summary",
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("matches")
      .select("id, member_a_id, member_b_id, fit_score, status, member_a_status, member_b_status, created_at")
      .or(`member_a_id.eq.${userId},member_b_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const credits = (creditRows ?? []).reduce(
    (sum, row) => sum + Number(row.change_amount ?? 0),
    0,
  );

  // Attach counterpart names to recent matches
  const matches = rawMatches ?? [];
  const counterpartIds = [...new Set(matches.map((m) =>
    m.member_a_id === userId ? m.member_b_id : m.member_a_id,
  ))];

  let counterpartById = new Map<string, string>();
  if (counterpartIds.length > 0) {
    const { data: peers } = await supabase
      .from("profiles")
      .select("id, business_name, full_name")
      .in("id", counterpartIds);
    counterpartById = new Map(
      (peers ?? []).map((p) => [p.id, p.business_name || p.full_name || "Verified member"]),
    );
  }

  const recentMatches: DashboardMatch[] = matches.map((m) => {
    const counterpartId = m.member_a_id === userId ? m.member_b_id : m.member_a_id;
    return { ...m, counterpart_name: counterpartById.get(counterpartId) ?? null };
  });

  // Sector average active deals
  let sectorAvgDeals = 0;
  if (profile?.sector) {
    const { data: sectorPeers } = await supabase
      .from("profiles")
      .select("id")
      .eq("sector", profile.sector)
      .neq("id", userId)
      .limit(200);

    if (sectorPeers && sectorPeers.length > 0) {
      const peerIds = sectorPeers.map((p) => p.id);
      const { count: sectorDeals } = await supabase
        .from("deal_cards")
        .select("id", { count: "exact", head: true })
        .in("buyer_member_id", peerIds)
        .not("stage", "in", '("Closed-Won / Pilot Go","Closed-Lost / On Hold")');
      sectorAvgDeals =
        Math.round(((sectorDeals ?? 0) / sectorPeers.length) * 10) / 10;
    }
  }

  return {
    pendingMatches: pendingMatches ?? 0,
    activeDeals: (dealCardCount ?? 0) + (acceptedMatchCount ?? 0),
    credits,
    profile: (profile ?? null) as DashboardProfile | null,
    recentMatches,
    sectorAvgDeals,
  };
}

export async function fetchAdvisorAcceptedByDay(
  supabase: SupabaseClient,
): Promise<{ value: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("matches")
    .select("created_at")
    .eq("status", "accepted")
    .gte("created_at", since.toISOString());

  const counts = new Array(7).fill(0);
  (data ?? []).forEach((row) => {
    const dayIndex = Math.floor(
      (new Date(row.created_at).getTime() - since.getTime()) / 86_400_000,
    );
    if (dayIndex >= 0 && dayIndex < 7) counts[dayIndex]++;
  });

  return counts.map((value) => ({ value }));
}

export async function fetchUserMatches(
  supabase: SupabaseClient,
  userId: string,
): Promise<Array<MatchRecord & { counterpart_name: string | null }>> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at",
    )
    .or(`member_a_id.eq.${userId},member_b_id.eq.${userId}`)
    .in("status", ["pending", "approved", "accepted", "introduced"])
    .order("created_at", { ascending: false });

  if (error || !matches) {
    return [];
  }

  const counterpartIds = Array.from(
    new Set(
      matches.map((row) =>
        row.member_a_id === userId ? row.member_b_id : row.member_a_id,
      ),
    ),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, business_name, full_name")
    .in("id", counterpartIds);

  const counterpartById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.business_name || p.full_name || "Verified member",
    ]),
  );

  return matches.map((row) => {
    const counterpartId =
      row.member_a_id === userId ? row.member_b_id : row.member_a_id;

    return {
      ...row,
      counterpart_name: counterpartById.get(counterpartId) ?? null,
    };
  });
}

export async function respondToMatch(
  supabase: SupabaseClient,
  userId: string,
  match: MatchRecord,
  decision: "accepted" | "declined",
) {
  const isMemberA = match.member_a_id === userId;
  const nextMemberAStatus = isMemberA ? decision : match.member_a_status;
  const nextMemberBStatus = isMemberA ? match.member_b_status : decision;

  // Default: keep the current status (preserves 'approved' while members are still responding)
  let nextStatus: MatchRecord["status"] = match.status;
  if (nextMemberAStatus === "declined" || nextMemberBStatus === "declined") {
    nextStatus = "declined";
  } else if (
    nextMemberAStatus === "accepted" &&
    nextMemberBStatus === "accepted"
  ) {
    nextStatus = "accepted";
  }

  const { error } = await supabase
    .from("matches")
    .update({
      member_a_status: nextMemberAStatus,
      member_b_status: nextMemberBStatus,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function fetchDealCards(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("deal_cards")
    .select(
      "id, title, stage, fit_score, confidence, impact_projection, next_action, next_action_due, blocker, close_reason_code, last_updated_at",
    )
    .or(`buyer_member_id.eq.${userId},provider_member_id.eq.${userId}`)
    .order("last_updated_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function touchDealCard(supabase: SupabaseClient, dealId: string) {
  const { error } = await supabase
    .from("deal_cards")
    .update({ last_updated_at: new Date().toISOString() })
    .eq("id", dealId);

  return { error: error?.message ?? null };
}

export async function fetchDocuments(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("member_documents")
    .select(
      "id, document_type, status, file_path, uploaded_at, reviewed_at, reviewed_by, reject_reason",
    )
    .eq("member_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function createPlaceholderDocument(
  supabase: SupabaseClient,
  userId: string,
  documentType: string,
) {
  const { error } = await supabase.from("member_documents").insert({
    member_id: userId,
    document_type: documentType,
    status: "submitted",
    file_path: `pending://${documentType}/${Date.now()}`,
  });

  return { error: error?.message ?? null };
}

export async function fetchEvents(supabase: SupabaseClient, userId: string) {
  const nowIso = new Date().toISOString();

  const [{ data: upcoming }, { data: past }, { data: registrations }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, type, starts_at, ends_at, location, max_attendees, description",
        )
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(20),
      supabase
        .from("events")
        .select("id, title, type, starts_at")
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false })
        .limit(10),
      supabase
        .from("event_registrations")
        .select("event_id, attended")
        .eq("member_id", userId),
    ]);

  const registrationMap = new Map(
    (registrations ?? []).map((row) => [row.event_id, row]),
  );

  return {
    upcoming: (upcoming ?? []).map((event) => ({
      ...event,
      registered: registrationMap.has(event.id),
      attended: registrationMap.get(event.id)?.attended ?? false,
    })),
    past: past ?? [],
  };
}

export async function registerForEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { error } = await supabase.from("event_registrations").upsert(
    {
      member_id: userId,
      event_id: eventId,
      registered_at: new Date().toISOString(),
      attended: false,
    },
    { onConflict: "event_id,member_id", ignoreDuplicates: false },
  );

  return { error: error?.message ?? null };
}

export async function markEventAttendance(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { error } = await supabase
    .from("event_registrations")
    .update({ attended: true, pitch_credit: 1 })
    .eq("event_id", eventId)
    .eq("member_id", userId);

  return { error: error?.message ?? null };
}

export async function fetchProfileAndSignals(
  supabase: SupabaseClient,
  userId: string,
) {
  const [{ data: profile }, { data: signals }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, role_title, city, short_bio, sector, employee_band, annual_revenue_estimate, stage, verification_status",
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("member_asks_offers")
      .select("id, kind, title, description, status")
      .eq("member_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile: profile ?? null,
    asks: (signals ?? []).filter((s) => s.kind === "ask"),
    offers: (signals ?? []).filter((s) => s.kind === "offer"),
  };
}

export async function createAskOffer(
  supabase: SupabaseClient,
  userId: string,
  kind: "ask" | "offer",
  payload: { title: string; description: string; status: string },
) {
  const { error } = await supabase.from("member_asks_offers").insert({
    member_id: userId,
    kind,
    title: payload.title,
    description: payload.description,
    status: payload.status,
  });

  return { error: error?.message ?? null };
}

export type ProjectRecord = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchUserProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProjectRecord[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, description, stage, sector, is_active, created_at, updated_at")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ProjectRecord[];
}

export async function deleteAskOffer(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("member_asks_offers")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}

export type AdvisorDocumentQueueRecord = {
  id: string;
  member_id: string;
  document_type: string;
  status: string;
  file_path: string;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reject_reason: string | null;
  member: {
    id: string;
    full_name: string | null;
    business_name: string | null;
    sector: string | null;
    stage: string;
    verification_status: string;
  } | null;
};

export async function fetchAdvisorDocumentQueue(supabase: SupabaseClient): Promise<{
  pending: AdvisorDocumentQueueRecord[];
  processed: AdvisorDocumentQueueRecord[];
}> {
  const { data: docs, error } = await supabase
    .from("member_documents")
    .select(
      "id, member_id, document_type, status, file_path, uploaded_at, reviewed_at, reviewed_by, reject_reason",
    )
    .order("uploaded_at", { ascending: true });

  if (error || !docs) return { pending: [], processed: [] };

  const memberIds = Array.from(new Set(docs.map((d) => d.member_id)));

  let profileMap = new Map<
    string,
    {
      id: string;
      full_name: string | null;
      business_name: string | null;
      sector: string | null;
      stage: string;
      verification_status: string;
    }
  >();

  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, sector, stage, verification_status",
      )
      .in("id", memberIds);

    profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  }

  const enriched = docs.map((doc) => ({
    ...doc,
    member: profileMap.get(doc.member_id) ?? null,
  })) as AdvisorDocumentQueueRecord[];

  return {
    pending: enriched.filter(
      (d) => d.status === "submitted" || d.status === "under-review",
    ),
    processed: enriched
      .filter((d) => d.status === "approved" || d.status === "rejected")
      .reverse(),
  };
}

export type CommunityMemberRecord = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  city: string | null;
  short_bio: string | null;
  stage: string;
  verification_status: string;
  account_status: string;
  member_role: string | null;
  ask_categories: string[];
  offer_categories: string[];
};

export async function fetchCommunityMembers(
  supabase: SupabaseClient,
): Promise<CommunityMemberRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, business_name, sector, city, short_bio, stage, verification_status, account_status, member_role, ask_categories, offer_categories",
    )
    .order("full_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as CommunityMemberRecord[];
}

export async function fetchAdvisorMemberList(
  supabase: SupabaseClient,
): Promise<AdvisorMemberListRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, business_name, sector, role_title, city, stage, verification_status, account_status, created_at",
    )
    .order("full_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as AdvisorMemberListRecord[];
}

export async function fetchAdvisorMemberDetail(
  supabase: SupabaseClient,
  memberId: string,
) {
  const [
    { data: profile },
    { data: signals },
    { data: matchRows },
    { data: documents },
    { data: credits },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, business_name, email, role_title, city, short_bio, sector, employee_band, annual_revenue_estimate, member_role, stage, verification_status, account_status, phone_whatsapp, years_in_operation, ask_categories, offer_categories, asks_summary, offers_summary, how_heard_about, referred_by, additional_notes, pdpa_matching_consent, created_at, updated_at",
      )
      .eq("id", memberId)
      .single(),
    supabase
      .from("member_asks_offers")
      .select("id, kind, title, description, status")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select(
        "id, member_a_id, member_b_id, fit_score, summary, status, created_at",
      )
      .or(`member_a_id.eq.${memberId},member_b_id.eq.${memberId}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("member_documents")
      .select(
        "id, document_type, status, file_path, uploaded_at, reject_reason",
      )
      .eq("member_id", memberId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ad_credit_ledger")
      .select("change_amount")
      .eq("member_id", memberId),
  ]);

  const creditBalance = (credits ?? []).reduce(
    (sum, row) => sum + Number(row.change_amount ?? 0),
    0,
  );

  const counterpartIds = Array.from(
    new Set(
      (matchRows ?? []).map((m) =>
        m.member_a_id === memberId ? m.member_b_id : m.member_a_id,
      ),
    ),
  );

  let counterpartNames = new Map<string, string>();
  if (counterpartIds.length > 0) {
    const { data: counterparts } = await supabase
      .from("profiles")
      .select("id, full_name, business_name")
      .in("id", counterpartIds);
    counterpartNames = new Map(
      (counterparts ?? []).map((p) => [
        p.id,
        p.business_name || p.full_name || "Verified member",
      ]),
    );
  }

  const matches = (matchRows ?? []).map((m) => {
    const counterpartId =
      m.member_a_id === memberId ? m.member_b_id : m.member_a_id;
    return {
      ...m,
      counterpart_id: counterpartId,
      counterpart_name: counterpartNames.get(counterpartId) ?? "Verified member",
    };
  });

  return {
    profile: profile as AdvisorMemberDetailRecord | null,
    asks: (signals ?? []).filter((s) => s.kind === "ask"),
    offers: (signals ?? []).filter((s) => s.kind === "offer"),
    matches,
    documents: documents ?? [],
    creditBalance,
  };
}

const MATCH_QUEUE_PROFILE_FIELDS =
  "id, full_name, business_name, sector, stage, ask_categories, offer_categories, asks_summary, offers_summary";

async function buildProfileMap(
  supabase: SupabaseClient,
  memberIds: string[],
): Promise<Map<string, MatchQueueMemberProfile>> {
  if (memberIds.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select(MATCH_QUEUE_PROFILE_FIELDS)
    .in("id", memberIds);
  return new Map((data ?? []).map((p) => [p.id, p as MatchQueueMemberProfile]));
}

export async function fetchAdvisorMatchQueue(
  supabase: SupabaseClient,
): Promise<AdvisorMatchQueueRecord[]> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, member_a_id, member_b_id, fit_score, summary, status, member_a_status, member_b_status, created_at",
    )
    .in("status", ["pending", "flagged"])
    .order("created_at", { ascending: false });

  if (error || !matches || matches.length === 0) return [];

  const memberIds = Array.from(
    new Set(matches.flatMap((m) => [m.member_a_id, m.member_b_id])),
  );
  const profileMap = await buildProfileMap(supabase, memberIds);

  return matches.map((m) => ({
    ...m,
    member_a: profileMap.get(m.member_a_id) ?? null,
    member_b: profileMap.get(m.member_b_id) ?? null,
  }));
}

export async function fetchAdvisorIntroductionQueue(
  supabase: SupabaseClient,
): Promise<AdvisorIntroQueueRecord[]> {
  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      "id, member_a_id, member_b_id, fit_score, summary, created_at",
    )
    .eq("status", "accepted")
    .order("created_at", { ascending: true });

  if (error || !matches || matches.length === 0) return [];

  const memberIds = Array.from(
    new Set(matches.flatMap((m) => [m.member_a_id, m.member_b_id])),
  );
  const profileMap = await buildProfileMap(supabase, memberIds);

  return matches.map((m) => ({
    ...m,
    member_a: profileMap.get(m.member_a_id) ?? null,
    member_b: profileMap.get(m.member_b_id) ?? null,
  }));
}
