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

    // ── 1. Matches (both sides) ──────────────────────────────────────────────
    const { data: matches } = await supabase
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
        profile_a:profiles!matches_member_a_id_fkey(full_name, business_name),
        profile_b:profiles!matches_member_b_id_fkey(full_name, business_name)
      `)
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(50);

    // ── 2. New members (last 30 days) ────────────────────────────────────────
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newMembers } = await admin
      .from("profiles")
      .select("id, full_name, business_name, member_role, created_at")
      .neq("id", user.id)
      .not("full_name", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    // ── 3. Cofounder invites SENT by this user ───────────────────────────────
    const { data: sentInvites } = await supabase
      .from("cofounder_invites")
      .select("id, uid_value, status, created_at, updated_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // ── 4. Cofounder invites RECEIVED by this user ───────────────────────────
    const userEmail = user.email?.toLowerCase() ?? "";
    const { data: receivedInvites } = userEmail
      ? await admin
          .from("cofounder_invites")
          .select("id, inviter_id, project_id, status, created_at, updated_at")
          .eq("uid_value", userEmail)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] };

    // Fetch inviter profiles for received invites
    const inviterIds = [...new Set((receivedInvites ?? []).map((i: { inviter_id: string }) => i.inviter_id))];
    const { data: inviterProfiles } = inviterIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", inviterIds)
      : { data: [] };
    const inviterMap = new Map((inviterProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]));

    // ── 5. Data room access requests received (user is the data room owner) ──
    const { data: dataRoomRequests } = await admin
      .from("data_room_access_requests")
      .select("id, requester_id, requester_email, status, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch requester profiles
    const requesterIds = [...new Set((dataRoomRequests ?? []).map((r: { requester_id: string }) => r.requester_id))];
    const { data: requesterProfiles } = requesterIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", requesterIds)
      : { data: [] };
    const requesterMap = new Map((requesterProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]));

    // ── 6. Portfolio nominations received (user's startup was nominated) ──────
    const { data: portfolioNominations } = await admin
      .from("portfolio_companies")
      .select("id, partner_id, nominated_at, status")
      .eq("startup_id", user.id)
      .eq("status", "pending")
      .order("nominated_at", { ascending: false })
      .limit(20);

    // Fetch partner profiles for nominations
    const partnerIds = [...new Set((portfolioNominations ?? []).map((n: { partner_id: string }) => n.partner_id))];
    const { data: partnerProfiles } = partnerIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, business_name")
          .in("id", partnerIds)
      : { data: [] };
    const partnerMap = new Map((partnerProfiles ?? []).map((p: { id: string; full_name: string | null; business_name: string | null }) => [p.id, p]));

    // ── Helpers ──────────────────────────────────────────────────────────────
    type NamedProfile = { full_name?: string | null; business_name?: string | null } | null | undefined;
    const getName = (p: NamedProfile) => p?.full_name || p?.business_name || "a verified member";

    // ── Build notifications ──────────────────────────────────────────────────

    type MatchRow = NonNullable<typeof matches>[number];
    type SentInviteRow = NonNullable<typeof sentInvites>[number];

    const matchNotifications = (matches ?? []).map((m: MatchRow) => {
      const isA = m.member_a_id === user.id;
      const counterpartProfile = isA
        ? (m.profile_b as NamedProfile)
        : (m.profile_a as NamedProfile);
      const counterpart = getName(counterpartProfile);
      const myStatus = isA ? m.member_a_status : m.member_b_status;

      let type: "match" | "accepted" | "intro" | "declined" = "match";
      let title = "New match suggested";
      let body = `You've been matched with ${counterpart}`;

      if (m.status === "introduced") {
        type = "intro";
        title = "Introduction made";
        body = `You were introduced to ${counterpart}`;
      } else if (m.status === "accepted") {
        type = "accepted";
        title = "Match accepted";
        body = `You and ${counterpart} have both accepted`;
      } else if (myStatus === "declined") {
        type = "declined";
        title = "Match declined";
        body = `You declined a match with ${counterpart}`;
      }

      return {
        id: `match-${m.id}`,
        kind: "match" as const,
        type,
        title,
        body,
        href: "/matches",
        date: m.updated_at ?? m.created_at,
      };
    });

    const sentInviteNotifications = (sentInvites ?? []).map((inv: SentInviteRow) => {
      const statusLabel =
        inv.status === "accepted" ? "accepted your invite" :
        inv.status === "expired"  ? "invite expired"       :
        "invite pending";
      return {
        id: `invite-sent-${inv.id}`,
        kind: "invite" as const,
        type: inv.status === "accepted" ? "accepted" as const : inv.status === "expired" ? "declined" as const : "match" as const,
        title: inv.status === "accepted" ? "Invite accepted" : inv.status === "expired" ? "Invite expired" : "Invite sent",
        body: `${inv.uid_value} — ${statusLabel}`,
        href: "/profile",
        date: inv.updated_at ?? inv.created_at,
      };
    });

    type NewMemberRow = NonNullable<typeof newMembers>[number];

    const newMemberNotifications = (newMembers ?? []).map((m: NewMemberRow) => {
      const name = m.full_name || m.business_name || "A new member";
      const roleLabel =
        m.member_role === "investor" ? "investor"
        : m.member_role === "startup" ? "founder"
        : m.member_role === "ecosystem_partner" ? "ecosystem partner"
        : "member";
      return {
        id: `member-${m.id}`,
        kind: "member" as const,
        type: "match" as const,
        title: "New member joined",
        body: `${name} joined as a ${roleLabel}`,
        href: "/community",
        date: m.created_at as string,
      };
    });

    type ReceivedInviteRow = { id: string; inviter_id: string; project_id: string | null; status: string; created_at: string; updated_at: string };

    const receivedInviteNotifications = (receivedInvites ?? []).map((inv: ReceivedInviteRow) => {
      const inviter = inviterMap.get(inv.inviter_id);
      const inviterName = getName(inviter);
      return {
        id: `invite-received-${inv.id}`,
        kind: "request" as const,
        type: "match" as const,
        title: "Co-founder invite received",
        body: `${inviterName} invited you to join as co-founder`,
        href: inv.project_id ? `/projects/${inv.project_id}` : "/profile",
        date: inv.created_at,
      };
    });

    type DataRoomRow = { id: string; requester_id: string; requester_email: string | null; status: string; created_at: string; updated_at: string };

    const dataRoomNotifications = (dataRoomRequests ?? []).map((req: DataRoomRow) => {
      const requester = requesterMap.get(req.requester_id);
      const requesterName = getName(requester) !== "a verified member"
        ? getName(requester)
        : req.requester_email ?? "Someone";

      const isNew = req.status === "pending";
      const isApproved = req.status === "approved";
      return {
        id: `data-room-${req.id}`,
        kind: "request" as const,
        type: isNew ? "match" as const : isApproved ? "accepted" as const : "declined" as const,
        title: isNew ? "Data room access requested" : isApproved ? "Data room access granted" : "Data room request denied",
        body: isNew
          ? `${requesterName} requested access to your data room`
          : `You ${isApproved ? "approved" : "denied"} ${requesterName}'s access request`,
        href: "/data-room",
        date: req.updated_at ?? req.created_at,
      };
    });

    type PortfolioRow = { id: string; partner_id: string; nominated_at: string; status: string };

    const portfolioNotifications = (portfolioNominations ?? []).map((nom: PortfolioRow) => {
      const partner = partnerMap.get(nom.partner_id);
      const partnerName = getName(partner);
      return {
        id: `portfolio-${nom.id}`,
        kind: "request" as const,
        type: "intro" as const,
        title: "Ecosystem partner interest",
        body: `${partnerName} nominated your startup to their portfolio`,
        href: "/ecosystem",
        date: nom.nominated_at,
      };
    });

    const all = [
      ...matchNotifications,
      ...sentInviteNotifications,
      ...receivedInviteNotifications,
      ...dataRoomNotifications,
      ...portfolioNotifications,
      ...newMemberNotifications,
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const unreadCount =
      matchNotifications.filter((n) => n.type === "match").length +
      receivedInviteNotifications.length +
      dataRoomNotifications.filter((n) => n.type === "match").length +
      portfolioNotifications.length;

    return NextResponse.json({ notifications: all, unreadCount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
