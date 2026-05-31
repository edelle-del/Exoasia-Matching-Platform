"use client";

import { useState } from "react";
import { useAuth } from "@/app/providers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VentureReadinessReport } from "@/lib/venture-readiness/types";
import {
  buildProjectAssessmentRedirectUrl,
  createProjectAssessmentData,
} from "../../../lib/project-assessment-link";

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
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportError, setReportError] = useState("");
  const [reportStatus, setReportStatus] = useState<
    "idle" | "parsing" | "ready"
  >("idle");
  const [ventureReport, setVentureReport] =
    useState<VentureReadinessReport | null>(null);
  const { user } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    const ownerId = user?.id ?? `anon-${Date.now()}`;

    const assessmentData = createProjectAssessmentData({
      owner_id: ownerId,
      name: form.name,
      description: form.description,
      stage: form.stage,
      sector: form.sector,
    });

    if (!reportFile) {
      setLoading(true);
      window.location.assign(buildProjectAssessmentRedirectUrl(assessmentData));
      return;
    }

    setLoading(true);
    setError("");
    let reportPayload: VentureReadinessReport | undefined;
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
  };

  const handleReportChange = async (file: File | null) => {
    setReportFile(file);
    setReportError("");
    setVentureReport(null);
    setReportStatus("idle");

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setReportError("Please upload a PDF file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setReportError("File must be under 10 MB.");
      return;
    }

    try {
      await parseReport(file);
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : "Failed to parse Venture Confidence Assessment.",
      );
      setReportStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/projects"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to projects
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            New project
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-[5%] py-10">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                  Venture Confidence Assessment
                </p>
                <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                  Attach a report to this project
                </h2>
                <p className="mt-1 text-sm text-(--color-body)">
                  Upload the assessment PDF here so the parsed report is stored
                  on the project profile.
                </p>
              </div>
              <span className="rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-xs font-semibold text-(--color-primary)">
                Optional
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept=".pdf,application/pdf"
                aria-label="Upload Venture Confidence Assessment PDF"
                className="block w-full text-sm text-(--color-body) file:mr-4 file:rounded-xl file:border-0 file:bg-(--color-primary) file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
                onChange={(e) =>
                  void handleReportChange(e.target.files?.[0] ?? null)
                }
              />
              {reportError && (
                <p className="text-xs text-red-600">{reportError}</p>
              )}
              {reportStatus === "parsing" && (
                <p className="text-xs text-(--color-muted)">
                  Analysing assessment…
                </p>
              )}
              {reportStatus === "ready" && ventureReport && (
                <p className="text-xs text-emerald-600">
                  Assessment parsed and ready to save with this project.
                </p>
              )}
              <p className="text-xs text-(--color-muted)">
                Reports are AI-generated and are not investment endorsements.
              </p>
            </div>
          </div>

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
              {loading
                ? "Saving..."
                : reportFile
                  ? "Create project"
                  : "Assess project"}
            </button>
            <Link
              href="/projects"
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
