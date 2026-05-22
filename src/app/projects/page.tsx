"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchUserProjects, type ProjectRecord } from "@/lib/app-data";
import { useAuth } from "../providers";

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserProjects(supabase, user.id).then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, [user?.id, supabase]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-(--color-primary) hover:underline">
              ← Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">Projects</h1>
            <p className="mt-2 text-sm text-(--color-body)">
              Your active projects shared with potential investors.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="gn-btn-primary"
          >
            + New project
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-4 px-[5%] py-10">
        {loading ? (
          <div className="text-sm text-(--color-muted)">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-8">
            <p className="text-sm text-(--color-body)">No projects yet.</p>
            <Link href="/projects/new" className="mt-3 inline-block text-sm text-(--color-primary) hover:underline">
              Add your first project →
            </Link>
          </div>
        ) : (
          projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-(--color-ink)">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1 text-sm text-(--color-body) line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.stage && (
                      <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                        {p.stage}
                      </span>
                    )}
                    {p.sector && (
                      <span className="rounded-full bg-(--color-surface-soft) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                        {p.sector}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-(--color-muted)">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
