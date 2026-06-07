"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  role_title: string | null;
  sector: string | null;
  city: string | null;
  member_role?: string | null;
  short_bio?: string | null;
  ask_categories?: unknown;
  offer_categories?: unknown;
  linkedin_url?: string | null;
};

type CofounderInvite = {
  id: string;
  type: "cofounder_invite";
  inviter: Profile | null;
  project: { id: string; name: string; stage: string | null; tagline: string | null } | null;
  created_at: string;
  expires_at: string;
  resolved_at?: string;
};

type DataRoomRequest = {
  id: string;
  type: "data_room_request";
  requester: Profile | null;
  requester_email: string | null;
  message: string | null;
  created_at: string;
  resolved_at?: string;
};

type CollabInvite = {
  id: string;
  type: "collab_invite";
  partner: Profile | null;
  created_at: string;
};

type ConnectionRequest = {
  id: string;
  type: "connection_request";
  counterpart: Profile | null;
  fit_score: number | null;
  created_at: string;
};

type RequestsData = {
  cofounderInvites: CofounderInvite[];
  dataRoomRequests: DataRoomRequest[];
  collabInvites: CollabInvite[];
  connectionRequests: ConnectionRequest[];
  totalPending: number;
  acceptedCofounderInvites: CofounderInvite[];
  acceptedDataRoomRequests: DataRoomRequest[];
  acceptedCollabInvites: CollabInvite[];
  acceptedConnectionRequests: ConnectionRequest[];
  totalAccepted: number;
};

type Tab = "all" | "cofounder" | "collaboration" | "connections" | "data_room" | "accepted";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getName(p: Pick<Profile, "full_name" | "business_name"> | null): string {
  return p?.full_name || p?.business_name || "A verified member";
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Shared card shell ─────────────────────────────────────────────────────────

function CardShell({
  initials,
  avatarColor,
  name,
  roleTitle,
  badge,
  badgeColor,
  metaTags,
  description,
  note,
  timestamp,
  error,
  children,
}: {
  initials: string;
  avatarColor: string;
  name: string;
  roleTitle?: string | null;
  badge: string;
  badgeColor: string;
  metaTags?: string[];
  description: React.ReactNode;
  note?: string | null;
  timestamp: string;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColor}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-(--color-ink)">{name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
          </div>
          {roleTitle && <p className="mt-0.5 text-xs text-(--color-muted)">{roleTitle}</p>}
          <div className="mt-1.5 text-sm text-(--color-body)">{description}</div>
          {note && (
            <p className="mt-1.5 rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2 text-xs text-(--color-body) italic">
              &ldquo;{note}&rdquo;
            </p>
          )}
          {metaTags && metaTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {metaTags.map((tag) => (
                <span key={tag} className="rounded-full border border-(--color-hairline) px-2 py-0.5 text-[10px] text-(--color-muted)">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-(--color-muted)">{relativeTime(timestamp)}</p>
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function DoneCard({ message, success }: { message: string; success: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-5">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${success ? "bg-emerald-500/20" : "bg-(--color-hairline)"}`}>
        <svg className={`h-4 w-4 ${success ? "text-emerald-400" : "text-(--color-muted)"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {success
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
        </svg>
      </div>
      <p className="text-sm font-medium text-(--color-ink)">{message}</p>
    </div>
  );
}

// ── Accepted badge ────────────────────────────────────────────────────────────

function AcceptedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Accepted
    </span>
  );
}

// ── Cofounder invite card ─────────────────────────────────────────────────────

function CofounderInviteCard({ invite, onRespond }: { invite: CofounderInvite; onRespond: (id: string) => void }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const name = getName(invite.inviter);

  const handle = async (action: "accept" | "decline") => {
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/cofounders/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: invite.id, action }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setBusy(null); return; }
      setDone({ success: action === "accept", message: action === "accept" ? `You joined ${invite.project?.name ?? "the project"} as co-founder` : "Invite declined" });
      onRespond(invite.id);
      if (action === "accept" && data.project_id) setTimeout(() => router.push(`/projects/${data.project_id}`), 1500);
    } catch { setError("Network error."); setBusy(null); }
  };

  if (done) return <DoneCard message={done.message} success={done.success} />;

  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-violet-500/20 text-violet-300"
      name={name} roleTitle={invite.inviter?.role_title}
      badge="Co-founder invite" badgeColor="bg-violet-500/10 text-violet-400"
      metaTags={[invite.inviter?.sector, invite.inviter?.city].filter(Boolean) as string[]}
      description={<>Invited you to join {invite.project ? <span className="font-semibold text-(--color-ink)">{invite.project.name}</span> : "their project"} as a co-founder.</>}
      note={invite.project?.tagline} timestamp={invite.created_at} error={error}
    >
      <button type="button" disabled={!!busy} onClick={() => void handle("accept")}
        className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
        {busy === "accept" ? "…" : "Accept"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void handle("decline")}
        className="flex items-center gap-1.5 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-muted) transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50">
        {busy === "decline" ? "…" : "Decline"}
      </button>
      {invite.project && (
        <Link href={`/projects/${invite.project.id}`} className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
          View project →
        </Link>
      )}
    </CardShell>
  );
}

// ── Accepted cofounder card ───────────────────────────────────────────────────

function AcceptedCofounderCard({ invite }: { invite: CofounderInvite }) {
  const name = getName(invite.inviter);
  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-violet-500/20 text-violet-300"
      name={name} roleTitle={invite.inviter?.role_title}
      badge="Co-founder invite" badgeColor="bg-violet-500/10 text-violet-400"
      metaTags={[invite.inviter?.sector, invite.inviter?.city].filter(Boolean) as string[]}
      description={<>You joined {invite.project ? <span className="font-semibold text-(--color-ink)">{invite.project.name}</span> : "their project"} as a co-founder.</>}
      note={invite.project?.tagline} timestamp={invite.resolved_at ?? invite.created_at}
    >
      <AcceptedBadge />
      {invite.project && (
        <Link href={`/projects/${invite.project.id}`} className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
          View project →
        </Link>
      )}
    </CardShell>
  );
}

// ── Ecosystem collab invite card ──────────────────────────────────────────────

function CollabInviteCard({ invite, onRespond }: { invite: CollabInvite; onRespond: (id: string) => void }) {
  const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const name = getName(invite.partner);

  const handle = async (decision: "accepted" | "declined") => {
    setBusy(decision);
    setError("");
    try {
      const res = await fetch(`/api/ecosystem/portfolio-invites/${invite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setBusy(null); return; }
      setDone({ success: decision === "accepted", message: decision === "accepted" ? `Collaboration with ${name} accepted` : "Invitation declined" });
      onRespond(invite.id);
    } catch { setError("Network error."); setBusy(null); }
  };

  if (done) return <DoneCard message={done.message} success={done.success} />;

  const asks = Array.isArray(invite.partner?.ask_categories) ? (invite.partner!.ask_categories as string[]).slice(0, 3) : [];
  const offers = Array.isArray(invite.partner?.offer_categories) ? (invite.partner!.offer_categories as string[]).slice(0, 3) : [];

  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-emerald-500/20 text-emerald-300"
      name={name} roleTitle={invite.partner?.role_title}
      badge="Collaboration" badgeColor="bg-emerald-500/10 text-emerald-400"
      metaTags={[invite.partner?.sector, invite.partner?.city].filter(Boolean) as string[]}
      description={<>An ecosystem partner wants to collaborate with your startup.</>}
      note={invite.partner?.short_bio ?? null} timestamp={invite.created_at} error={error}
    >
      {(asks.length > 0 || offers.length > 0) && (
        <div className="w-full mb-2 grid grid-cols-2 gap-2">
          {asks.length > 0 && (
            <div className="rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1">Looking for</p>
              {asks.map((a) => <p key={a} className="text-xs text-(--color-body)">{a}</p>)}
            </div>
          )}
          {offers.length > 0 && (
            <div className="rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1">Can offer</p>
              {offers.map((o) => <p key={o} className="text-xs text-(--color-body)">{o}</p>)}
            </div>
          )}
        </div>
      )}
      <button type="button" disabled={!!busy} onClick={() => void handle("accepted")}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
        {busy === "accepted" ? "…" : "Accept"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void handle("declined")}
        className="flex items-center gap-1.5 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-muted) transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50">
        {busy === "declined" ? "…" : "Decline"}
      </button>
      {invite.partner?.linkedin_url && (
        <a href={invite.partner.linkedin_url} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
          LinkedIn →
        </a>
      )}
    </CardShell>
  );
}

// ── Accepted collab card ──────────────────────────────────────────────────────

function AcceptedCollabCard({ invite }: { invite: CollabInvite }) {
  const name = getName(invite.partner);
  const asks = Array.isArray(invite.partner?.ask_categories) ? (invite.partner!.ask_categories as string[]).slice(0, 3) : [];
  const offers = Array.isArray(invite.partner?.offer_categories) ? (invite.partner!.offer_categories as string[]).slice(0, 3) : [];
  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-emerald-500/20 text-emerald-300"
      name={name} roleTitle={invite.partner?.role_title}
      badge="Collaboration" badgeColor="bg-emerald-500/10 text-emerald-400"
      metaTags={[invite.partner?.sector, invite.partner?.city].filter(Boolean) as string[]}
      description="Active ecosystem collaboration."
      note={invite.partner?.short_bio ?? null} timestamp={invite.created_at}
    >
      {(asks.length > 0 || offers.length > 0) && (
        <div className="w-full mb-2 grid grid-cols-2 gap-2">
          {asks.length > 0 && (
            <div className="rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1">Looking for</p>
              {asks.map((a) => <p key={a} className="text-xs text-(--color-body)">{a}</p>)}
            </div>
          )}
          {offers.length > 0 && (
            <div className="rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted) mb-1">Can offer</p>
              {offers.map((o) => <p key={o} className="text-xs text-(--color-body)">{o}</p>)}
            </div>
          )}
        </div>
      )}
      <AcceptedBadge />
      {invite.partner?.linkedin_url && (
        <a href={invite.partner.linkedin_url} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
          LinkedIn →
        </a>
      )}
    </CardShell>
  );
}

// ── Connection request card ───────────────────────────────────────────────────

function ConnectionRequestCard({ req, onRespond }: { req: ConnectionRequest; onRespond: (id: string) => void }) {
  const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const name = getName(req.counterpart);
  const roleLabel = req.counterpart?.member_role === "investor" ? "Investor" : req.counterpart?.member_role === "startup" ? "Founder" : "Member";

  const handle = async (decision: "accepted" | "declined") => {
    setBusy(decision);
    setError("");
    try {
      const res = await fetch(`/api/matches/${req.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        setBusy(null);
        return;
      }
      setDone({ success: decision === "accepted", message: decision === "accepted" ? `Connection with ${name} accepted` : "Request declined" });
      onRespond(req.id);
    } catch { setError("Network error."); setBusy(null); }
  };

  if (done) return <DoneCard message={done.message} success={done.success} />;

  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-indigo-500/20 text-indigo-300"
      name={name} roleTitle={req.counterpart?.role_title}
      badge={roleLabel} badgeColor="bg-indigo-500/10 text-indigo-400"
      metaTags={[
        req.counterpart?.sector,
        req.counterpart?.city,
        req.fit_score != null ? `${req.fit_score}% fit` : null,
      ].filter(Boolean) as string[]}
      description={<>{roleLabel === "Investor" ? "An investor wants to connect with your project." : "A founder wants to connect with you."}</>}
      note={null} timestamp={req.created_at} error={error}
    >
      <button type="button" disabled={!!busy} onClick={() => void handle("accepted")}
        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
        {busy === "accepted" ? "…" : "Accept"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void handle("declined")}
        className="flex items-center gap-1.5 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-muted) transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50">
        {busy === "declined" ? "…" : "Decline"}
      </button>
      <Link href="/matches" className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
        View in Matches →
      </Link>
    </CardShell>
  );
}

// ── Accepted connection card ──────────────────────────────────────────────────

function AcceptedConnectionCard({ req }: { req: ConnectionRequest }) {
  const name = getName(req.counterpart);
  const roleLabel = req.counterpart?.member_role === "investor" ? "Investor" : req.counterpart?.member_role === "startup" ? "Founder" : "Member";
  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-indigo-500/20 text-indigo-300"
      name={name} roleTitle={req.counterpart?.role_title}
      badge={roleLabel} badgeColor="bg-indigo-500/10 text-indigo-400"
      metaTags={[
        req.counterpart?.sector,
        req.counterpart?.city,
        req.fit_score != null ? `${req.fit_score}% fit` : null,
      ].filter(Boolean) as string[]}
      description="You are now connected."
      note={null} timestamp={req.created_at}
    >
      <AcceptedBadge />
      <Link href="/matches" className="ml-auto flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-ink) transition">
        View in Matches →
      </Link>
    </CardShell>
  );
}

// ── Data room request card ────────────────────────────────────────────────────

function DataRoomRequestCard({ req, onRespond }: { req: DataRoomRequest; onRespond: (id: string) => void }) {
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [done, setDone] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const name = getName(req.requester);

  const handle = async (action: "approve" | "deny") => {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/data-room/requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "approved" : "denied" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setBusy(null); return; }
      setDone({ success: action === "approve", message: action === "approve" ? `Access granted to ${name}` : "Request denied" });
      onRespond(req.id);
    } catch { setError("Network error."); setBusy(null); }
  };

  if (done) return <DoneCard message={done.message} success={done.success} />;

  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-amber-500/20 text-amber-300"
      name={name} roleTitle={req.requester?.role_title}
      badge="Data Room" badgeColor="bg-amber-500/10 text-amber-400"
      metaTags={[req.requester?.sector, req.requester?.city].filter(Boolean) as string[]}
      description="Requested access to your data room."
      note={req.message} timestamp={req.created_at} error={error}
    >
      <button type="button" disabled={!!busy} onClick={() => void handle("approve")}
        className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50">
        {busy === "approve" ? "…" : "Approve"}
      </button>
      <button type="button" disabled={!!busy} onClick={() => void handle("deny")}
        className="flex items-center gap-1.5 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-muted) transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-50">
        {busy === "deny" ? "…" : "Deny"}
      </button>
    </CardShell>
  );
}

// ── Accepted data room card ───────────────────────────────────────────────────

function AcceptedDataRoomCard({ req }: { req: DataRoomRequest }) {
  const name = getName(req.requester);
  return (
    <CardShell
      initials={getInitials(name)} avatarColor="bg-amber-500/20 text-amber-300"
      name={name} roleTitle={req.requester?.role_title}
      badge="Data Room" badgeColor="bg-amber-500/10 text-amber-400"
      metaTags={[req.requester?.sector, req.requester?.city].filter(Boolean) as string[]}
      description="Access granted to your data room."
      note={req.message} timestamp={req.resolved_at ?? req.created_at}
    >
      <AcceptedBadge />
    </CardShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [data, setData] = useState<RequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  useEffect(() => {
    fetch("/api/requests")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const remove = <T extends { id: string }>(list: T[], id: string) => list.filter((i) => i.id !== id);

  const handleCofounderRespond = (id: string) =>
    setData((p) => p ? { ...p, cofounderInvites: remove(p.cofounderInvites, id), totalPending: p.totalPending - 1 } : p);
  const handleCollabRespond = (id: string) =>
    setData((p) => p ? { ...p, collabInvites: remove(p.collabInvites, id), totalPending: p.totalPending - 1 } : p);
  const handleConnectionRespond = (id: string) =>
    setData((p) => p ? { ...p, connectionRequests: remove(p.connectionRequests, id), totalPending: p.totalPending - 1 } : p);
  const handleDataRoomRespond = (id: string) =>
    setData((p) => p ? { ...p, dataRoomRequests: remove(p.dataRoomRequests, id), totalPending: p.totalPending - 1 } : p);

  const pendingCount = (data?.cofounderInvites.length ?? 0) + (data?.collabInvites.length ?? 0) + (data?.connectionRequests.length ?? 0) + (data?.dataRoomRequests.length ?? 0);
  const acceptedCount = (data?.acceptedCofounderInvites.length ?? 0) + (data?.acceptedCollabInvites.length ?? 0) + (data?.acceptedConnectionRequests.length ?? 0) + (data?.acceptedDataRoomRequests.length ?? 0);

  const tabCounts: Record<Tab, number> = {
    all: pendingCount,
    cofounder: data?.cofounderInvites.length ?? 0,
    collaboration: data?.collabInvites.length ?? 0,
    connections: data?.connectionRequests.length ?? 0,
    data_room: data?.dataRoomRequests.length ?? 0,
    accepted: acceptedCount,
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "cofounder", label: "Co-founder" },
    { key: "collaboration", label: "Collaboration" },
    { key: "connections", label: "Connections" },
    { key: "data_room", label: "Data Room" },
    { key: "accepted", label: "Accepted" },
  ];

  const show = (tab: Tab) => activeTab === "all" || activeTab === tab;
  const isAcceptedTab = activeTab === "accepted";

  const currentCount = tabCounts[activeTab];
  const isEmpty = !loading && data && currentCount === 0;

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/dashboard" className="text-sm text-(--color-primary) hover:underline">
            ← Back to dashboard
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-(--color-ink)">Requests</h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-violet-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-(--color-body)">
            {isAcceptedTab
              ? "Previously accepted invitations and requests."
              : "Pending invitations and requests that need your response."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-1">
          {tabs.map((tab) => {
            const count = tabCounts[tab.key];
            const isActive = activeTab === tab.key;
            const isAccepted = tab.key === "accepted";
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-(--color-canvas) text-(--color-ink) shadow-sm"
                    : "text-(--color-muted) hover:text-(--color-ink)"
                }`}>
                {tab.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? isAccepted ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-400"
                      : "bg-(--color-hairline) text-(--color-muted)"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-(--color-surface-soft)" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) px-8 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--color-hairline)">
              {isAcceptedTab ? (
                <svg className="h-6 w-6 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <p className="mt-4 text-base font-semibold text-(--color-ink)">
              {isAcceptedTab ? "No accepted requests yet" : "No pending requests"}
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              {isAcceptedTab
                ? "Accepted invitations and connections will appear here."
                : "Invitations and connection requests will appear here."}
            </p>
          </div>
        )}

        {/* Pending lists */}
        {!loading && data && !isEmpty && !isAcceptedTab && (
          <div className="space-y-8">
            {show("cofounder") && data.cofounderInvites.length > 0 && (
              <div>
                {activeTab === "all" && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Co-founder invites</p>}
                <div className="space-y-3">
                  {data.cofounderInvites.map((inv) => (
                    <CofounderInviteCard key={inv.id} invite={inv} onRespond={handleCofounderRespond} />
                  ))}
                </div>
              </div>
            )}

            {show("collaboration") && data.collabInvites.length > 0 && (
              <div>
                {activeTab === "all" && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Ecosystem collaboration</p>}
                <div className="space-y-3">
                  {data.collabInvites.map((inv) => (
                    <CollabInviteCard key={inv.id} invite={inv} onRespond={handleCollabRespond} />
                  ))}
                </div>
              </div>
            )}

            {show("connections") && data.connectionRequests.length > 0 && (
              <div>
                {activeTab === "all" && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Connection requests</p>}
                <div className="space-y-3">
                  {data.connectionRequests.map((req) => (
                    <ConnectionRequestCard key={req.id} req={req} onRespond={handleConnectionRespond} />
                  ))}
                </div>
              </div>
            )}

            {show("data_room") && data.dataRoomRequests.length > 0 && (
              <div>
                {activeTab === "all" && <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Data room access</p>}
                <div className="space-y-3">
                  {data.dataRoomRequests.map((req) => (
                    <DataRoomRequestCard key={req.id} req={req} onRespond={handleDataRoomRespond} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted tab */}
        {!loading && data && !isEmpty && isAcceptedTab && (
          <div className="space-y-8">
            {data.acceptedCofounderInvites.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Co-founder invites</p>
                <div className="space-y-3">
                  {data.acceptedCofounderInvites.map((inv) => (
                    <AcceptedCofounderCard key={inv.id} invite={inv} />
                  ))}
                </div>
              </div>
            )}

            {data.acceptedCollabInvites.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Ecosystem collaboration</p>
                <div className="space-y-3">
                  {data.acceptedCollabInvites.map((inv) => (
                    <AcceptedCollabCard key={inv.id} invite={inv} />
                  ))}
                </div>
              </div>
            )}

            {data.acceptedConnectionRequests.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Connections</p>
                <div className="space-y-3">
                  {data.acceptedConnectionRequests.map((req) => (
                    <AcceptedConnectionCard key={req.id} req={req} />
                  ))}
                </div>
              </div>
            )}

            {data.acceptedDataRoomRequests.length > 0 && (
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Data room access</p>
                <div className="space-y-3">
                  {data.acceptedDataRoomRequests.map((req) => (
                    <AcceptedDataRoomCard key={req.id} req={req} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
