"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function DataRoomPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/data-room/requests").then((r) => r.json()),
    ]).then(([projectsData, requestsData]) => {
      setProjects(
        (projectsData as { projects?: Project[] }).projects ?? [],
      );
      setRequests(
        (requestsData as { requests?: AccessRequest[] }).requests ?? [],
      );
      setLoading(false);
    });
  }, []);

  const handleRespond = async (
    requestId: string,
    status: "approved" | "denied",
  ) => {
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
          prev.map((r) =>
            r.id === requestId ? { ...r, status: data.request!.status } : r,
          ),
        );
      }
    } finally {
      setRespondingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
            Data Room
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-(--color-ink)">
            Data room
          </h1>
          <p className="mt-1 text-sm text-(--color-body)">
            Select a project to manage its files. Investors must request access
            before they can view your documents.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-[5%] py-10 space-y-10">
        {/* Projects */}
        <section>
          <h2 className="text-base font-semibold text-(--color-ink)">
            Your projects
          </h2>

          {projects.length === 0 ? (
            <div className="mt-4 rounded-xl border border-(--color-hairline) border-dashed bg-(--color-surface-soft) p-10 text-center">
              <p className="text-sm text-(--color-muted)">
                No projects yet.
              </p>
              <Link
                href="/projects/new"
                className="mt-3 inline-block text-sm font-semibold text-(--color-primary) hover:underline"
              >
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
                    <p className="font-semibold text-(--color-ink)">
                      {project.name}
                    </p>
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
                  <p className="mt-4 text-xs font-semibold text-(--color-primary)">
                    Manage files →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Access requests */}
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
              No access requests yet. Once investors request access you can
              approve or deny them here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {[...pendingRequests, ...resolvedRequests].map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-(--color-ink)">
                      {req.requester?.full_name ||
                        req.requester?.business_name ||
                        "Unknown"}
                    </p>
                    <p className="text-xs text-(--color-muted)">
                      {req.requester?.member_role ?? "Member"} ·{" "}
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                    {req.message && (
                      <p className="mt-1 text-xs italic text-(--color-body)">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {req.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={respondingId === req.id}
                          onClick={() => void handleRespond(req.id, "approved")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={respondingId === req.id}
                          onClick={() => void handleRespond(req.id, "denied")}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          req.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
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
