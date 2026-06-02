"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import type { VentureReadinessReport } from "@/lib/venture-readiness/types";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  venture_readiness_report: VentureReadinessReport | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Cofounder = {
  id: string;
  cofounder_profile_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    business_name: string | null;
    email: string | null;
  } | null;
};

type InvestorMatch = {
  investor_profile_id: string;
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
  investor_name: string;
  investor_sector: string | null;
  investor_city: string | null;
};

type MyScore = {
  project_id: string;
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
};

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

function matchStage(
  productStage: string | null,
  fundraisingStage: string | null,
): string {
  const raw = (productStage ?? fundraisingStage ?? "").toLowerCase().trim();
  if (!raw) return "";
  for (const s of projectStages) {
    if (raw.includes(s.toLowerCase())) return s;
  }
  if (raw.includes("prototype") || raw.includes("idea")) return "Ideation";
  if (raw.includes("traction")) return "Growth";
  if (raw.includes("scale") || raw.includes("scal")) return "Scaling";
  if (raw.includes("revenue") || raw.includes("generating"))
    return "Revenue-Generating";
  return "";
}

function matchSector(sector: string | null, industry: string | null): string {
  const raw = (sector ?? industry ?? "").toLowerCase().trim();
  if (raw.length < 2) return "";
  for (const s of sectorOptions) {
    if (raw.includes(s.toLowerCase())) return s;
  }
  for (const s of sectorOptions) {
    const words = s.toLowerCase().split(/\s+/);
    if (words.some((w) => w.length > 3 && raw.includes(w))) return s;
  }
  return "";
}

function ScoreBadge({ score, large }: { score: number; large?: boolean }) {
  const cls =
    score >= 80
      ? "fa-score-excellent"
      : score >= 65
        ? "fa-score-strong"
        : score >= 50
          ? "fa-score-moderate"
          : "fa-score-low";
  return (
    <span
      className={`${cls} inline-flex items-center rounded-lg font-bold ${large ? "px-3 py-1.5 text-base" : "px-2.5 py-1 text-sm"}`}
    >
      {score}/100
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
      {children}
    </h3>
  );
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-(--color-muted)">—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-(--color-muted)">—</span>;
    return <span>{value.join(", ")}</span>;
  }

  return <span>{String(value)}</span>;
}

function FieldList({ fields }: { fields: Array<[string, unknown]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
            {label}
          </dt>
          <dd className="mt-1 text-sm text-(--color-ink)">
            <RenderValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-(--color-muted)">—</p>;
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="flex gap-2 text-sm text-(--color-body)"
        >
          <span className="shrink-0 text-(--color-primary)">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionBlock({
  title,
  findings,
  recommendations,
}: {
  title: string;
  findings: string[];
  recommendations: string[];
}) {
  return (
    <section className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-(--color-ink)">Findings</p>
          <div className="mt-2">
            <BulletList items={findings} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-(--color-ink)">
            Recommendations
          </p>
          <div className="mt-2">
            <BulletList items={recommendations} />
          </div>
        </div>
      </div>
    </section>
  );
}

type RadarPoint = {
  metric: string;
  score: number;
  fullMark: number;
};

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: RadarPoint }>;
}) {
  if (!active || !payload?.[0]?.payload) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-xs text-(--color-ink) shadow-lg">
      <p className="font-semibold text-(--color-primary)">{point.metric}</p>
      <p className="mt-1 text-(--color-body)">
        {point.score.toFixed(1)} / {point.fullMark}
      </p>
    </div>
  );
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState<Project | null>(null);
  const [cofounders, setCofounders] = useState<Cofounder[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    stage: "",
    sector: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  // investor view: their score for this project
  const [myScore, setMyScore] = useState<MyScore | null>(null);
  const [scoring, setScoring] = useState(false);

  // startup owner view: investor matches
  const [investorMatches, setInvestorMatches] = useState<InvestorMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesGenerated, setMatchesGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "matches">("details");
  const [reportExpanded, setReportExpanded] = useState(false);
  const [reportTab, setReportTab] = useState<
    "summary" | "profile" | "conclusion" | "details"
  >("summary");
  const [reportReparsing, setReportReparsing] = useState(false);
  const [reportReparseError, setReportReparseError] = useState("");
  const reportInputRef = useRef<HTMLInputElement>(null);
  const [assessmentTaking, setAssessmentTaking] = useState(false);

  // data room (investor view)
  type DataRoomFile = {
    id: string;
    name: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
  };
  const [dataRoomStatus, setDataRoomStatus] = useState<
    "loading" | "none" | "pending" | "approved" | "denied"
  >("loading");
  const [dataRoomFiles, setDataRoomFiles] = useState<DataRoomFile[]>([]);
  const [dataRoomRequesting, setDataRoomRequesting] = useState(false);
  const [dataRoomDownloadingId, setDataRoomDownloadingId] = useState<
    string | null
  >(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/cofounders`).then((r) => r.json()),
    ]).then(([projectData, cofounderData]) => {
      if (projectData.project) {
        setProject(projectData.project);
        setForm({
          name: projectData.project.name,
          description: projectData.project.description ?? "",
          stage: projectData.project.stage ?? "",
          sector: projectData.project.sector ?? "",
        });
      }
      setCofounders(cofounderData.cofounders ?? []);
      setLoading(false);
    });
  }, [id]);

  // Load subscription state once user is known
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("subscription_plan, subscription_ends_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const isActive =
          !!data?.subscription_plan &&
          (!data.subscription_ends_at ||
            new Date(data.subscription_ends_at) > new Date());
        setSubscriptionPlan(
          isActive ? (data?.subscription_plan ?? null) : null,
        );
      });
  }, [user?.id, supabase]);

  // Load member role + role-specific data once we have the project and user
  useEffect(() => {
    if (!user?.id || !project) return;

    fetch("/api/projects/my-match-scores")
      .then((r) => r.json())
      .then((data: { scores?: MyScore[] }) => {
        const score = (data.scores ?? []).find((s) => s.project_id === id);
        if (score) setMyScore(score);
      });

    // Load existing investor matches if user owns this project
    if (project.owner_id === user.id) {
      setMatchesLoading(true);
      fetch(`/api/projects/${id}/investor-matches`)
        .then((r) => r.json())
        .then((data: { matches?: InvestorMatch[] }) => {
          const matches = data.matches ?? [];
          setInvestorMatches(matches);
          if (matches.length > 0) setMatchesGenerated(true);
          setMatchesLoading(false);
        });
    }
  }, [user?.id, project, id]);

  // Load data room access status for non-owners
  useEffect(() => {
    if (!user?.id || !project) return;
    if (project.owner_id === user.id) {
      setDataRoomStatus("none");
      return;
    }
    fetch(`/api/data-room/${project.owner_id}/request`)
      .then((r) => r.json())
      .then((data: { request?: { status: string } | null }) => {
        const s = data.request?.status;
        if (!s) setDataRoomStatus("none");
        else if (s === "approved") {
          setDataRoomStatus("approved");
          fetch(`/api/data-room/projects/${id}`)
            .then((r) => r.json())
            .then((d: { files?: DataRoomFile[] }) => {
              setDataRoomFiles(d.files ?? []);
            });
        } else if (s === "pending") setDataRoomStatus("pending");
        else setDataRoomStatus("denied");
      });
  }, [user?.id, project]);

  const handleDataRoomRequest = async () => {
    if (!project) return;
    setDataRoomRequesting(true);
    try {
      const res = await fetch(`/api/data-room/${project.owner_id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) setDataRoomStatus("pending");
    } finally {
      setDataRoomRequesting(false);
    }
  };

  const handleDataRoomDownload = async (fileId: string, fileName: string) => {
    setDataRoomDownloadingId(fileId);
    try {
      const res = await fetch(`/api/data-room/files/${fileId}/download`);
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setDataRoomDownloadingId(null);
    }
  };

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }
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
    setProject((p) => (p ? { ...p, ...form, name: form.name.trim() } : p));
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Archive this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  const handleReportReparseClick = () => {
    setReportReparseError("");
    reportInputRef.current?.click();
  };

  const handleReportReparseChange = async (file: File | null) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setReportReparseError("Please upload a PDF file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setReportReparseError("File must be under 20 MB.");
      return;
    }

    setReportReparsing(true);
    setReportReparseError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const parseRes = await fetch("/api/venture-readiness/parse", {
        method: "POST",
        body: form,
      });
      const parseJson = (await parseRes.json()) as {
        success?: boolean;
        error?: string;
        data?: VentureReadinessReport;
      };

      if (!parseRes.ok || !parseJson.success || !parseJson.data) {
        throw new Error(
          parseJson.error ?? "Failed to parse Venture Confidence Assessment.",
        );
      }

      const parsedReport = parseJson.data;

      const saveRes = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venture_readiness_report: parsedReport }),
      });

      if (!saveRes.ok) {
        const saveJson = (await saveRes.json()) as { error?: string };
        throw new Error(saveJson.error ?? "Failed to save parsed report.");
      }

      setProject((current) =>
        current
          ? { ...current, venture_readiness_report: parsedReport }
          : current,
      );
      setReportExpanded(true);

      const p = parsedReport.profile;
      setForm({
        name: p.project_name || p.business_name || project?.name || "",
        description: p.description || project?.description || "",
        stage:
          matchStage(p.product_stage, p.fundraising_stage) ||
          project?.stage ||
          "",
        sector: matchSector(p.sector, p.industry) || project?.sector || "",
      });
      setEditing(true);
    } catch (err) {
      setReportReparseError(
        err instanceof Error ? err.message : "Failed to reparse report.",
      );
    } finally {
      setReportReparsing(false);
      if (reportInputRef.current) reportInputRef.current.value = "";
    }
  };

  const handleScoreProject = async () => {
    setScoring(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-match`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        score?: {
          project_id: string;
          fit_score: number;
          summary: string;
          rationale: Record<string, string>;
        };
      };
      if (data.score) {
        setMyScore({
          project_id: id,
          fit_score: data.score.fit_score,
          summary: data.score.summary,
          rationale: data.score.rationale,
          generated_at: new Date().toISOString(),
        });
      }
    } finally {
      setScoring(false);
    }
  };

  const handleFindInvestors = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-match`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        scores?: InvestorMatch[];
      };
      const scores = data.scores ?? [];
      setInvestorMatches(scores);
      setMatchesGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  const visibleMatchLimit =
    subscriptionPlan === "premium"
      ? Infinity
      : subscriptionPlan === "starter" || subscriptionPlan === "professional"
        ? 10
        : 2;

  const report = project?.venture_readiness_report;
  const reportProfile = report?.profile;
  const reportSummary = report?.executive_summary;
  const reportConclusion = report?.conclusion;
  const reportSections = report?.sections;
  const summaryRadarData: RadarPoint[] = [
    {
      metric: "Technology",
      score: reportSummary?.assessment?.technology ?? 0,
      fullMark: 10,
    },
    {
      metric: "Business",
      score: reportSummary?.assessment?.business ?? 0,
      fullMark: 10,
    },
    {
      metric: "Investment",
      score: reportSummary?.assessment?.investment ?? 0,
      fullMark: 10,
    },
    {
      metric: "Team",
      score: reportSummary?.assessment?.team ?? 0,
      fullMark: 10,
    },
  ];

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

  const isOwner = user?.id === project.owner_id;

  async function handleTakeAssessment() {
    setAssessmentTaking(true);
    try {
      const response = await fetch(`/api/projects/${id}/take-assessment`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        token?: string;
        url?: string;
      };

      if (!response.ok || !payload.token || !payload.url) {
        setError(payload.error ?? "Failed to start assessment.");
        return;
      }

      window.location.assign(payload.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start assessment.",
      );
      return;
    } finally {
      setAssessmentTaking(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="bg-(--color-surface-soft) px-[5%] pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/projects"
                className="text-sm text-(--color-primary) hover:underline"
              >
                ← Back to projects
              </Link>
              <div className="mt-3">
                <h1 className="text-3xl font-semibold text-(--color-ink)">
                  {project.name}
                </h1>
              </div>
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
              {/* Investor: score badge + button in header */}
              {!isOwner && (
                <div className="flex items-center gap-2">
                  {myScore && <ScoreBadge score={myScore.fit_score} large />}
                  <button
                    type="button"
                    disabled={scoring}
                    onClick={handleScoreProject}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-4 py-2 text-sm font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
                  >
                    {scoring ? (
                      <>
                        <svg
                          className="animate-spin h-3.5 w-3.5 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        AI is scoring…
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        >
                          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        </svg>
                        {myScore ? "Rescore" : "Score project"}
                      </>
                    )}
                  </button>
                </div>
              )}
              {isOwner && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Tabs — owner only, flush at the bottom of the header */}
          {isOwner && (
            <div className="mt-6 flex gap-0 border-b border-(--color-hairline)">
              {(["details", "matches"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "border-(--color-primary) text-(--color-primary)"
                      : "border-transparent text-(--color-muted) hover:text-(--color-ink)"
                  }`}
                >
                  {tab === "details" ? "Project Details" : "Investor Matches"}
                  {tab === "matches" &&
                    matchesGenerated &&
                    investorMatches.length > 0 && (
                      <span className="rounded-full bg-(--color-primary) px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                        {investorMatches.length}
                      </span>
                    )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <input
        ref={reportInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Upload Venture Confidence Report PDF"
        onChange={(e) =>
          void handleReportReparseChange(e.target.files?.[0] ?? null)
        }
      />

      {report && (
        <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-8">
          <div className="w-full">
            <div className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) p-4 md:rounded-2xl md:p-6 lg:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                    Venture Confidence Report
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-(--color-ink)">
                    Assessment attached to this project
                  </h2>
                  {report.report_date && (
                    <p className="mt-0.5 text-xs text-(--color-muted)">
                      As of {report.report_date}
                    </p>
                  )}
                </div>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportExpanded((value) => {
                        const next = !value;
                        if (next) setReportTab("summary");
                        return next;
                      });
                    }}
                    className="rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition-colors hover:bg-(--color-surface-soft)"
                    aria-controls="venture-confidence-report-body"
                  >
                    {reportExpanded ? "Collapse" : "Expand"}
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={handleReportReparseClick}
                      disabled={reportReparsing}
                      className="rounded-xl whitespace-nowrap border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition-colors hover:bg-(--color-surface-soft) disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {reportReparsing ? "Reparsing…" : "Reparse report"}
                    </button>
                  )}
                </div>
              </div>

              {reportReparseError && (
                <p className="mt-3 text-xs text-red-600">
                  {reportReparseError}
                </p>
              )}

              {!reportExpanded ? (
                <div
                  id="venture-confidence-report-body"
                  className="mt-4 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        ["Technology", reportSummary?.assessment?.technology],
                        ["Business", reportSummary?.assessment?.business],
                        ["Investment", reportSummary?.assessment?.investment],
                        ["Team", reportSummary?.assessment?.team],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3 text-center"
                      >
                        <p className="text-xl font-bold text-(--color-ink)">
                          {value ?? "—"}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-(--color-body)">
                    Expand to view the full project profile, executive summary,
                    conclusion, and detailed findings.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["summary", "Summary"],
                        ["profile", "Project Profile"],
                        ["conclusion", "Conclusion"],
                        ["details", "Detailed Sections"],
                      ] as const
                    ).map(([key, label]) => {
                      const active = reportTab === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setReportTab(key)}
                          className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${active ? "border-(--color-primary) bg-(--color-primary) text-white" : "border-(--color-hairline) bg-(--color-canvas) text-(--color-ink) hover:bg-(--color-surface-soft)"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {reportTab === "summary" && (
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <section className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)">
                        <div className="border-b border-(--color-hairline) bg-(--color-canvas) p-4">
                          <SectionTitle>Executive Summary</SectionTitle>
                          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {(
                              [
                                [
                                  "Technology",
                                  reportSummary?.assessment?.technology,
                                ],
                                [
                                  "Business",
                                  reportSummary?.assessment?.business,
                                ],
                                [
                                  "Investment",
                                  reportSummary?.assessment?.investment,
                                ],
                                ["Team", reportSummary?.assessment?.team],
                              ] as const
                            ).map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-strong) p-3 text-center"
                              >
                                <p className="text-xl font-bold text-(--color-ink)">
                                  {value ?? "—"}
                                </p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-(--color-primary)">
                                  {label}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 p-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm font-semibold text-(--color-ink)">
                              Key Strengths
                            </p>
                            <div className="mt-2">
                              <BulletList
                                items={reportSummary?.key_strengths ?? []}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-(--color-ink)">
                              Priority Actions
                            </p>
                            <div className="mt-2">
                              <BulletList
                                items={reportSummary?.priority_actions ?? []}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-4">
                        <SectionTitle>Readiness Radar</SectionTitle>
                        <p className="mt-2 text-sm text-(--color-body)">
                          A quick visual snapshot of the four readiness
                          dimensions.
                        </p>
                        <div className="mt-4 h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={summaryRadarData}>
                              <PolarGrid stroke="var(--color-hairline)" />
                              <PolarAngleAxis
                                dataKey="metric"
                                tick={{
                                  fill: "var(--color-ink)",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 10]}
                                tickCount={6}
                                tick={{
                                  fill: "var(--color-muted)",
                                  fontSize: 10,
                                }}
                              />
                              <Tooltip content={<RadarTooltip />} />
                              <Radar
                                name="Readiness"
                                dataKey="score"
                                stroke="var(--color-primary)"
                                fill="var(--color-primary)"
                                fillOpacity={0.18}
                                strokeWidth={2.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    </div>
                  )}

                  {reportTab === "profile" && (
                    <section className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)">
                      <div className="border-b border-(--color-hairline) bg-(--color-canvas) p-5 md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <SectionTitle>Project Profile</SectionTitle>
                            <h3 className="mt-2 text-2xl font-semibold text-(--color-ink)">
                              {reportProfile?.project_name || project.name}
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm text-(--color-body)">
                              {reportProfile?.venture ||
                                "Venture Confidence assessment"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {reportProfile?.sector && (
                              <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-3 py-1 text-xs font-semibold text-(--color-primary)">
                                {reportProfile.sector}
                              </span>
                            )}
                            {reportProfile?.fundraising_stage && (
                              <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-3 py-1 text-xs font-semibold text-(--color-primary)">
                                {reportProfile.fundraising_stage}
                              </span>
                            )}
                            {reportProfile?.location && (
                              <span className="rounded-full border border-(--color-hairline) bg-(--color-surface-strong) px-3 py-1 text-xs font-semibold text-(--color-primary)">
                                {reportProfile.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {[
                            {
                              label: "Founder",
                              value:
                                reportProfile?.first_name ||
                                reportProfile?.last_name
                                  ? [
                                      reportProfile?.first_name,
                                      reportProfile?.last_name,
                                    ]
                                      .filter(Boolean)
                                      .join(" ")
                                  : "—",
                            },
                            {
                              label: "Company",
                              value:
                                reportProfile?.business_name ||
                                reportProfile?.website ||
                                "—",
                            },
                            {
                              label: "Raising",
                              value:
                                reportProfile?.target_raise_min &&
                                reportProfile?.target_raise_max
                                  ? `${reportProfile.target_raise_min.toLocaleString()} - ${reportProfile.target_raise_max.toLocaleString()}`
                                  : reportProfile?.annual_revenue || "—",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-strong) p-4"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-primary)">
                                {item.label}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-(--color-ink)">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 md:p-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                            <SectionTitle>Founder & Team</SectionTitle>
                            <div className="mt-4">
                              <FieldList
                                fields={[
                                  ["First Name", reportProfile?.first_name],
                                  ["Last Name", reportProfile?.last_name],
                                  ["Role Title", reportProfile?.role_title],
                                  ["Role", reportProfile?.role],
                                  [
                                    "Business Name",
                                    reportProfile?.business_name,
                                  ],
                                  ["Phone", reportProfile?.phone],
                                  ["LinkedIn", reportProfile?.linkedin],
                                  ["Short Bio", reportProfile?.short_bio],
                                  ["Co-founders", reportProfile?.co_founders],
                                  [
                                    "Technical Founder",
                                    reportProfile?.technical_founder,
                                  ],
                                ]}
                              />
                            </div>
                          </section>

                          <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                            <SectionTitle>Company & Market</SectionTitle>
                            <div className="mt-4">
                              <FieldList
                                fields={[
                                  ["Venture", reportProfile?.venture],
                                  ["Project Name", reportProfile?.project_name],
                                  ["Industry", reportProfile?.industry],
                                  ["Sector", reportProfile?.sector],
                                  ["Location", reportProfile?.location],
                                  ["City", reportProfile?.city],
                                  ["Website", reportProfile?.website],
                                  ["Description", reportProfile?.description],
                                ]}
                              />
                            </div>
                          </section>

                          <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                            <SectionTitle>Traction & Stage</SectionTitle>
                            <div className="mt-4">
                              <FieldList
                                fields={[
                                  [
                                    "Employee Band",
                                    reportProfile?.employee_band,
                                  ],
                                  [
                                    "Annual Revenue",
                                    reportProfile?.annual_revenue,
                                  ],
                                  [
                                    "Years In Operation",
                                    reportProfile?.years_in_operation,
                                  ],
                                  [
                                    "Fundraising Stage",
                                    reportProfile?.fundraising_stage,
                                  ],
                                  [
                                    "Product Stage",
                                    reportProfile?.product_stage,
                                  ],
                                  [
                                    "Target Regions",
                                    reportProfile?.target_regions,
                                  ],
                                  [
                                    "Primary Industries",
                                    reportProfile?.primary_industries,
                                  ],
                                ]}
                              />
                            </div>
                          </section>

                          <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4">
                            <SectionTitle>Funding & Compliance</SectionTitle>
                            <div className="mt-4">
                              <FieldList
                                fields={[
                                  [
                                    "Target Raise Min",
                                    reportProfile?.target_raise_min,
                                  ],
                                  [
                                    "Target Raise Max",
                                    reportProfile?.target_raise_max,
                                  ],
                                  [
                                    "Referral Source",
                                    reportProfile?.referral_source,
                                  ],
                                  [
                                    "Referral Name",
                                    reportProfile?.referral_name,
                                  ],
                                  ["PDPA", reportProfile?.pdpa],
                                  [
                                    "Additional Info",
                                    reportProfile?.additional_info,
                                  ],
                                ]}
                              />
                            </div>
                          </section>
                        </div>
                      </div>
                    </section>
                  )}

                  {reportTab === "conclusion" && (
                    <section className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)">
                      <div className="border-b border-(--color-hairline) bg-(--color-canvas) p-4">
                        <SectionTitle>Conclusion</SectionTitle>
                        <p className="mt-2 text-sm text-(--color-body)">
                          Recommended next steps and closing guidance from the
                          assessment.
                        </p>
                      </div>
                      <div className="p-4">
                        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-strong) p-4">
                          <p className="text-sm font-semibold text-(--color-ink)">
                            Recommended Next Steps
                          </p>
                          <div className="mt-2">
                            <BulletList
                              items={
                                reportConclusion?.recommended_next_steps ?? []
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {reportTab === "details" && (
                    <section className="space-y-4">
                      <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-4">
                        <SectionTitle>Detailed Sections</SectionTitle>
                        <p className="mt-2 text-sm text-(--color-body)">
                          Findings and recommendations across the full report.
                        </p>
                      </div>
                      <SectionBlock
                        title="Ideas Worth Pursuing"
                        findings={
                          reportSections?.ideas_worth_pursuing.findings ?? []
                        }
                        recommendations={
                          reportSections?.ideas_worth_pursuing
                            .recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Problem"
                        findings={reportSections?.problem.findings ?? []}
                        recommendations={
                          reportSections?.problem.recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Solution"
                        findings={reportSections?.solution.findings ?? []}
                        recommendations={
                          reportSections?.solution.recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Team"
                        findings={reportSections?.team.findings ?? []}
                        recommendations={
                          reportSections?.team.recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Scalability"
                        findings={reportSections?.scalability.findings ?? []}
                        recommendations={
                          reportSections?.scalability.recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Business Viability"
                        findings={reportSections?.bm_viability.findings ?? []}
                        recommendations={
                          reportSections?.bm_viability.recommendations ?? []
                        }
                      />
                      <SectionBlock
                        title="Risk Mitigation"
                        findings={
                          reportSections?.risk_mitigation.findings ?? []
                        }
                        recommendations={
                          reportSections?.risk_mitigation.recommendations ?? []
                        }
                      />
                    </section>
                  )}
                </div>
              )}

              <p className="mt-5 text-xs text-(--color-muted)">
                AI-generated by Exoasia Intelligence. This report is
                informational only and is not an investment endorsement.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Owner tabs ── */}
      {/* ── Project Details tab (always visible for non-owners) ── */}
      {(!isOwner || activeTab === "details") && (
        <div className="mx-auto max-w-2xl px-[5%] py-10">
          {isOwner && !report && (
            <div className="mb-6 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Venture Confidence Assessment
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                Assess your project
              </h2>
              <p className="mt-1 text-sm text-(--color-body)">
                Complete the Venture Confidence Assessment to generate a
                detailed readiness report. Once done, upload your PDF here and
                we&apos;ll parse it automatically.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleTakeAssessment}
                  type="button"
                  rel="noopener noreferrer"
                  disabled={assessmentTaking}
                  className="gn-btn-primary text-sm"
                >
                  {assessmentTaking ? "Starting..." : "Take the Assessment"}
                </button>
                <button
                  type="button"
                  onClick={handleReportReparseClick}
                  disabled={reportReparsing}
                  className="gn-btn-secondary text-sm disabled:opacity-50"
                >
                  {reportReparsing ? "Analysing…" : "Upload report PDF"}
                </button>
              </div>
              {reportReparseError && (
                <p className="mt-2 text-xs text-red-600">
                  {reportReparseError}
                </p>
              )}
              <p className="mt-3 text-xs text-(--color-muted)">
                PDF only · max 20 MB. Project fields will be filled
                automatically from the parsed report.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Data Room ── */}
          {isOwner ? (
            <div className="mb-6 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Data Room
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                Your data room
              </h2>
              <p className="mt-1 text-sm text-(--color-body)">
                Upload pitch decks, financials, and other documents. Investors
                can request access from this page.
              </p>
              <div className="mt-4">
                <Link
                  href={`/data-room/${id}`}
                  className="gn-btn-secondary text-sm"
                >
                  Manage data room →
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Data Room
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                Startup data room
              </h2>
              {dataRoomStatus === "loading" && (
                <p className="mt-2 text-sm text-(--color-muted)">Loading…</p>
              )}
              {dataRoomStatus === "none" && (
                <>
                  <p className="mt-1 text-sm text-(--color-body)">
                    Request access to view this startup&apos;s pitch deck,
                    financials, and other documents.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={dataRoomRequesting}
                      onClick={() => void handleDataRoomRequest()}
                      className="gn-btn-primary text-sm disabled:opacity-50"
                    >
                      {dataRoomRequesting ? "Sending…" : "Request access"}
                    </button>
                  </div>
                </>
              )}
              {dataRoomStatus === "pending" && (
                <p className="mt-2 text-sm text-(--color-body)">
                  Your access request is pending. The startup will be notified
                  and can approve or deny it from their data room.
                </p>
              )}
              {dataRoomStatus === "denied" && (
                <p className="mt-2 text-sm text-(--color-muted)">
                  Your access request was not approved.
                </p>
              )}
              {dataRoomStatus === "approved" && (
                <>
                  <p className="mt-1 text-sm text-emerald-600 font-medium">
                    Access granted
                  </p>
                  {dataRoomFiles.length === 0 ? (
                    <p className="mt-2 text-sm text-(--color-muted)">
                      No files have been uploaded yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {dataRoomFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-(--color-hairline) bg-(--color-canvas) px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-(--color-ink)">
                              {file.name}
                            </p>
                            <p className="text-xs text-(--color-muted)">
                              {file.file_size
                                ? file.file_size < 1024 * 1024
                                  ? `${(file.file_size / 1024).toFixed(1)} KB`
                                  : `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`
                                : "—"}{" "}
                              · {new Date(file.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={dataRoomDownloadingId === file.id}
                            onClick={() =>
                              void handleDataRoomDownload(file.id, file.name)
                            }
                            className="shrink-0 rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors disabled:opacity-50"
                          >
                            {dataRoomDownloadingId === file.id
                              ? "…"
                              : "Download"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Investor: my score detail ── */}
          {!isOwner && myScore && (
            <div
              className={`mb-6 rounded-xl border p-4 ${myScore.fit_score >= 80 ? "border-emerald-500/30 bg-emerald-500/10" : myScore.fit_score >= 65 ? "border-blue-500/30 bg-blue-500/10" : myScore.fit_score >= 50 ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-(--color-ink)">
                  Your match score
                </h2>
                <ScoreBadge score={myScore.fit_score} large />
              </div>
              {myScore.summary && (
                <p className="mt-2 text-sm text-(--color-body)">
                  {myScore.summary}
                </p>
              )}
              {myScore.rationale &&
                Object.keys(myScore.rationale).length > 0 && (
                  <dl className="mt-3 space-y-1 text-xs">
                    {Object.entries(myScore.rationale).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="min-w-28 capitalize text-(--color-muted)">
                          {key.replace(/_/g, " ")}
                        </dt>
                        <dd className="text-(--color-body)">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              <p className="mt-3 text-xs text-(--color-muted)">
                Generated {new Date(myScore.generated_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label
                  htmlFor="proj-name"
                  className="text-sm font-semibold text-(--color-ink)"
                >
                  Project name
                </label>
                <input
                  id="proj-name"
                  className="gn-input mt-1"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="proj-desc"
                  className="text-sm font-semibold text-(--color-ink)"
                >
                  Description
                </label>
                <textarea
                  id="proj-desc"
                  className="gn-input mt-1 h-28"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
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
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="gn-btn-primary disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="gn-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {project.description ? (
                <p className="text-(--color-body)">{project.description}</p>
              ) : (
                <p className="text-(--color-muted) italic">
                  No description added yet.
                </p>
              )}

              {/* ── Team / Cofounders ── */}
              {isOwner && (
                <div className="rounded-xl border border-(--color-hairline) p-4">
                  <h2 className="text-sm font-semibold text-(--color-ink)">
                    Team
                  </h2>
                  {cofounders.length === 0 ? (
                    <p className="mt-2 text-sm text-(--color-muted)">
                      No cofounders linked yet. Invite them from your{" "}
                      <a
                        href="/profile"
                        className="text-(--color-primary) hover:underline"
                      >
                        profile page
                      </a>
                      .
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {cofounders.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-(--color-ink)">
                              {c.profile?.full_name ||
                                c.profile?.email ||
                                "Team member"}
                            </p>
                            {c.profile?.business_name && (
                              <p className="text-xs text-(--color-muted)">
                                {c.profile.business_name}
                              </p>
                            )}
                          </div>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Cofounder
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Investor Matches tab ── */}
      {isOwner && activeTab === "matches" && (
        <div className="mx-auto max-w-2xl px-[5%] py-10 space-y-5">
          {/* Generate / regenerate header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-(--color-ink)">
                Investor matches
              </h2>
              <p className="mt-0.5 text-sm text-(--color-muted)">
                AI-ranked investors matched to this project.
              </p>
            </div>
            <button
              type="button"
              disabled={generating}
              onClick={handleFindInvestors}
              className="inline-flex items-center gap-1.5 rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 px-4 py-2 text-sm font-medium text-(--color-primary) hover:bg-(--color-primary)/10 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  AI is matching…
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  </svg>
                  {matchesGenerated ? "Regenerate" : "Find investors"}
                </>
              )}
            </button>
          </div>

          {/* Matches content */}
          {matchesLoading ? (
            <p className="text-sm text-(--color-muted)">Loading…</p>
          ) : !matchesGenerated ? (
            <div className="rounded-xl border border-(--color-hairline) border-dashed p-10 text-center">
              <p className="text-sm text-(--color-muted)">
                Click &ldquo;Find investors&rdquo; to generate AI-powered
                investor match scores for this project.
              </p>
            </div>
          ) : investorMatches.length === 0 ? (
            <p className="text-sm text-(--color-muted)">
              No investor matches found. Try again once more investors have
              joined the platform.
            </p>
          ) : (
            <div className="space-y-3">
              {investorMatches.map((m, idx) => {
                const locked = idx >= visibleMatchLimit;
                return (
                  <div key={m.investor_profile_id} className="relative">
                    <div
                      className={`rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-4 ${locked ? "blur-sm pointer-events-none select-none" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-(--color-ink)">
                            {m.investor_name}
                          </p>
                          {(m.investor_sector || m.investor_city) && (
                            <p className="mt-0.5 text-xs text-(--color-muted)">
                              {[m.investor_sector, m.investor_city]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <ScoreBadge score={m.fit_score} />
                      </div>
                      {m.summary && (
                        <p className="mt-2 text-xs font-medium text-green-600">
                          {m.summary}
                        </p>
                      )}
                    </div>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 rounded-full border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 shadow-sm">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            className="h-3.5 w-3.5 text-(--color-muted)"
                          >
                            <rect
                              x="3"
                              y="11"
                              width="18"
                              height="11"
                              rx="2"
                              ry="2"
                            />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="text-xs font-semibold text-(--color-ink)">
                            {subscriptionPlan
                              ? "Premium — Upgrade to unlock"
                              : "Upgrade to unlock"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleMatchLimit < Infinity &&
                investorMatches.length > visibleMatchLimit && (
                  <p className="pt-1 text-center text-xs text-(--color-muted)">
                    {investorMatches.length - visibleMatchLimit} more match
                    {investorMatches.length - visibleMatchLimit !== 1
                      ? "es"
                      : ""}{" "}
                    hidden.{" "}
                    <span className="font-semibold text-(--color-primary)">
                      {subscriptionPlan
                        ? "Upgrade to Premium"
                        : "Upgrade your plan"}
                    </span>{" "}
                    to see all.
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
