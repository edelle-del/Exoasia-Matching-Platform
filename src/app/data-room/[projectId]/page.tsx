"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type FinancialSnapshot = {
  revenue: string;
  burn_rate: string;
  runway: string;
};

type Project = {
  id: string;
  name: string;
  stage: string | null;
  sector: string | null;
  drive_link: string | null;
  pitch_deck_url: string | null;
  financial_snapshot: FinancialSnapshot | null;
};

type DataRoomTab = "drive" | "pitch" | "snapshot";

function isValidDriveUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "drive.google.com" || hostname === "docs.google.com";
  } catch {
    return false;
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as DataRoomTab | null;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [pitchInput, setPitchInput] = useState("");
  const [pitchSaving, setPitchSaving] = useState(false);
  const [pitchSaveError, setPitchSaveError] = useState("");
  const [pitchSaveSuccess, setPitchSaveSuccess] = useState(false);

  const [snapshotRevenue, setSnapshotRevenue] = useState("");
  const [snapshotBurn, setSnapshotBurn] = useState("");
  const [snapshotRunway, setSnapshotRunway] = useState("");
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [snapshotSaveError, setSnapshotSaveError] = useState("");
  const [snapshotSaveSuccess, setSnapshotSaveSuccess] = useState(false);

  const validTabs: DataRoomTab[] = ["drive", "pitch", "snapshot"];
  const [activeTab, setActiveTab] = useState<DataRoomTab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : "drive"
  );

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data: { project?: Project }) => {
        if (data.project) {
          setProject(data.project);
          setLinkInput(data.project.drive_link ?? "");
          setPitchInput(data.project.pitch_deck_url ?? "");
          setSnapshotRevenue(data.project.financial_snapshot?.revenue ?? "");
          setSnapshotBurn(data.project.financial_snapshot?.burn_rate ?? "");
          setSnapshotRunway(data.project.financial_snapshot?.runway ?? "");
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

  const isPitchDirty = pitchInput.trim() !== (project.pitch_deck_url ?? "");

  const isSnapshotDirty =
    snapshotRevenue.trim() !== (project.financial_snapshot?.revenue ?? "") ||
    snapshotBurn.trim() !== (project.financial_snapshot?.burn_rate ?? "") ||
    snapshotRunway.trim() !== (project.financial_snapshot?.runway ?? "");

  const handleSaveSnapshot = async () => {
    setSnapshotSaving(true);
    setSnapshotSaveError("");
    setSnapshotSaveSuccess(false);
    const rev = snapshotRevenue.trim();
    const burn = snapshotBurn.trim();
    const run = snapshotRunway.trim();
    const snapshot = (rev || burn || run)
      ? { revenue: rev, burn_rate: burn, runway: run }
      : null;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financial_snapshot: snapshot }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save.");
      }
      setProject((prev) => prev ? { ...prev, financial_snapshot: snapshot } : prev);
      setSnapshotSaveSuccess(true);
      setTimeout(() => setSnapshotSaveSuccess(false), 3000);
    } catch (err) {
      setSnapshotSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSnapshotSaving(false);
    }
  };

  const handleSavePitch = async () => {
    const trimmed = pitchInput.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setPitchSaveError("Please enter a valid URL.");
      return;
    }
    setPitchSaving(true);
    setPitchSaveError("");
    setPitchSaveSuccess(false);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch_deck_url: trimmed || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save.");
      }
      setProject((prev) => prev ? { ...prev, pitch_deck_url: trimmed || null } : prev);
      setPitchSaveSuccess(true);
      setTimeout(() => setPitchSaveSuccess(false), 3000);
    } catch (err) {
      setPitchSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setPitchSaving(false);
    }
  };

  const tabs: { key: DataRoomTab; label: string; filled: boolean }[] = [
    { key: "drive", label: "Data Room", filled: !!project.drive_link },
    { key: "pitch", label: "Pitch Deck", filled: !!project.pitch_deck_url },
    { key: "snapshot", label: "Financial Snapshot", filled: !!project.financial_snapshot },
  ];

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
            Manage your data room documents and investor-unlockable content.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? "bg-(--color-canvas) text-(--color-ink) shadow-sm"
                    : "text-(--color-muted) hover:text-(--color-ink)"
                }`}
              >
                {tab.label}
                {tab.filled && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-emerald-500/50"}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Drive tab ─────────────────────────────────────────────────────── */}
        {activeTab === "drive" && (
          <div className="space-y-6">
            {/* How it works */}
            <section className="rounded-xl border border-(--color-hairline) border-dashed p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">How it works</p>
              <ol className="space-y-1.5 text-sm text-(--color-body) list-decimal list-inside">
                <li>Create a folder in Google Drive, upload your documents, and keep it <strong>restricted</strong> — do not enable link sharing.</li>
                <li>Copy the folder link from your browser&apos;s address bar and paste it below.</li>
                <li>When an investor requests access, they provide the Google account email they want you to share the folder with.</li>
                <li>Share the folder with that email in Drive, then return here and mark the request as approved.</li>
              </ol>
            </section>

            {/* Drive link input */}
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
                  <p className="text-xs text-(--color-muted)">Paste the link to your restricted Drive folder</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => { setLinkInput(e.target.value); setSaveError(""); setSaveSuccess(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); }}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="gn-input w-full"
                />
                {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving || !isDirty}
                    onClick={() => void handleSave()}
                    className="gn-btn-primary disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save link"}
                  </button>
                  {saveSuccess && <p className="text-xs text-emerald-600 font-medium">Saved successfully.</p>}
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Current status</p>
              {project.drive_link ? (
                <div className="space-y-2">
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
                  <p className="text-sm text-(--color-muted)">No Drive folder linked yet. Approved investors will see a placeholder until you add one.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Pitch Deck tab ────────────────────────────────────────────────── */}
        {activeTab === "pitch" && (
          <div className="space-y-6">
            {/* How it works */}
            <section className="rounded-xl border border-(--color-hairline) border-dashed p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">How it works</p>
              <ol className="space-y-1.5 text-sm text-(--color-body) list-decimal list-inside">
                <li>Upload your pitch deck to any platform — Canva, Docsend, Notion, Google Slides, or a direct PDF link.</li>
                <li>Paste the link below. Keep it <strong>view-only</strong> so investors cannot edit.</li>
                <li>Investors pay <strong>3 credits</strong> to unlock the link.</li>
                <li>You can update or remove the link at any time. Investors who already unlocked it retain access.</li>
              </ol>
            </section>

            {/* Pitch deck input */}
            <section className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <svg className="h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-(--color-ink)">Pitch deck link</p>
                  <p className="text-xs text-(--color-muted)">Investors pay 3 credits to access · Canva, Docsend, Notion, or any URL</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="url"
                  value={pitchInput}
                  onChange={(e) => { setPitchInput(e.target.value); setPitchSaveError(""); setPitchSaveSuccess(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleSavePitch(); }}
                  placeholder="https://docsend.com/view/... or any public link"
                  className="gn-input w-full"
                />
                {pitchSaveError && <p className="text-xs text-red-600">{pitchSaveError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pitchSaving || !isPitchDirty}
                    onClick={() => void handleSavePitch()}
                    className="gn-btn-primary disabled:opacity-50"
                  >
                    {pitchSaving ? "Saving…" : "Save link"}
                  </button>
                  {pitchSaveSuccess && <p className="text-xs text-emerald-600 font-medium">Saved successfully.</p>}
                  {project.pitch_deck_url && !isPitchDirty && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Link active</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── Financial Snapshot tab ────────────────────────────────────────── */}
        {activeTab === "snapshot" && (
          <div className="space-y-6">
            {/* How it works */}
            <section className="rounded-xl border border-(--color-hairline) border-dashed p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">How it works</p>
              <ol className="space-y-1.5 text-sm text-(--color-body) list-decimal list-inside">
                <li>Fill in your current revenue stage, monthly burn rate, and runway.</li>
                <li>These are self-reported estimates — be honest, but you control what you share.</li>
                <li>Investors pay <strong>5 credits</strong> to view this data, filtering for those with genuine investment intent.</li>
                <li>You can update the figures at any time as your numbers change.</li>
              </ol>
            </section>

            {/* Snapshot inputs */}
            <section className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-(--color-ink)">Financial snapshot</p>
                  <p className="text-xs text-(--color-muted)">Investors pay 5 credits to unlock · self-reported figures</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-(--color-muted)">Revenue</label>
                  <input
                    type="text"
                    value={snapshotRevenue}
                    onChange={(e) => { setSnapshotRevenue(e.target.value); setSnapshotSaveError(""); setSnapshotSaveSuccess(false); }}
                    placeholder="e.g. Pre-revenue, $15k MRR, $100k ARR"
                    className="gn-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-(--color-muted)">Monthly burn rate</label>
                  <input
                    type="text"
                    value={snapshotBurn}
                    onChange={(e) => { setSnapshotBurn(e.target.value); setSnapshotSaveError(""); setSnapshotSaveSuccess(false); }}
                    placeholder="e.g. $20,000/mo"
                    className="gn-input w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-(--color-muted)">Runway</label>
                  <input
                    type="text"
                    value={snapshotRunway}
                    onChange={(e) => { setSnapshotRunway(e.target.value); setSnapshotSaveError(""); setSnapshotSaveSuccess(false); }}
                    placeholder="e.g. 14 months"
                    className="gn-input w-full"
                  />
                </div>

                {snapshotSaveError && <p className="text-xs text-red-600">{snapshotSaveError}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={snapshotSaving || !isSnapshotDirty}
                    onClick={() => void handleSaveSnapshot()}
                    className="gn-btn-primary disabled:opacity-50"
                  >
                    {snapshotSaving ? "Saving…" : "Save snapshot"}
                  </button>
                  {snapshotSaveSuccess && <p className="text-xs text-emerald-600 font-medium">Saved successfully.</p>}
                  {project.financial_snapshot && !isSnapshotDirty && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">Snapshot active</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
