"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  stage: string | null;
  sector: string | null;
  drive_link: string | null;
};

function isValidDriveUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "drive.google.com" || hostname === "docs.google.com";
  } catch {
    return false;
  }
}

export default function ProjectDataRoomPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data: { project?: Project }) => {
        if (data.project) {
          setProject(data.project);
          setLinkInput(data.project.drive_link ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleSave = async () => {
    const trimmed = linkInput.trim();
    if (trimmed && !isValidDriveUrl(trimmed)) {
      setSaveError("Please enter a valid Google Drive or Google Docs URL.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drive_link: trimmed || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save.");
      }
      setProject((prev) => prev ? { ...prev, drive_link: trimmed || null } : prev);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Project not found.</p>
      </div>
    );
  }

  const isDirty = linkInput.trim() !== (project.drive_link ?? "");

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      {/* Header */}
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/data-room" className="text-sm text-(--color-primary) hover:underline">
            ← Data room
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold text-(--color-ink)">{project.name}</h1>
            {project.stage && (
              <span className="rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-xs font-semibold text-(--color-primary)">
                {project.stage}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-(--color-body)">
            Link your restricted Google Drive folder here. When an investor requests access, they provide their Google email. Once you share the folder with them in Drive, mark the request as approved.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-8">
        {/* Drive link form */}
        <section className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a73e8]/10">
              <svg className="h-5 w-5 text-[#1a73e8]" viewBox="0 0 87.3 78" fill="currentColor">
                <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
                <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C.4 49.9 0 51.45 0 53h27.5z" />
                <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" />
                <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.3c-1.55 0-3.1.45-4.4 1.2z" />
                <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.4 1.2h50.8c1.55 0 3.05-.45 4.4-1.2z" />
                <path d="M59.8 53l-16.15-28-16.15 28z" opacity=".15" />
                <path d="M86.1 48.5L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.3c0-1.55-.4-3.1-1.2-4.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-(--color-ink)">Google Drive folder link</p>
              <p className="text-xs text-(--color-muted)">Paste the shareable link to your Drive folder</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                setSaveError("");
                setSaveSuccess(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
              placeholder="https://drive.google.com/drive/folders/..."
              className="gn-input w-full"
            />

            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving || !isDirty}
                onClick={() => void handleSave()}
                className="gn-btn-primary disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save link"}
              </button>
              {saveSuccess && (
                <p className="text-xs text-emerald-600 font-medium">Saved successfully.</p>
              )}
            </div>
          </div>
        </section>

        {/* Status card */}
        <section className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-6">
          <p className="font-semibold text-(--color-ink) mb-1">Current status</p>
          {project.drive_link ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-sm text-(--color-body)">Drive folder linked</p>
              </div>
              <a
                href={project.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-primary) hover:underline"
              >
                Open folder in Drive
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm text-(--color-muted)">No Drive folder linked yet. Approved investors will see a placeholder until you add a link.</p>
            </div>
          )}
        </section>

        {/* Instructions */}
        <section className="rounded-xl border border-(--color-hairline) border-dashed p-6 space-y-3">
          <p className="text-sm font-semibold text-(--color-ink)">How it works</p>
          <ol className="space-y-2 text-sm text-(--color-body) list-decimal list-inside">
            <li>Create a folder in Google Drive, upload your documents, and keep it <strong>restricted</strong> — do not enable link sharing.</li>
            <li>Copy the folder link from your browser&apos;s address bar and paste it above.</li>
            <li>When an investor requests access, they provide the Google account email they want you to share the folder with.</li>
            <li>In Google Drive, share the folder specifically with that email, then return here and mark the request as approved.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
