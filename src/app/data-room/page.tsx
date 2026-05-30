"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../providers";
import type { InvestorProjectRow } from "@/app/api/data-room/investor-projects/route";

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
  created_at: string;
  requester: {
    full_name: string | null;
    business_name: string | null;
    member_role: string | null;
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

function InvestorDataRoom() {
  const [projects, setProjects] = useState<InvestorProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/data-room/investor-projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects((data as { projects?: InvestorProjectRow[] }).projects ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRequest = async (ownerId: string, projectId: string) => {
    setRequesting((prev) => ({ ...prev, [projectId]: true }));
    const res = await fetch(`/api/data-room/${ownerId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setRequesting((prev) => ({ ...prev, [projectId]: false }));
    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) =>
          p.owner_id === ownerId ? { ...p, access_status: "pending" } : p,
        ),
      );
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
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Data Room</p>
          <h1 className="mt-1 text-3xl font-semibold text-(--color-ink)">Data room</h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Browse all projects on the platform and request access to view each startup&apos;s documents.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-[5%] py-8 space-y-8">
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
          <p className="text-sm text-(--color-muted)">No projects on the platform yet.</p>
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

                    <div className="mt-4">
                      {project.access_status === "approved" && (
                        <Link
                          href={`/data-room/${project.project_id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-(--color-primary) hover:underline"
                        >
                          View files →
                        </Link>
                      )}
                      {project.access_status === "pending" && (
                        <p className="text-xs text-amber-600">Awaiting startup approval</p>
                      )}
                      {(project.access_status === "none" || project.access_status === "denied") && (
                        <button
                          type="button"
                          disabled={requesting[project.project_id]}
                          onClick={() => void handleRequest(project.owner_id, project.project_id)}
                          className="rounded-lg bg-(--color-primary) px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {requesting[project.project_id]
                            ? "Requesting…"
                            : project.access_status === "denied"
                              ? "Request again"
                              : "Request access"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
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
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Data Room</p>
          <h1 className="mt-1 text-3xl font-semibold text-(--color-ink)">Data room</h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Manage your project documents. Investors must request access before they can view your files.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-[5%] py-10 space-y-10">
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
                <div key={req.id} className="flex items-center justify-between gap-4 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
                  <div>
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
                    {req.status === "pending" ? (
                      <>
                        <button type="button" disabled={respondingId === req.id} onClick={() => void handleRespond(req.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                          Approve
                        </button>
                        <button type="button" disabled={respondingId === req.id} onClick={() => void handleRespond(req.id, "denied")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                          Deny
                        </button>
                      </>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${req.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {req.status === "approved" ? "Approved" : "Denied"}
                      </span>
                    )}
                  </div>
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
