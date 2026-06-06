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

    // Fetch recent matches involving this user, with counterpart profile names
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

    // Fetch new members who joined in the last 30 days (excluding current user)
    const admin = createAdminClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newMembers } = await admin
      .from("profiles")
      .select("id, full_name, business_name, member_role, created_at")
      .neq("id", user.id)
      .not("full_name", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch pending cofounder invites sent by this user
    const { data: invites } = await supabase
      .from("cofounder_invites")
      .select("id, uid_value, status, created_at, updated_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    type MatchRow = NonNullable<typeof matches>[number];
    type InviteRow = NonNullable<typeof invites>[number];

    const getName = (p: { full_name?: string | null; business_name?: string | null } | null) =>
      p?.full_name || p?.business_name || "a verified member";

    const matchNotifications = (matches ?? []).map((m: MatchRow) => {
      const isA = m.member_a_id === user.id;
      const counterpartProfile = isA
        ? (m.profile_b as { full_name?: string | null; business_name?: string | null } | null)
        : (m.profile_a as { full_name?: string | null; business_name?: string | null } | null);
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

    const inviteNotifications = (invites ?? []).map((inv: InviteRow) => {
      const statusLabel =
        inv.status === "accepted" ? "accepted your invite" :
        inv.status === "expired"  ? "invite expired"       :
        "invite pending";
      return {
        id: `invite-${inv.id}`,
        kind: "invite" as const,
        type: inv.status === "accepted" ? "accepted" : inv.status === "expired" ? "declined" : "match",
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

    const all = [...matchNotifications, ...inviteNotifications, ...newMemberNotifications].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const unreadCount = matchNotifications.filter((n) => n.type === "match").length;

    return NextResponse.json({ notifications: all, unreadCount });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
