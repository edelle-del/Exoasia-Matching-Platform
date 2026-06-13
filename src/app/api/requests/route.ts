import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const userEmail = user.email?.toLowerCase() ?? "";

    // ── Cofounder invites received (pending + accepted) ──────────────────────
    const { data: rawInvites } = userEmail
      ? await admin
          .from("cofounder_invites")
          .select("id, inviter_id, project_id, uid_value, status, created_at, expires_at, updated_at")
          .eq("uid_value", userEmail)
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: false })
      : { data: [] };

    const inviterIds = [...new Set((rawInvites ?? []).map((i: { inviter_id: string }) => i.inviter_id))];
    const inviteProjectIds = [...new Set((rawInvites ?? []).filter((i: { project_id: string | null }) => i.project_id).map((i: { project_id: string | null }) => i.project_id as string))];

    const [{ data: inviterProfiles }, { data: inviteProjectRows }] = await Promise.all([
      inviterIds.length > 0
        ? admin.from("profiles").select("id, full_name, business_name, role_title, short_bio, sector, city").in("id", inviterIds)
        : Promise.resolve({ data: [] }),
      inviteProjectIds.length > 0
        ? admin.from("projects").select("id, name, stage, tagline").in("id", inviteProjectIds)
        : Promise.resolve({ data: [] }),
    ]);

    const inviterMap = new Map((inviterProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null; role_title: string | null; short_bio: string | null; sector: string | null; city: string | null }) => [p.id, p]));
    const inviteProjectMap = new Map((inviteProjectRows ?? []).map((p: { id: string; name: string; stage: string | null; tagline: string | null }) => [p.id, p]));

    type RawInvite = { id: string; inviter_id: string; project_id: string | null; uid_value: string; status: string; created_at: string; expires_at: string; updated_at: string };
    const allCofounderInvites = (rawInvites ?? []).map((inv: RawInvite) => ({
      id: inv.id,
      type: "cofounder_invite" as const,
      status: inv.status as "pending" | "accepted",
      inviter: inviterMap.get(inv.inviter_id) ?? null,
      project: inv.project_id ? (inviteProjectMap.get(inv.project_id) ?? null) : null,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      resolved_at: inv.updated_at,
    }));

    // ── Data room access requests (pending + approved) ───────────────────────
    const { data: rawDataRoomReqs } = await admin
      .from("data_room_access_requests")
      .select("id, requester_id, requester_email, message, status, created_at, updated_at")
      .eq("owner_id", user.id)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false });

    const requesterIds = [...new Set((rawDataRoomReqs ?? []).map((r: { requester_id: string }) => r.requester_id))];
    const { data: requesterProfiles } = requesterIds.length > 0
      ? await admin.from("profiles").select("id, full_name, business_name, role_title, sector, city").in("id", requesterIds)
      : { data: [] };
    const requesterMap = new Map((requesterProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null; role_title: string | null; sector: string | null; city: string | null }) => [p.id, p]));

    type RawDataRoomReq = { id: string; requester_id: string; requester_email: string | null; message: string | null; status: string; created_at: string; updated_at: string };
    const allDataRoomRequests = (rawDataRoomReqs ?? []).map((req: RawDataRoomReq) => ({
      id: req.id,
      type: "data_room_request" as const,
      status: req.status as "pending" | "approved",
      requester: requesterMap.get(req.requester_id) ?? null,
      requester_email: req.requester_email,
      message: req.message,
      created_at: req.created_at,
      resolved_at: req.updated_at,
    }));

    // ── Ecosystem partner collab invites (pending + active/accepted) ─────────
    const { data: rawCollabInvites } = await admin
      .from("portfolio_companies")
      .select("id, partner_id, nominated_at, status")
      .eq("startup_id", user.id)
      .in("status", ["pending", "active"])
      .order("nominated_at", { ascending: false });

    const partnerIds = [...new Set((rawCollabInvites ?? []).map((c: { partner_id: string }) => c.partner_id))];
    const { data: partnerProfiles } = partnerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name, role_title, short_bio, sector, city, ask_categories, offer_categories, linkedin_url")
          .in("id", partnerIds)
      : { data: [] };
    const partnerMap = new Map((partnerProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null; role_title: string | null; short_bio: string | null; sector: string | null; city: string | null; ask_categories: unknown; offer_categories: unknown; linkedin_url: string | null }) => [p.id, p]));

    type RawCollabInvite = { id: string; partner_id: string; nominated_at: string; status: string };
    const allCollabInvites = (rawCollabInvites ?? []).map((c: RawCollabInvite) => ({
      id: c.id,
      type: "collab_invite" as const,
      status: c.status as "pending" | "active",
      partner: partnerMap.get(c.partner_id) ?? null,
      created_at: c.nominated_at,
    }));

    // ── Connection requests (pending + accepted/introduced) ──────────────────
    const { data: rawMatches } = await supabase
      .from("matches")
      .select(`
        id,
        status,
        fit_score,
        created_at,
        updated_at,
        member_a_id,
        member_b_id,
        member_a_status,
        member_b_status,
        profile_a:profiles!matches_member_a_id_fkey(id, full_name, business_name, role_title, sector, city, member_role),
        profile_b:profiles!matches_member_b_id_fkey(id, full_name, business_name, role_title, sector, city, member_role)
      `)
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .in("status", ["pending", "approved", "accepted", "introduced"])
      .order("updated_at", { ascending: false })
      .limit(100);

    type MatchProfile = { id: string; full_name: string | null; business_name: string | null; role_title: string | null; sector: string | null; city: string | null; member_role: string | null };
    type RawMatch = {
      id: string; status: string; fit_score: number | null; created_at: string; updated_at: string;
      member_a_id: string; member_b_id: string; member_a_status: string | null; member_b_status: string | null;
      profile_a: MatchProfile[] | MatchProfile | null;
      profile_b: MatchProfile[] | MatchProfile | null;
    };

    const getProfile = (p: MatchProfile[] | MatchProfile | null): MatchProfile | null => {
      if (!p) return null;
      return Array.isArray(p) ? (p[0] ?? null) : p;
    };

    const allConnectionRequests = (rawMatches ?? [])
      .filter((m: RawMatch) => {
        const myStatus = m.member_a_id === user.id ? m.member_a_status : m.member_b_status;
        // Show matches where I was the responder (my status was pending) or both accepted
        return myStatus === "pending" || myStatus === "accepted";
      })
      .map((m: RawMatch) => {
        const isA = m.member_a_id === user.id;
        const myStatus = isA ? m.member_a_status : m.member_b_status;
        const counterpart = isA ? getProfile(m.profile_b) : getProfile(m.profile_a);
        const isAccepted = m.status === "accepted" || m.status === "introduced";
        return {
          id: m.id,
          type: "connection_request" as const,
          status: isAccepted ? "accepted" as const : myStatus === "accepted" ? "your_pending" as const : "pending" as const,
          match_status: m.status,
          counterpart,
          fit_score: m.fit_score,
          created_at: m.updated_at ?? m.created_at,
        };
      });

    // ── Investor: their own data room access requests (resolved) ────────────
    const { data: rawInvestorDRReqs } = await admin
      .from("data_room_access_requests")
      .select("id, owner_id, status, created_at, updated_at")
      .eq("requester_id", user.id)
      .in("status", ["approved", "denied"])
      .order("updated_at", { ascending: false });

    const drOwnerIds = [...new Set((rawInvestorDRReqs ?? []).map((r: { owner_id: string }) => r.owner_id))];
    const [{ data: drOwnerProfiles }, { data: drOwnerProjects }] = await Promise.all([
      drOwnerIds.length > 0
        ? admin.from("profiles").select("id, full_name, business_name").in("id", drOwnerIds)
        : Promise.resolve({ data: [] }),
      drOwnerIds.length > 0
        ? admin.from("projects").select("id, name, owner_id").in("owner_id", drOwnerIds).eq("is_active", true).limit(drOwnerIds.length)
        : Promise.resolve({ data: [] }),
    ]);

    const drOwnerMap = new Map((drOwnerProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]));
    const drProjectByOwner = new Map((drOwnerProjects ?? []).map((p: { id: string; name: string; owner_id: string }) => [p.owner_id, p]));

    type RawInvestorDRReq = { id: string; owner_id: string; status: string; created_at: string; updated_at: string | null };
    const investorDataRoomNotifications = (rawInvestorDRReqs ?? []).map((req: RawInvestorDRReq) => ({
      id: req.id,
      type: "investor_data_room_notification" as const,
      status: req.status as "approved" | "denied",
      startup: drOwnerMap.get(req.owner_id) ?? null,
      project: drProjectByOwner.get(req.owner_id) ?? null,
      created_at: req.updated_at ?? req.created_at,
    }));

    // ── Split into pending / accepted ────────────────────────────────────────
    const cofounderInvites        = allCofounderInvites.filter((i) => i.status === "pending");
    const acceptedCofounderInvites = allCofounderInvites.filter((i) => i.status === "accepted");

    const dataRoomRequests        = allDataRoomRequests.filter((r) => r.status === "pending");
    const acceptedDataRoomRequests = allDataRoomRequests.filter((r) => r.status === "approved");

    const collabInvites        = allCollabInvites.filter((i) => i.status === "pending");
    const acceptedCollabInvites = allCollabInvites.filter((i) => i.status === "active");

    const connectionRequests        = allConnectionRequests.filter((r) => r.status === "pending");
    const yourPendingConnectionRequests = allConnectionRequests.filter((r) => r.status === "your_pending");
    const acceptedConnectionRequests = allConnectionRequests.filter((r) => r.status === "accepted");

    const totalPending =
      cofounderInvites.length +
      dataRoomRequests.length +
      collabInvites.length +
      connectionRequests.length;

    const totalYourPending = yourPendingConnectionRequests.length;

    const totalAccepted =
      acceptedCofounderInvites.length +
      acceptedDataRoomRequests.length +
      acceptedCollabInvites.length +
      acceptedConnectionRequests.length;

    return NextResponse.json({
      // pending
      cofounderInvites,
      dataRoomRequests,
      collabInvites,
      connectionRequests,
      totalPending,
      // your pending
      yourPendingConnectionRequests,
      totalYourPending,
      // accepted
      acceptedCofounderInvites,
      acceptedDataRoomRequests,
      acceptedCollabInvites,
      acceptedConnectionRequests,
      totalAccepted,
      // investor-specific
      investorDataRoomNotifications,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
