"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { InviteCofounderModal } from "@/app/projects/_components/InviteCofounderModal";
import { InsufficientCreditsModal } from "@/app/_components/InsufficientCreditsModal";
import { CofounderProfileModal, type CofounderProfile } from "@/app/projects/_components/CofounderProfileModal";
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
import { normalizeVentureReadinessReport } from "@/lib/venture-readiness/parser";
import type {
  RawVentureReadinessReport,
  VentureReadinessReport,
} from "@/lib/venture-readiness/types";

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  stage: string | null;
  sector: string | null;
  venture_readiness_report:
    | VentureReadinessReport
    | RawVentureReadinessReport
    | null;
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
    role_title: string | null;
    short_bio: string | null;
    sector: string | null;
    city: string | null;
    linkedin_url: string | null;
  } | null;
};

type PendingInvite = {
  id: string;
  uid_value: string;
  created_at: string;
  expires_at: string;
};

type InvestorMatch = {
  investor_profile_id: string;
  fit_score: number;
  summary: string | null;
  rationale: Record<string, string> | null;
  generated_at: string;
  investor_name: string;
  investor_full_name: string | null;
  investor_sector: string | null;
  investor_city: string | null;
  investor_bio: string | null;
  investor_linkedin: string | null;
  investor_role_title: string | null;
  investor_years: string | null;
  investor_employee_band: string | null;
  investor_verification: string | null;
  investor_asks_summary: string | null;
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

import PieScore from "@/components/PieScore";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
      {children}
    </h3>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10B981" : score >= 65 ? "#6366F1" : "#F59E0B";
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle
        cx={40}
        cy={40}
        r={r}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={6}
      />
      <circle
        cx={40}
        cy={40}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
      />
      <text
        x={40}
        y={45}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={color}
        fontFamily="system-ui,sans-serif"
      >
        {score}%
      </text>
    </svg>
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
  const searchParams = useSearchParams();
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

  // cofounder management
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  const [profileModalCofounder, setProfileModalCofounder] = useState<CofounderProfile | null>(null);

  // investor view: their score for this project
  const [myScore, setMyScore] = useState<MyScore | null>(null);
  const [scoring, setScoring] = useState(false);

  // startup owner view: investor matches
  const [investorMatches, setInvestorMatches] = useState<InvestorMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesGenerated, setMatchesGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedInvestorId, setExpandedInvestorId] = useState<string | null>(
    null,
  );
  const [introRequests, setIntroRequests] = useState<
    Map<string, "requesting" | "done" | "cancelling">
  >(new Map());
  const [introMatchIds, setIntroMatchIds] = useState<Map<string, string>>(
    new Map(),
  ); // investorId → matchId
  const [unlockedProfiles, setUnlockedProfiles] = useState<Set<string>>(new Set());
  const [profileUnlockConfirm, setProfileUnlockConfirm] = useState<string | null>(null);
  const [profileUnlocking, setProfileUnlocking] = useState(false);
  const [profileUnlockError, setProfileUnlockError] = useState("");
  const [introConfirm, setIntroConfirm] = useState<string | null>(null); // investor_profile_id
  const [insufficientCredits, setInsufficientCredits] = useState<{ needed: number; balance: number } | null>(null);
  const [financialSnapshot, setFinancialSnapshot] = useState<{ revenue: string; burn_rate: string; runway: string } | null>(null);
  const [snapshotChecked, setSnapshotChecked] = useState(false);
  const [snapshotUnlockConfirm, setSnapshotUnlockConfirm] = useState(false);
  const [snapshotUnlocking, setSnapshotUnlocking] = useState(false);
  const [snapshotUnlockError, setSnapshotUnlockError] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "matches">(
    searchParams.get("tab") === "matches" ? "matches" : "details",
  );
  const [reportExpanded, setReportExpanded] = useState(false);
  const [reportTab, setReportTab] = useState<
    "summary" | "profile" | "conclusion" | "details"
  >("summary");
  const [reportReparsing, setReportReparsing] = useState(false);
  const [reportReparseError, setReportReparseError] = useState("");
  const reportInputRef = useRef<HTMLInputElement>(null);
  const [assessmentTaking, setAssessmentTaking] = useState(false);
  const [redoConfirmOpen, setRedoConfirmOpen] = useState(false);
  const [redoTaking, setRedoTaking] = useState(false);
  const [redoError, setRedoError] = useState("");

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
      setPendingInvites(cofounderData.pendingInvites ?? []);
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
        const validPlans = ["6mo", "12mo"];
        const isActive =
          !!data?.subscription_plan &&
          validPlans.includes(data.subscription_plan) &&
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

    // Load existing investor matches if user owns or co-owns this project
    const userIsTeamMember = project.owner_id === user.id || cofounders.some((c) => c.cofounder_profile_id === user.id);
    if (userIsTeamMember) {
      setMatchesLoading(true);
      fetch(`/api/projects/${id}/investor-matches`)
        .then((r) => r.json())
        .then(async (data: { matches?: InvestorMatch[] }) => {
          const matches = data.matches ?? [];
          setInvestorMatches(matches);
          if (matches.length > 0) setMatchesGenerated(true);

          // Fetch existing match records to pre-populate "done" state for already-requested intros
          if (matches.length > 0) {
            const { data: existingMatches } = await supabase
              .from("matches")
              .select("id, member_a_id, member_b_id")
              .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
              .not("status", "eq", "declined");

            if (existingMatches && existingMatches.length > 0) {
              const partnerMatchMap = new Map(
                existingMatches.map((m) => [
                  m.member_a_id === user.id ? m.member_b_id : m.member_a_id,
                  m.id,
                ]),
              );
              setIntroRequests((prev) => {
                const next = new Map(prev);
                for (const m of matches) {
                  if (partnerMatchMap.has(m.investor_profile_id)) {
                    next.set(m.investor_profile_id, "done");
                  }
                }
                return next;
              });
              setIntroMatchIds((prev) => {
                const next = new Map(prev);
                for (const m of matches) {
                  const mId = partnerMatchMap.get(m.investor_profile_id);
                  if (mId) next.set(m.investor_profile_id, mId);
                }
                return next;
              });
            }
          }

          setMatchesLoading(false);

          // Pre-load any profiles this user has already paid to unlock
          if (matches.length > 0) {
            supabase
              .from("ad_credit_ledger")
              .select("reason")
              .eq("member_id", user.id)
              .ilike("reason", "Unlock investor profile:%")
              .then(({ data: unlockRows }) => {
                if (unlockRows && unlockRows.length > 0) {
                  const ids = new Set(
                    unlockRows.map((r) =>
                      (r.reason as string).replace("Unlock investor profile: ", "").trim(),
                    ),
                  );
                  setUnlockedProfiles(ids);
                }
              });
          }
        });
    }
  }, [user?.id, project, id, supabase]);

  // Load data room access status + pre-check financial snapshot unlock for non-owners
  useEffect(() => {
    if (!user?.id || !project) return;
    const userIsTeamMember = project.owner_id === user.id || cofounders.some((c) => c.cofounder_profile_id === user.id);
    if (userIsTeamMember) {
      setDataRoomStatus("none");
      setSnapshotChecked(true);
      return;
    }
    // Check if investor has already unlocked the financial snapshot
    supabase
      .from("ad_credit_ledger")
      .select("reason")
      .eq("member_id", user.id)
      .eq("reason", `Unlock financial snapshot: ${id}`)
      .maybeSingle()
      .then(({ data: lockRow }) => {
        if (lockRow) {
          fetch("/api/projects/financial-snapshot/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: id }),
          })
            .then((r) => r.json())
            .then((d: { success?: boolean; snapshot?: { revenue: string; burn_rate: string; runway: string } | null }) => {
              if (d.success && d.snapshot) setFinancialSnapshot(d.snapshot);
            });
        }
        setSnapshotChecked(true);
      });
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

  const handleUnlockSnapshot = async () => {
    setSnapshotUnlocking(true);
    setSnapshotUnlockError("");
    try {
      const res = await fetch("/api/projects/financial-snapshot/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        snapshot?: { revenue: string; burn_rate: string; runway: string } | null;
        needed?: number;
        balance?: number;
      };
      if (res.status === 402 && data.needed !== undefined && data.balance !== undefined) {
        setInsufficientCredits({ needed: data.needed, balance: data.balance });
        setSnapshotUnlockConfirm(false);
        return;
      }
      if (res.ok && data.success) {
        setFinancialSnapshot(data.snapshot ?? null);
        setSnapshotUnlockConfirm(false);
      } else {
        setSnapshotUnlockError((data as { error?: string }).error ?? "Failed to unlock.");
      }
    } finally {
      setSnapshotUnlocking(false);
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
    setProject((p) => (p ? { ...p, is_active: false } : p));
  };

  const handleRestore = async () => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    setProject((p) => (p ? { ...p, is_active: true } : p));
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
      if (scores.length > 0) setInvestorMatches(scores);
      setMatchesGenerated(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleRequestIntro = async (investorProfileId: string) => {
    setIntroRequests((prev) =>
      new Map(prev).set(investorProfileId, "requesting"),
    );
    try {
      const res = await fetch("/api/matches/request-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: id,
          investor_profile_id: investorProfileId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntroRequests((prev) =>
          new Map(prev).set(investorProfileId, "done"),
        );
        if (data?.match?.id) {
          setIntroMatchIds((prev) =>
            new Map(prev).set(investorProfileId, data.match.id),
          );
        }
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string; needed?: number; balance?: number };
        if (res.status === 402 && data.needed !== undefined && data.balance !== undefined) {
          setInsufficientCredits({ needed: data.needed, balance: data.balance });
        } else {
          window.alert(data?.error ?? "Failed to send intro request. Please try again.");
        }
        setIntroRequests((prev) => {
          const next = new Map(prev);
          next.delete(investorProfileId);
          return next;
        });
      }
    } catch {
      window.alert("Network error. Please try again.");
      setIntroRequests((prev) => {
        const next = new Map(prev);
        next.delete(investorProfileId);
        return next;
      });
    }
  };

  const handleCancelIntro = async (investorProfileId: string) => {
    const matchId = introMatchIds.get(investorProfileId);
    if (!matchId) return;
    setIntroRequests((prev) =>
      new Map(prev).set(investorProfileId, "cancelling"),
    );
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "declined" }),
      });
      if (res.ok) {
        setIntroRequests((prev) => {
          const next = new Map(prev);
          next.delete(investorProfileId);
          return next;
        });
        setIntroMatchIds((prev) => {
          const next = new Map(prev);
          next.delete(investorProfileId);
          return next;
        });
      } else {
        setIntroRequests((prev) =>
          new Map(prev).set(investorProfileId, "done"),
        );
      }
    } catch {
      setIntroRequests((prev) => new Map(prev).set(investorProfileId, "done"));
    }
  };

  const handleUnlockProfile = async () => {
    if (!profileUnlockConfirm) return;
    setProfileUnlocking(true);
    setProfileUnlockError("");
    try {
      const res = await fetch("/api/investor-profiles/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorProfileId: profileUnlockConfirm }),
      });
      const data = await res.json() as { success?: boolean; error?: string; needed?: number; balance?: number };
      if (!res.ok) {
        if (res.status === 402 && data.needed !== undefined && data.balance !== undefined) {
          setProfileUnlockConfirm(null);
          setInsufficientCredits({ needed: data.needed, balance: data.balance });
        } else {
          setProfileUnlockError(data.error ?? "Failed to unlock profile.");
        }
        setProfileUnlocking(false);
        return;
      }
      setUnlockedProfiles((prev) => new Set([...prev, profileUnlockConfirm]));
      setExpandedInvestorId(profileUnlockConfirm);
      setProfileUnlockConfirm(null);
    } catch {
      setProfileUnlockError("Something went wrong. Please try again.");
    }
    setProfileUnlocking(false);
  };

  const hasActivePlan = subscriptionPlan === "6mo" || subscriptionPlan === "12mo";

  // Free tier shows first 2 matches. Additional matches can be unlocked 1 credit each
  // (via Match Bundle add-on) OR by subscribing to a paid plan.
  const FREE_TIER_MATCH_LIMIT = 2;

  const report = useMemo(
    () =>
      project?.venture_readiness_report
        ? normalizeVentureReadinessReport(project.venture_readiness_report)
        : null,
    [project?.venture_readiness_report],
  );
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
  const isCofounder = !loading && cofounders.some((c) => c.cofounder_profile_id === user?.id);
  const isTeamMember = isOwner || isCofounder;

  async function handleRemoveCofounder(linkId: string) {
    if (!confirm("Remove this co-founder from the project? This will revoke their access immediately.")) return;
    setRemovingLinkId(linkId);
    try {
      await fetch(`/api/projects/${id}/cofounders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId }),
      });
      setCofounders((prev) => prev.filter((c) => c.id !== linkId));
    } finally {
      setRemovingLinkId(null);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm("Cancel this pending invitation?")) return;
    setCancellingInviteId(inviteId);
    try {
      await fetch(`/api/projects/${id}/cofounders`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId }),
      });
      setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } finally {
      setCancellingInviteId(null);
    }
  }

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

  async function handleRedoAssessment() {
    setRedoError("");
    setRedoTaking(true);
    try {
      const response = await fetch(`/api/projects/${id}/redo-assessment`, {
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        token?: string;
        url?: string;
      };

      if (!response.ok || !payload.token || !payload.url) {
        setRedoError(payload.error ?? "Failed to start assessment.");
        return;
      }

      window.location.assign(payload.url);
    } catch (err) {
      setRedoError(
        err instanceof Error ? err.message : "Failed to start assessment.",
      );
    } finally {
      setRedoTaking(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--color-canvas)">

      {/* ── Redo Assessment confirm modal ── */}
      {insufficientCredits && (
        <InsufficientCreditsModal
          needed={insufficientCredits.needed}
          balance={insufficientCredits.balance}
          onClose={() => setInsufficientCredits(null)}
        />
      )}

      {introConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-xl flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Confirm Action</p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">Request investor intro</h2>
              <p className="mt-2 text-sm text-(--color-body)">
                This will deduct <span className="font-semibold text-(--color-ink)">1 credit</span> from your balance and send a warm intro request to this investor. A deal card will be created in your board.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIntroConfirm(null)}
                className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const investorId = introConfirm;
                  setIntroConfirm(null);
                  void handleRequestIntro(investorId);
                }}
                className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Confirm for free (beta)
              </button>
            </div>
          </div>
        </div>
      )}

      {profileUnlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-xl flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Unlock Profile
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                View full investor profile
              </h2>
              <p className="mt-2 text-sm text-(--color-body)">
                {hasActivePlan
                  ? "Included free with your subscription. You get the full profile — thesis, portfolio, contact signals — plus the compatibility breakdown. Once unlocked, it's permanent."
                  : <>This will deduct <span className="font-semibold text-(--color-ink)">1 credit</span> from your balance. You get the full profile — thesis, portfolio, contact signals — plus the compatibility breakdown. Once unlocked, it&apos;s permanent.</>
                }
              </p>
            </div>
            {profileUnlockError && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
                {profileUnlockError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setProfileUnlockConfirm(null); setProfileUnlockError(""); }}
                disabled={profileUnlocking}
                className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUnlockProfile()}
                disabled={profileUnlocking}
                className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {profileUnlocking ? "Unlocking…" : hasActivePlan ? "View Profile — Free" : "Unlock for free (beta)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {redoConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) p-7 shadow-xl flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Premium Action
              </p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">
                Redo Venture Assessment
              </h2>
              <p className="mt-2 text-sm text-(--color-body)">
                Your first assessment was free. Regenerating costs{" "}
                <span className="font-semibold text-(--color-ink)">$99 · 100 credits</span>{" "}
                — one full Match Bundle add-on.
              </p>
              <p className="mt-2 text-sm text-(--color-body)">
                Once confirmed, you&apos;ll be redirected to{" "}
                <span className="font-semibold text-(--color-ink)">confidence.exoasia.org</span>{" "}
                to complete the new assessment. Your previous report will be replaced when the new one is uploaded.
              </p>
            </div>
            {redoError && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-700">
                {redoError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRedoConfirmOpen(false)}
                disabled={redoTaking}
                className="flex-1 rounded-xl border border-(--color-hairline) bg-(--color-canvas) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRedoAssessment()}
                disabled={redoTaking}
                className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {redoTaking ? "Redirecting…" : "Confirm · $99 / 100 cr"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-(--color-surface-soft) px-4 sm:px-6 pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/matches"
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
              {/* Investor: score badge + button in header (hidden from team members) */}
              {!isTeamMember && (
                <div className="flex items-center gap-2">
                  {myScore && <PieScore score={myScore.fit_score} large />}
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
                        Exoasia Intelligence is scoring…
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
                  {project.is_active ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRestore}
                      className="rounded-xl border border-(--color-hairline) px-3 py-2 text-sm text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                    >
                      Restore
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* tabs moved below the VCA report for full-width layout */}
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

      

      {/* ── Team member tabs (owner + cofounder) ── */}
      {isTeamMember && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
          <div role="tablist" aria-label="Project Views" className="flex gap-0 border-b border-(--color-hairline)">
            {(["details", "matches"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`project-panel-${tab}`}
                id={`project-tab-${tab}`}
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
        </div>
      )}

      {/* ── Project Details tab (always visible for non-team-members) ── */}
      {(!isTeamMember || activeTab === "details") && (
        <div role="tabpanel" id="project-panel-details" aria-labelledby="project-tab-details" className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          {report && (
        <section className="mb-6">
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
                    <>
                      <button
                        type="button"
                        onClick={() => { setRedoError(""); setRedoConfirmOpen(true); }}
                        className="rounded-xl whitespace-nowrap border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition-colors hover:bg-(--color-surface-soft)"
                      >
                        Redo Assessment
                      </button>
                      <button
                        type="button"
                        onClick={handleReportReparseClick}
                        disabled={reportReparsing}
                        className="rounded-xl whitespace-nowrap border border-(--color-hairline) bg-(--color-canvas) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition-colors hover:bg-(--color-surface-soft) disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reportReparsing ? "Reparsing…" : "Reparse report"}
                      </button>
                    </>
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
                  <div role="tablist" aria-label="Report Sections" className="flex flex-wrap gap-2">
                    {(
                      [
                        ["summary", "Summary"],
                        ["conclusion", "Conclusion"],
                        ["details", "Detailed Sections"],
                      ] as const
                    ).map(([key, label]) => {
                      const active = reportTab === key;
                      return (
                        <button
                          key={key}
                          role="tab"
                          aria-selected={active}
                          aria-controls={`report-panel-${key}`}
                          id={`report-tab-${key}`}
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
                    <div role="tabpanel" id="report-panel-summary" aria-labelledby="report-tab-summary" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
                    <section role="tabpanel" id="report-panel-profile" aria-labelledby="report-tab-profile" className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)">
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
                    <section role="tabpanel" id="report-panel-conclusion" aria-labelledby="report-tab-conclusion" className="overflow-hidden rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft)">
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
                    <section role="tabpanel" id="report-panel-details" aria-labelledby="report-tab-details" className="space-y-4">
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
          {isTeamMember ? (
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
                  <p className="mt-1 text-sm text-(--color-primary) font-medium">
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

          {/* ── Financial snapshot (investor unlock) ── */}
          {!isTeamMember && snapshotChecked && (
            <div className="mb-6 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Financial Snapshot</p>
              <h2 className="mt-1 text-base font-semibold text-(--color-ink)">Revenue, burn rate & runway</h2>
              {financialSnapshot ? (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Revenue</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{financialSnapshot.revenue || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Monthly burn</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{financialSnapshot.burn_rate || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) mb-1">Runway</p>
                    <p className="text-sm font-semibold text-(--color-ink)">{financialSnapshot.runway || "—"}</p>
                  </div>
                  <p className="col-span-3 text-[11px] text-(--color-muted)">Self-reported figures provided by the startup.</p>
                </div>
              ) : snapshotUnlockConfirm ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-(--color-body)">{hasActivePlan ? "Included free with your subscription." : <>This will deduct <strong>1 credit</strong> from your balance.</>} Unlocks this startup&apos;s revenue, burn rate, and runway.</p>
                  {snapshotUnlockError && <p className="text-xs text-red-600">{snapshotUnlockError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={snapshotUnlocking}
                      onClick={() => void handleUnlockSnapshot()}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {snapshotUnlocking ? "Unlocking…" : hasActivePlan ? "View — Free" : "Unlock for free (beta)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSnapshotUnlockConfirm(false)}
                      className="text-sm text-(--color-muted) hover:text-(--color-ink)"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-(--color-body) mb-3">Self-reported revenue estimates, monthly burn, and runway — shared only with investors who signal genuine intent.</p>
                  <button
                    type="button"
                    onClick={() => setSnapshotUnlockConfirm(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {hasActivePlan ? "View financial snapshot — Free" : "Unlock financial snapshot for free (beta)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Investor: my score detail ── */}
          {!isTeamMember && myScore && (
            <div
              className={`mb-6 rounded-xl border p-4 ${myScore.fit_score >= 80 ? "border-(--color-primary)/30 bg-(--color-primary)/10" : myScore.fit_score >= 65 ? "border-blue-500/30 bg-blue-500/10" : myScore.fit_score >= 50 ? "border-amber-500/30 bg-amber-500/10" : "border-red-500/30 bg-red-500/10"}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-(--color-ink)">
                  Your match score
                </h2>
                <PieScore score={myScore.fit_score} large />
              </div>
              <p className="mt-3 text-xs text-(--color-muted)">
                Generated {new Date(myScore.generated_at).toLocaleDateString()}{" "}
                · Exoasia Intelligence summary available on the compatibility
                breakdown
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

              {/* ── Team section ── */}
              {/* Owner: full management (accepted + pending + invite) */}
              {isOwner && (
                <div className="rounded-xl border border-(--color-hairline) p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-(--color-ink)">Team</h2>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setInviteModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-violet-700"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Invite Co-founder
                      </button>
                      <span className="text-xs text-(--color-muted)">
                        {cofounders.length} accepted · {pendingInvites.length} pending
                      </span>
                    </div>
                  </div>

                  {/* Accepted cofounders */}
                  {cofounders.length > 0 && (
                    <ul className="space-y-2">
                      {cofounders.map((c) => {
                        const name = c.profile?.full_name || c.profile?.business_name || "Team member";
                        const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                        return (
                          <li key={c.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-300">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-(--color-ink) truncate">{name}</p>
                                {c.profile?.role_title && (
                                  <p className="text-xs text-(--color-muted) truncate">{c.profile.role_title}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                Accepted
                              </span>
                              <button
                                type="button"
                                disabled={removingLinkId === c.id}
                                onClick={() => void handleRemoveCofounder(c.id)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition"
                              >
                                {removingLinkId === c.id ? "…" : "Remove"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Pending invites */}
                  {pendingInvites.length > 0 && (
                    <>
                      {cofounders.length > 0 && <hr className="border-t border-(--color-hairline)" />}
                      <ul className="space-y-2">
                        {pendingInvites.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-hairline) text-xs font-bold text-(--color-muted)">
                                ?
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-(--color-ink) truncate">{inv.uid_value}</p>
                                <p className="text-xs text-(--color-muted)">Invite sent</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                                Pending
                              </span>
                              <button
                                type="button"
                                disabled={cancellingInviteId === inv.id}
                                onClick={() => void handleCancelInvite(inv.id)}
                                className="rounded-lg px-2 py-1 text-xs font-medium text-(--color-muted) hover:bg-(--color-hairline) disabled:opacity-50 transition"
                              >
                                {cancellingInviteId === inv.id ? "…" : "Cancel"}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {cofounders.length === 0 && pendingInvites.length === 0 && (
                    <p className="text-xs text-(--color-muted) text-center py-2">No co-founders yet.</p>
                  )}

                </div>
              )}

              {/* Non-team-member (investor): show accepted co-founders with clickable profile modal */}
              {!isTeamMember && cofounders.length > 0 && (
                <div className="rounded-xl border border-(--color-hairline) p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-(--color-ink)">Team</h2>
                  <ul className="space-y-2">
                    {cofounders.map((c) => {
                      const name = c.profile?.full_name || c.profile?.business_name || "Team member";
                      const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setProfileModalCofounder(c)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-(--color-hairline)"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-300">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-(--color-ink) truncate">{name}</p>
                              {c.profile?.role_title && (
                                <p className="text-xs text-(--color-muted) truncate">{c.profile.role_title}</p>
                              )}
                            </div>
                            <span className="ml-auto shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400">
                              Co-founder
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Investor Matches tab ── */}
      {isTeamMember && activeTab === "matches" && (
        <div role="tabpanel" id="project-panel-matches" aria-labelledby="project-tab-matches" className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-5">
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
                  Exoasia Intelligence is matching…
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
          {matchesLoading || generating ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-(--color-muted)">
              <svg className="animate-spin h-4 w-4 shrink-0 text-(--color-primary)" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {generating ? "Exoasia Intelligence is scoring…" : "Loading…"}
            </div>
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
                // Locked = beyond free limit AND not a subscriber AND not individually unlocked via credit
                const locked = idx >= FREE_TIER_MATCH_LIMIT && !hasActivePlan && !unlockedProfiles.has(m.investor_profile_id);
                const profileUnlocked = hasActivePlan || unlockedProfiles.has(m.investor_profile_id);
                const isExpanded =
                  !locked && profileUnlocked && expandedInvestorId === m.investor_profile_id;

                let investorType: string | null = null;
                let targetStages: string[] = [];
                let entityClass: string[] = [];
                try {
                  const v2 = JSON.parse(m.investor_asks_summary ?? "");
                  if (v2?._v === 2) {
                    investorType = v2.investor_type ?? null;
                    targetStages = v2.target_stages ?? [];
                    entityClass = v2.entity_class ?? [];
                  }
                } catch {
                  /* */
                }

                return (
                  <div key={m.investor_profile_id} className="relative">
                    <div
                      className={`rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) overflow-hidden ${locked ? "blur-sm pointer-events-none select-none" : ""}`}
                    >
                      {/* Card header — always visible */}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (locked) return;
                          if (!profileUnlocked) {
                            setProfileUnlockConfirm(m.investor_profile_id);
                            return;
                          }
                          setExpandedInvestorId(
                            isExpanded ? null : m.investor_profile_id,
                          );
                        }}
                        className="w-full text-left p-4 hover:bg-(--color-surface-strong) transition-colors disabled:cursor-default"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-primary)/10 text-sm font-bold text-(--color-primary)">
                              {locked ? "?" : m.investor_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-medium text-(--color-ink)">
                                  {locked
                                    ? "Upgrade to unlock"
                                    : m.investor_name}
                                </p>
                                {!locked &&
                                  m.investor_verification === "verified" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                      ✓ Verified
                                    </span>
                                  )}
                              </div>
                              {!locked && m.investor_role_title && (
                                <p className="text-xs text-(--color-muted)">
                                  {m.investor_role_title}
                                </p>
                              )}
                              {!locked &&
                                (m.investor_sector || m.investor_city) && (
                                  <p className="text-xs text-(--color-muted)">
                                    {[m.investor_sector, m.investor_city]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {locked ? (
                              <div
                                className="w-7 h-7 rounded-full bg-(--color-hairline)"
                                aria-hidden
                              />
                            ) : (
                              <>
                                <div className="text-right">
                                  <p
                                    className={`text-lg font-bold leading-none ${m.fit_score >= 80 ? "text-emerald-600" : m.fit_score >= 65 ? "text-indigo-600" : "text-amber-600"}`}
                                  >
                                    {m.fit_score}%
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-(--color-muted)">
                                    Fit score
                                  </p>
                                  <p
                                    className={`text-[10px] font-semibold ${m.fit_score >= 80 ? "text-emerald-600" : m.fit_score >= 65 ? "text-indigo-600" : "text-amber-600"}`}
                                  >
                                    {m.fit_score >= 80
                                      ? "Strong match"
                                      : m.fit_score >= 65
                                        ? "Good match"
                                        : "Developing match"}
                                  </p>
                                </div>
                                <svg
                                  className={`h-4 w-4 text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-medium text-(--color-primary)">
                          {locked ? "Match limit reached" : m.summary}
                        </p>
                        {!locked && !profileUnlocked && (
                          <p className="mt-1 text-[11px] text-(--color-muted)">
                            🔒 <span className="font-semibold text-(--color-primary)">Unlock full profile + breakdown for free (beta)</span> — thesis, portfolio, compatibility
                          </p>
                        )}
                      </button>

                      {/* Expanded investor profile — investor-page style */}
                      {isExpanded && (
                        <div className="border-t border-(--color-hairline) bg-(--color-canvas)">
                          <div className="space-y-5 p-5">
                            {/* Investor name heading */}
                            {m.investor_full_name && (
                              <p className="text-base font-bold text-(--color-ink)">
                                {m.investor_full_name}
                              </p>
                            )}

                            {/* Investor details */}
                            {(m.investor_city ||
                              m.investor_sector ||
                              investorType ||
                              m.investor_years ||
                              m.investor_employee_band ||
                              entityClass.length > 0 ||
                              targetStages.length > 0) && (
                              <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-5">
                                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
                                  Investor details
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {m.investor_city && (
                                    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                                      <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                        Location
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                                        {m.investor_city}
                                      </p>
                                    </div>
                                  )}
                                  {m.investor_sector && (
                                    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                                      <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                        Sector
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                                        {m.investor_sector}
                                      </p>
                                    </div>
                                  )}
                                  {investorType && (
                                    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                                      <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                        Investor type
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                                        {investorType}
                                      </p>
                                    </div>
                                  )}
                                  {m.investor_years && (
                                    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                                      <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                        Years operating
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                                        {m.investor_years}
                                      </p>
                                    </div>
                                  )}
                                  {m.investor_employee_band && (
                                    <div className="rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) p-3">
                                      <p className="text-[10px] font-bold uppercase text-(--color-muted)">
                                        Team size
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-(--color-ink)">
                                        {m.investor_employee_band}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {entityClass.length > 0 && (
                                  <div className="mt-4">
                                    <p className="mb-2 text-[10px] font-bold uppercase text-(--color-muted)">
                                      Entity class
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {entityClass.map((ec) => (
                                        <span
                                          key={ec}
                                          className="rounded-full border border-(--color-hairline) bg-(--color-surface-soft) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)"
                                        >
                                          {ec}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {targetStages.length > 0 && (
                                  <div className="mt-4">
                                    <p className="mb-2 text-[10px] font-bold uppercase text-(--color-muted)">
                                      Target stages
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {targetStages.map((s) => (
                                        <span
                                          key={s}
                                          className="rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[10px] font-medium text-(--color-primary)"
                                        >
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </section>
                            )}

                            {/* About / Bio */}
                            {m.investor_bio && (
                              <section className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-5">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">
                                  About
                                </p>
                                <p className="text-sm text-(--color-body) leading-relaxed">
                                  {m.investor_bio}
                                </p>
                                {m.investor_linkedin && (
                                  <a
                                    href={m.investor_linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-2 text-sm text-(--color-primary) hover:underline"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                    </svg>
                                    LinkedIn profile
                                  </a>
                                )}
                              </section>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3">
                              {(() => {
                                const reqState = introRequests.get(
                                  m.investor_profile_id,
                                );
                                const isDone = reqState === "done";
                                const isRequesting = reqState === "requesting";
                                const isCancelling = reqState === "cancelling";
                                const hasMatchId = introMatchIds.has(
                                  m.investor_profile_id,
                                );
                                if (isDone) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/20 px-4 py-2.5 text-sm font-bold text-(--color-primary)">
                                        Intro requested ✓
                                      </span>
                                      {hasMatchId && (
                                        <button
                                          type="button"
                                          disabled={isCancelling}
                                          onClick={() =>
                                            void handleCancelIntro(
                                              m.investor_profile_id,
                                            )
                                          }
                                          className="rounded-xl border border-(--color-hairline) px-4 py-2.5 text-sm font-medium text-(--color-muted) hover:border-rose-300 hover:text-rose-500 disabled:opacity-50 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    type="button"
                                    disabled={isRequesting || isCancelling}
                                    onClick={() => setIntroConfirm(m.investor_profile_id)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-(--color-primary)/20 bg-(--color-primary)/10 px-4 py-2.5 text-sm font-semibold text-(--color-primary) hover:bg-(--color-primary)/20 disabled:opacity-50 transition-colors"
                                  >
                                    {isRequesting ? (
                                      <>
                                        <svg
                                          className="animate-spin h-4 w-4 shrink-0"
                                          viewBox="0 0 24 24"
                                          fill="none"
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
                                        Sending…
                                      </>
                                    ) : (
                                      "Request intro"
                                    )}
                                  </button>
                                );
                              })()}
                              <Link
                                href={`/matches/breakdown?a=${project?.owner_id ?? ""}&b=${m.investor_profile_id}&score=${m.fit_score}&project=${project?.id ?? ""}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-500/20 transition-colors"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                  />
                                </svg>
                                View compatibility breakdown
                              </Link>
                              {!m.investor_bio && m.investor_linkedin && (
                                <a
                                  href={m.investor_linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-(--color-hairline) px-4 py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                  </svg>
                                  LinkedIn profile
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                        <div className="flex flex-col items-center gap-2 rounded-2xl border border-(--color-hairline) bg-(--color-canvas) px-5 py-4 shadow-sm text-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-(--color-muted)">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <button
                            type="button"
                            onClick={() => { setProfileUnlockConfirm(m.investor_profile_id); }}
                            className="text-xs font-bold text-(--color-primary) hover:opacity-70 transition-opacity"
                          >
                            Unlock this match for free (beta)
                          </button>
                          <span className="text-[10px] text-(--color-muted)">or</span>
                          <Link
                            href="/payments"
                            className="text-[10px] font-semibold text-(--color-muted) hover:text-(--color-ink) underline underline-offset-2 transition-colors"
                          >
                            Subscribe for full access →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!hasActivePlan && investorMatches.length > FREE_TIER_MATCH_LIMIT && (
                <p className="pt-1 text-center text-xs text-(--color-muted)">
                  {investorMatches.filter((_, i) => i >= FREE_TIER_MATCH_LIMIT && !unlockedProfiles.has(_.investor_profile_id)).length} match
                  {investorMatches.filter((_, i) => i >= FREE_TIER_MATCH_LIMIT && !unlockedProfiles.has(_.investor_profile_id)).length !== 1 ? "es" : ""}{" "}
                  locked.{" "}
                  <span className="font-semibold text-(--color-primary)">Unlock for free (beta)</span>
                  {" "}or{" "}
                  <Link href="/payments" className="font-semibold text-(--color-primary) underline underline-offset-2">
                    subscribe for full access
                  </Link>.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {inviteModalOpen && (
        <InviteCofounderModal
          projectId={id}
          onClose={() => setInviteModalOpen(false)}
          onSuccess={() => {
            setInviteModalOpen(false);
            // Refresh both accepted cofounders and pending invites
            void fetch(`/api/projects/${id}/cofounders`)
              .then((r) => r.json())
              .then((data) => {
                if (data.cofounders) setCofounders(data.cofounders as unknown as Cofounder[]);
                if (data.pendingInvites) setPendingInvites(data.pendingInvites);
              });
          }}
        />
      )}

      {profileModalCofounder && (
        <CofounderProfileModal
          cofounder={profileModalCofounder}
          onClose={() => setProfileModalCofounder(null)}
        />
      )}
    </div>
  );
}
