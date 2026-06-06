"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VentureReadinessReport } from "@/lib/venture-readiness/types";

const projectStages = [
  "Ideation",
  "MVP",
  "Growth",
  "Scaling",
  "Revenue-Generating",
];

const sectorOptions = [
  "Advanced Manufacturing",
  "Aerospace & Defense",
  "Agtech",
  "Animal Health",
  "Brand & Retail",
  "Crypto & Digital Assets",
  "Deeptech",
  "Energy",
  "Enterprise & AI",
  "Fintech",
  "Food & Beverage",
  "GOAL",
  "Health",
  "Insurtech",
  "Lifetech",
  "Maritime",
  "Media & Advertising",
  "Medtech",
  "Mobility & Physical AI",
  "New Materials & Packaging",
  "Real Estate & Construction",
  "Semiconductors",
  "Smart Cities",
  "Sportstech",
  "Supply Chain",
  "Sustainability",
  "Travel & Hospitality",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    stage: "",
    sector: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slotChecked, setSlotChecked] = useState(false);

  useEffect(() => {
    fetch("/api/projects/slot-check")
      .then((r) => r.json())
      .then((data: { canCreate?: boolean }) => {
        if (data.canCreate === false) {
          router.replace("/payments");
        } else {
          setSlotChecked(true);
        }
      })
      .catch(() => setSlotChecked(true));
  }, [router]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportError, setReportError] = useState("");
  const [reportStatus, setReportStatus] = useState<
    "idle" | "parsing" | "ready"
  >("idle");
  const [ventureReport, setVentureReport] =
    useState<VentureReadinessReport | null>(null);

  const parseReport = async (file: File) => {
    setReportStatus("parsing");
    setReportError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/venture-readiness/parse", {
      method: "POST",
      body: fd,
    });
    const json = (await res.json()) as {
      success?: boolean;
      error?: string;
      data?: VentureReadinessReport;
    };
    if (!res.ok || !json.success || !json.data) {
      throw new Error(
        json.error ?? "Failed to parse Venture Confidence Assessment.",
      );
    }
    setVentureReport(json.data);
    setReportStatus("ready");
    return json.data;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    setError("");
    let reportPayload: VentureReadinessReport | undefined;
    if (reportFile) {
      try {
        reportPayload = ventureReport ?? (await parseReport(reportFile));
      } catch (err) {
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to parse Venture Confidence Assessment.",
        );
        return;
      }
    }

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        stage: form.stage || undefined,
        sector: form.sector || undefined,
        venture_readiness_report: reportPayload,
      }),
    });

    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      if (data?.upgrade) {
        setError(
          "You've reached your free project limit. Purchase additional slots to add more projects.",
        );
      } else {
        setError(data?.error ?? "Failed to create project.");
      }
      return;
    }
    router.push(`/projects/${data.project.id}`);

    if (!slotChecked) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
          <p className="text-sm text-(--color-muted)">Loading…</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/matches"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to projects
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            New project
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="proj-name"
              className="text-sm font-semibold text-(--color-ink)"
            >
              Project name{" "}
              <span className="ml-1 text-xs font-normal text-red-500">
                Required
              </span>
            </label>
            <input
              id="proj-name"
              className="gn-input mt-1"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setError("");
              }}
              placeholder="e.g. SmartSupply PH"
            />
          </div>

          <div>
            <label
              htmlFor="proj-description"
              className="text-sm font-semibold text-(--color-ink)"
            >
              Description
            </label>
            <textarea
              id="proj-description"
              className="gn-input mt-1 h-28"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description of what the project does and the problem it solves."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="proj-stage"
                className="text-sm font-semibold text-(--color-ink)"
              >
                Stage
              </label>
              <select
                id="proj-stage"
                className="gn-input mt-1"
                value={form.stage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stage: e.target.value }))
                }
              >
                <option value="">Select stage</option>
                {projectStages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="proj-sector"
                className="text-sm font-semibold text-(--color-ink)"
              >
                Sector
              </label>
              <select
                id="proj-sector"
                className="gn-input mt-1"
                value={form.sector}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sector: e.target.value }))
                }
              >
                <option value="">Select sector</option>
                {sectorOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="gn-btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create project"}
            </button>
            <Link
              href="/matches"
              className="text-sm text-(--color-muted) hover:text-(--color-ink)"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-8 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-4 text-sm text-(--color-body)">
          <p className="font-medium text-(--color-ink)">Project slots</p>
          <p className="mt-1 text-(--color-muted)">
            Your account includes 1 free project slot. Additional slots can be
            purchased under{" "}
            <Link
              href="/payments"
              className="text-(--color-primary) hover:underline"
            >
              Purchase credits
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
