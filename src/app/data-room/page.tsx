"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import type { InvestorProjectRow } from "@/app/api/data-room/investor-projects/route";
import { InsufficientCreditsModal } from "@/app/_components/InsufficientCreditsModal";

// ─── Startup types ────────────────────────────────────────────────────────────

type Project = {
  id: string;
  name: string;
  stage: string | null;
  sector: string | null;
  created_at: string;
};

type AccessRequest = {
  id: string;
  requester_id: string;
  status: string;
  message: string | null;
  requester_email: string | null;
  created_at: string;
  requester: {
    full_name: string | null;
    business_name: string | null;
    member_role: string | null;
    email: string | null;
  } | null;
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvestorProjectRow["access_status"] }) {
  const map = {
    none:     { label: "No access",  cls: "bg-[var(--color-surface-soft)] text-[var(--color-muted)]" },
    pending:  { label: "Pending",    cls: "bg-amber-50 text-amber-700" },
    approved: { label: "Approved",   cls: "bg-emerald-50 text-emerald-700" },
    denied:   { label: "Denied",     cls: "bg-red-50 text-red-600" },
  };
  const s = map[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Investor view ────────────────────────────────────────────────────────────

type EmailFormState = { email: string; error: string };

function InvestorDataRoom() {
  const [projects, setProjects] = useState<InvestorProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [emailForms, setEmailForms] = useState<Record<string, EmailFormState>>({});
  const [search, setSearch] = useState("");
  const [pitchUnlocking, setPitchUnlocking] = useState<Record<string, boolean>>({});
  const [pitchConfirm, setPitchConfirm] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState<{ needed: number; balance: number } | null>(null);

  useEffect(() => {
    fetch("/api/data-room/investor-projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects((data as { projects?: InvestorProjectRow[] }).projects ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openEmailForm = (projectId: string) => {
    setEmailForms((prev) => ({ ...prev, [projectId]: { email: "", error: "" } }));
  };

  const closeEmailForm = (projectId: string) => {
    setEmailForms((prev) => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  };

  const handleRequest = async (ownerId: string, projectId: string) => {
    const form = emailForms[projectId];
    const email = form?.email.trim() ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailForms((prev) => ({
        ...prev,
        [projectId]: { ...prev[projectId], error: "Please enter a valid email address." },
      }));
      return;
    }
    setRequesting((prev) => ({ ...prev, [projectId]: true }));
    const res = await fetch(`/api/data-room/${ownerId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_email: email }),
    });
    setRequesting((prev) => ({ ...prev, [projectId]: false }));
    if (res.ok) {
      closeEmailForm(projectId);
      setProjects((prev) =>
        prev.map((p) =>
          p.owner_id === ownerId ? { ...p, access_status: "pending" } : p,
        ),
      );
    }
  };

  const handleUnlockPitchDeck = async (projectId: string) => {
    setPitchConfirm(null);
    setPitchUnlocking((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch("/api/data-room/unlock-pitch-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = (await res.json()) as { success?: boolean; pitchDeckUrl?: string | null; needed?: number; balance?: number };
      if (res.status === 402 && data.needed !== undefined && data.balance !== undefined) {
        setInsufficientCredits({ needed: data.needed, balance: data.balance });
        return;
      }
      if (res.ok && data.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p.project_id === projectId
              ? { ...p, pitch_deck_unlocked: true, pitch_deck_url: data.pitchDeckUrl ?? null }
              : p,
          ),
        );
      }
    } finally {
      setPitchUnlocking((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.project_name.toLowerCase().includes(q) ||
      (p.sector ?? "").toLowerCase().includes(q) ||
      (p.stage ?? "").toLowerCase().includes(q) ||
      p.owner_name.toLowerCase().includes(q)
    );
  });

  const approved = filtered.filter((p) => p.access_status === "approved");
  const pending  = filtered.filter((p) => p.access_status === "pending");
  const rest     = filtered.filter((p) => p.access_status === "none" || p.access_status === "denied");

  const groups: { label: string; items: InvestorProjectRow[] }[] = [
    ...(approved.length ? [{ label: "Approved access", items: approved }] : []),
    ...(pending.length  ? [{ label: "Pending requests", items: pending }] : []),
    ...(rest.length     ? [{ label: "All projects",     items: rest    }] : []),
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">FOUNDERS ARENA</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">Data Room</h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Projects from startups you&apos;ve mutually matched with appear here. Request access to view their documents.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-8 space-y-8">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search by name, sector, stage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-(--color-hairline) bg-(--color-canvas) py-2 pl-9 pr-4 text-sm outline-none focus:border-(--color-primary)"
          />
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-(--color-muted)">No matched projects yet. Data rooms become available once you and a startup have both accepted a match.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-(--color-muted)">No projects match your search.</p>
        ) : (
          groups.map(({ label, items }) => (
            <section key={label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-(--color-muted)">{label}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((project) => (
                  <div
                    key={project.project_id}
                    className="flex flex-col justify-between rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-(--color-ink)">{project.project_name}</p>
                        <StatusBadge status={project.access_status} />
                      </div>
                      <p className="mt-0.5 text-xs text-(--color-muted)">{project.owner_name}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {project.stage && (
                          <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                            {project.stage}
                          </span>
                        )}
                        {project.sector && (
                          <span className="rounded-full border border-(--color-hairline) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                            {project.sector}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {project.access_status === "approved" && (
                        <>
                          {project.drive_link ? (
                            <a
                              href={project.drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-primary) hover:underline"
                            >
                              Open Drive folder
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <p className="text-xs text-(--color-muted) italic">Access approved — waiting for founder to share the folder.</p>
                          )}

                          {/* Pitch deck section */}
                          <div className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-2">Pitch deck</p>
                            {project.pitch_deck_unlocked ? (
                              project.pitch_deck_url ? (
                                <a
                                  href={project.pitch_deck_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-500 hover:underline"
                                >
                                  View pitch deck
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <p className="text-xs text-(--color-muted) italic">Pitch deck not uploaded yet.</p>
                              )
                            ) : pitchConfirm === project.project_id ? (
                              <div className="space-y-2">
                                <p className="text-xs text-(--color-muted)">Unlock the pitch deck link. Free during beta.</p>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={pitchUnlocking[project.project_id]}
                                    onClick={() => void handleUnlockPitchDeck(project.project_id)}
                                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                                  >
                                    {pitchUnlocking[project.project_id] ? "Unlocking…" : "Confirm"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPitchConfirm(null)}
                                    className="text-xs text-(--color-muted) hover:text-(--color-ink)"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPitchConfirm(project.project_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-500 hover:text-violet-600"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Unlock for free (beta)
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      {project.access_status === "pending" && (
                        <p className="text-xs text-amber-600">Awaiting founder approval</p>
                      )}
                      {(project.access_status === "none" || project.access_status === "denied") && (
                        emailForms[project.project_id] ? (
                          <div className="space-y-2">
                            <p className="text-xs text-(--color-muted)">
                              Enter the Google account email you want the founder to share the Drive folder with.
                            </p>
                            <input
                              type="email"
                              autoFocus
                              placeholder="your@gmail.com"
                              value={emailForms[project.project_id].email}
                              onChange={(e) =>
                                setEmailForms((prev) => ({
                                  ...prev,
                                  [project.project_id]: { email: e.target.value, error: "" },
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void handleRequest(project.owner_id, project.project_id);
                                if (e.key === "Escape") closeEmailForm(project.project_id);
                              }}
                              className="w-full rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-xs text-(--color-ink) outline-none focus:border-(--color-primary)"
                            />
                            {emailForms[project.project_id].error && (
                              <p className="text-xs text-red-500">{emailForms[project.project_id].error}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={requesting[project.project_id]}
                                onClick={() => void handleRequest(project.owner_id, project.project_id)}
                                className="rounded-lg bg-(--color-primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                              >
                                {requesting[project.project_id] ? "Sending…" : "Send request"}
                              </button>
                              <button
                                type="button"
                                onClick={() => closeEmailForm(project.project_id)}
                                className="text-xs text-(--color-muted) hover:text-(--color-ink)"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEmailForm(project.project_id)}
                            className="rounded-lg bg-(--color-primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                          >
                            {project.access_status === "denied" ? "Request again" : "Request access"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {insufficientCredits && (
        <InsufficientCreditsModal
          needed={insufficientCredits.needed}
          balance={insufficientCredits.balance}
          onClose={() => setInsufficientCredits(null)}
        />
      )}
    </div>
  );
}

// ─── Startup view ─────────────────────────────────────────────────────────────

function StartupDataRoom() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/data-room/requests").then((r) => r.json()),
    ]).then(([projectsData, requestsData]) => {
      setProjects((projectsData as { projects?: Project[] }).projects ?? []);
      setRequests((requestsData as { requests?: AccessRequest[] }).requests ?? []);
      setLoading(false);
    });
  }, []);

  const handleRespond = async (requestId: string, status: "approved" | "denied") => {
    setRespondingId(requestId);
    try {
      const res = await fetch(`/api/data-room/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { request?: { status: string } };
      if (res.ok && data.request) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: data.request!.status } : r)),
        );
      }
    } finally {
      setRespondingId(null);
    }
  };

  const pendingRequests  = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">FOUNDERS ARENA</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">Data Room</h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Manage your project documents. Investors must request access before they can view your files.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-10 space-y-10">
        <section>
          <h2 className="text-base font-semibold text-(--color-ink)">Your projects</h2>
          {projects.length === 0 ? (
            <div className="mt-4 rounded-xl border border-(--color-hairline) border-dashed bg-(--color-surface-soft) p-10 text-center">
              <p className="text-sm text-(--color-muted)">No projects yet.</p>
              <Link href="/projects/new" className="mt-3 inline-block text-sm font-semibold text-(--color-primary) hover:underline">
                Register a project →
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/data-room/${project.id}`}
                  className="flex flex-col justify-between rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5 hover:border-(--color-primary)/40 hover:bg-(--color-canvas) transition-colors"
                >
                  <div>
                    <p className="font-semibold text-(--color-ink)">{project.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.stage && (
                        <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                          {project.stage}
                        </span>
                      )}
                      {project.sector && (
                        <span className="rounded-full border border-(--color-hairline) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                          {project.sector}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-xs font-semibold text-(--color-primary)">Manage files →</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-semibold text-(--color-ink)">
            Access requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--color-primary) text-[10px] font-bold text-white">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-(--color-muted)">
              No access requests yet. Once investors request access you can approve or deny them here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {[...pendingRequests, ...resolvedRequests].map((req) => (
                <div key={req.id} className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-(--color-ink)">
                        {req.requester?.full_name || req.requester?.business_name || "Unknown"}
                      </p>
                      <p className="text-xs text-(--color-muted)">
                        {req.requester?.member_role ?? "Member"} · {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      {req.message && (
                        <p className="mt-1 text-xs italic text-(--color-body)">&ldquo;{req.message}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {req.status !== "pending" && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${req.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                          {req.status === "approved" ? "Approved" : "Denied"}
                        </span>
                      )}
                    </div>
                  </div>

                  {req.requester_email && (
                    <div className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-0.5">Drive share email</p>
                      <p className="text-sm font-medium text-(--color-ink) break-all">{req.requester_email}</p>
                      {req.status === "pending" && (
                        <p className="mt-1 text-xs text-(--color-muted)">
                          Share your restricted Drive folder with this email, then mark as approved below.
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={respondingId === req.id}
                        onClick={() => void handleRespond(req.id, "approved")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {respondingId === req.id ? "Saving…" : "Mark as approved"}
                      </button>
                      <button
                        type="button"
                        disabled={respondingId === req.id}
                        onClick={() => void handleRespond(req.id, "denied")}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Root: branch on member_role from auth context ────────────────────────────

export default function DataRoomPage() {
  const { memberRole, memberRoleLoaded } = useAuth();

  if (!memberRoleLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading…</p>
      </div>
    );
  }

  return memberRole === "investor" ? <InvestorDataRoom /> : <StartupDataRoom />;
}
