"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const projectStages = ["Ideation", "MVP", "Growth", "Scaling", "Revenue-Generating"];

const sectorOptions = [
  "Advanced Manufacturing","Aerospace & Defense","Agtech","Animal Health","Brand & Retail",
  "Crypto & Digital Assets","Deeptech","Energy","Enterprise & AI","Fintech","Food & Beverage",
  "GOAL","Health","Insurtech","Lifetech","Maritime","Media & Advertising","Medtech",
  "Mobility & Physical AI","New Materials & Packaging","Real Estate & Construction",
  "Semiconductors","Smart Cities","Sportstech","Supply Chain","Sustainability","Travel & Hospitality",
];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", stage: "", sector: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) {
          setProject(data.project);
          setForm({
            name: data.project.name,
            description: data.project.description ?? "",
            stage: data.project.stage ?? "",
            sector: data.project.sector ?? "",
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Project name is required."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || null,
        stage: form.stage || null,
        sector: form.sector || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "Failed to save.");
      return;
    }
    setProject((p) => p ? { ...p, ...form, name: form.name.trim() } : p);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Archive this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading...</p>
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

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl flex items-start justify-between gap-4">
          <div>
            <Link href="/projects" className="text-sm text-(--color-primary) hover:underline">
              ← Back to projects
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">{project.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.stage && (
                <span className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-xs font-medium text-(--color-primary)">
                  {project.stage}
                </span>
              )}
              {project.sector && (
                <span className="rounded-full bg-(--color-surface-soft) border border-(--color-hairline) px-2 py-0.5 text-xs font-medium text-(--color-muted)">
                  {project.sector}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="gn-btn-secondary text-sm"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Archive
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-[5%] py-10">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-(--color-ink)">Project name</label>
              <input
                className="gn-input mt-1"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-(--color-ink)">Description</label>
              <textarea
                className="gn-input mt-1 h-28"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-(--color-ink)">Stage</label>
                <select
                  className="gn-input mt-1"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  <option value="">Select stage</option>
                  {projectStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-(--color-ink)">Sector</label>
                <select
                  className="gn-input mt-1"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                >
                  <option value="">Select sector</option>
                  {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="gn-btn-primary disabled:opacity-50">
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="gn-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {project.description ? (
              <p className="text-(--color-body)">{project.description}</p>
            ) : (
              <p className="text-(--color-muted) italic">No description added yet.</p>
            )}
            <div className="rounded-xl border border-(--color-hairline) p-4 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Stage</dt>
                  <dd className="font-medium text-(--color-ink)">{project.stage || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Sector</dt>
                  <dd className="font-medium text-(--color-ink)">{project.sector || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-(--color-muted)">Created</dt>
                  <dd className="font-medium text-(--color-ink)">{new Date(project.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
