"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../providers";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  sector: string | null;
  stage: string | null;
  city: string | null;
  verification_status: string | null;
  member_role: string | null;
  role_title: string | null;
  ask_categories: string[] | null;
  offer_categories: string[] | null;
  asks_summary: string | null;
};

type ParamStatus = "matched" | "partial" | "mismatch";
type Param = { name: string; myVal: string; theirVal: string; status: ParamStatus };
type ContextItem = { name: string; value: string };
type Category = { id: string; label: string; score: number; color: string; params: Param[]; isEstimated: boolean; context?: ContextItem[] };

// ─── Canvas radar ─────────────────────────────────────────────────────────────

function useRadar(
  ref: React.RefObject<HTMLCanvasElement | null>,
  axes: string[],
  values: number[],
  size = 260,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2, cy = size / 2, R = size * 0.33, n = axes.length, LEVELS = 4;
    ctx.clearRect(0, 0, size, size);

    const ang = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
    const pt  = (i: number, r: number) => ({ x: cx + R * r * Math.cos(ang(i)), y: cy + R * r * Math.sin(ang(i)) });

    for (let l = 1; l <= LEVELS; l++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = pt(i, l / LEVELS);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = l === LEVELS ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const p = pt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(99,102,241,0.15)"; ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, "rgba(99,102,241,0.35)");
    grad.addColorStop(1, "rgba(99,102,241,0.08)");
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(99,102,241,0.85)"; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < n; i++) {
      const p = pt(i, values[i] / 100);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#6366F1"; ctx.fill();
      ctx.strokeStyle = "#0A0A0F"; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.font = "10px system-ui,sans-serif"; ctx.fillStyle = "#8B8BA7"; ctx.textAlign = "center";
    for (let i = 0; i < n; i++) {
      const a = ang(i), lx = cx + R * 1.38 * Math.cos(a), ly = cy + R * 1.38 * Math.sin(a);
      const words = axes[i].split(" ");
      words.length <= 2
        ? ctx.fillText(axes[i], lx, ly + 4)
        : (ctx.fillText(words.slice(0, 2).join(" "), lx, ly - 1), ctx.fillText(words.slice(2).join(" "), lx, ly + 12));
    }
  }, [axes, values, size, ref]);
}

// ─── Computation ──────────────────────────────────────────────────────────────

function displayName(p: Profile | null) { return p?.business_name || p?.full_name || "Verified member"; }

// Compute a score purely from evidence row statuses.
// matched=100, partial=50, mismatch=0 — averaged across all params.
// This gives an honest 0-100 that directly reflects what the evidence shows,
// rather than anchoring to the overall AI score with a small offset.
function scoreFromEvidence(params: Param[]): number {
  const scoreable = params.filter((p) => p.status !== "partial" || true); // include all
  if (scoreable.length === 0) return 50;
  const pts: number[] = scoreable.map((p) =>
    p.status === "matched" ? 100 : p.status === "partial" ? 50 : 0,
  );
  return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
}

// Maps every known category string (lowercase) → semantic cluster ID.
// Categories in the same cluster are treated as matching even if worded differently.
const SEMANTIC_CLUSTERS: Record<string, string> = {
  // Funding
  "capital / funding":                     "funding",
  "funding / investment capital":           "funding",
  "capital / incubation / acceleration":   "funding",
  "seed funding":                           "funding",
  "investment capital":                     "funding",
  "venture capital":                        "funding",
  "angel investment":                       "funding",
  "investment":                             "funding",

  // Deal flow
  "deal flow / investment opportunities":  "dealflow",
  "deal flow / investment pipeline":        "dealflow",
  "investment opportunities":              "dealflow",
  "deal flow":                              "dealflow",
  "project pipeline":                       "dealflow",

  // Technology / Product
  "technology / product":                  "technology",
  "technical support":                     "technology",
  "software development":                  "technology",
  "tech support":                           "technology",
  "product development":                   "technology",

  // Mentorship / Advisory
  "mentorship / advisory":                 "mentorship",
  "advisory":                              "mentorship",
  "mentorship":                            "mentorship",
  "coaching":                              "mentorship",

  // Legal
  "legal advisory":                        "legal",
  "legal":                                 "legal",
  "compliance":                            "legal",
  "legal / compliance":                    "legal",
  "regulatory affairs":                    "legal",

  // Marketing / PR
  "marketing / pr":                        "marketing",
  "marketing":                             "marketing",
  "pr":                                    "marketing",
  "brand development":                     "marketing",
  "digital marketing":                     "marketing",
  "marketing / adtech":                    "marketing",

  // Business development
  "business development":                  "bizdev",
  "corporate partnerships":               "bizdev",
  "strategic partnerships":               "bizdev",
  "partnerships":                          "bizdev",

  // HR / Talent
  "hr / talent":                           "hr",
  "human resources":                       "hr",
  "talent acquisition":                    "hr",
  "recruitment":                           "hr",

  // Finance / Accounting
  "finance / accounting":                  "finance",
  "accounting":                            "finance",
  "financial advisory":                    "finance",
  "finance":                               "finance",

  // Networking / Connections
  "industry connections":                  "network",
  "networking":                            "network",
  "network":                               "network",
  "connections":                           "network",
  "general networking":                    "network",
  "introductions":                         "network",

  // Government
  "government relations":                  "government",
  "public policy":                         "government",

  // Academic / Research
  "academic / research":                   "academic",
  "research":                              "academic",
  "r&d":                                   "academic",

  // Community
  "community building":                    "community",
  "community":                             "community",
  "events":                                "community",
};

function semanticMatch(a: string, b: string): boolean {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return true;
  const ca = SEMANTIC_CLUSTERS[al];
  const cb = SEMANTIC_CLUSTERS[bl];
  if (ca && cb && ca === cb) return true;
  // Substring fallback for partial phrase overlap
  return al.includes(bl) || bl.includes(al);
}

function parseV2(raw: string | null | undefined): Record<string, unknown> | null {
  try {
    const p = JSON.parse(raw ?? "");
    if (p?._v === 2) return p;
  } catch { /* */ }
  return null;
}

function raiseLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  if (min != null) return `From $${min.toLocaleString()}`;
  if (max != null) return `Up to $${max.toLocaleString()}`;
  return "Not specified";
}

type AICategoryScores = {
  sector_vertical?: number;
  stage_fit?: number;
  investment_thesis?: number;
  geographic_fit?: number;
};

function computeCategories(
  mine: Profile | null,
  theirs: Profile | null,
  fitScore: number,
  projectStage: string | null = null,
  aiScores: AICategoryScores = {},
): Category[] {
  const ps = (m: boolean, p: boolean): ParamStatus => m ? "matched" : p ? "partial" : "mismatch";

  const myV2    = parseV2(mine?.asks_summary);
  const theirV2 = parseV2(theirs?.asks_summary);

  // Treat investor AND ecosystem_partner as the "matchmaker" side.
  const myIsInvestor    = mine?.member_role  === "investor" || mine?.member_role  === "ecosystem_partner";
  const theirIsInvestor = theirs?.member_role === "investor" || theirs?.member_role === "ecosystem_partner";

  const investorV2 = myIsInvestor ? myV2 : theirIsInvestor ? theirV2 : null;

  // Startup v2 must come from the startup profile specifically, not just whichever is "theirs".
  const startupV2 = mine?.member_role === "startup" ? myV2
    : theirs?.member_role === "startup" ? theirV2
    : myIsInvestor ? theirV2 : myV2;

  const startupProfile = mine?.member_role === "startup" ? mine
    : theirs?.member_role === "startup" ? theirs
    : myIsInvestor ? theirs : mine;

  // ── 1. Sector & Vertical Alignment (High weight) ─────────────────────────
  const sectorMatch = !!(mine?.sector && mine.sector === theirs?.sector);
  const investorIndustries: string[] = (investorV2?.target_industries as string[] | null) ?? [];
  const startupSector      = startupProfile?.sector ?? "";
  const startupIndustries: string[] = (startupV2?.target_industries as string[] | null) ?? [];
  const allStartupIndustries = [startupSector, ...startupIndustries].filter(Boolean).map(s => s.toLowerCase());
  const industryHits = investorIndustries.filter(i =>
    allStartupIndustries.some(s => s.includes(i.toLowerCase()) || i.toLowerCase().includes(s))
  ).length;

  const sectorParams: Param[] = [
    {
      name: "Primary sector",
      myVal: mine?.sector ?? "Not specified",
      theirVal: theirs?.sector ?? "Not specified",
      status: ps(sectorMatch, !!(mine?.sector || theirs?.sector)),
    },
    {
      name: "Target industries",
      myVal: myIsInvestor
        ? investorIndustries.slice(0, 3).join(", ") || "Not specified"
        : startupIndustries.slice(0, 3).join(", ") || startupSector || "Not specified",
      theirVal: myIsInvestor
        ? startupIndustries.slice(0, 3).join(", ") || startupSector || "Not specified"
        : investorIndustries.slice(0, 3).join(", ") || "Not specified",
      status: ps(industryHits >= 2, industryHits >= 1 || investorIndustries.length === 0),
    },
  ];
  const sectorScore = aiScores.sector_vertical ?? scoreFromEvidence(sectorParams);

  // ── 2. Stage Fit (High weight) ────────────────────────────────────────────
  // Priority: project.stage (what the AI actually receives) → asks_summary.fundraising_stage
  // profiles.stage is a numeric internal field ("1", "2"…) and is never a valid fundraising stage.
  const fundraisingStage =
    projectStage ??
    (startupV2?.fundraising_stage as string | null) ??
    "";
  const productStage = (startupV2?.product_stage as string | null) ?? "";
  const targetStages: string[] = (investorV2?.target_stages as string[] | null) ?? [];
  // No fundraising stage data → cannot determine fit (not a match).
  // Empty string would always pass includes("") so we guard explicitly.
  const stageFit = !fundraisingStage
    ? false
    : targetStages.length === 0
      ? true   // matchmaker is flexible on stage
      : targetStages.some(s =>
          s.toLowerCase().includes(fundraisingStage.toLowerCase()) ||
          fundraisingStage.toLowerCase().includes(s.toLowerCase())
        );

  const stageParams: Param[] = [
    {
      name: myIsInvestor ? "Target stages" : "Fundraising stage",
      myVal:    myIsInvestor ? targetStages.slice(0, 3).join(", ") || "Flexible" : fundraisingStage || "Not specified",
      theirVal: myIsInvestor ? fundraisingStage || "Not specified" : targetStages.slice(0, 3).join(", ") || "Flexible",
      status: ps(stageFit && targetStages.length > 0, stageFit || targetStages.length === 0),
    },
  ];
  const stageScore = aiScores.stage_fit ?? scoreFromEvidence(stageParams);
  const stageContext: ContextItem[] = productStage ? [{ name: "Product stage", value: productStage }] : [];

  // ── 3. Investment Thesis / Ask–Offer Fit  (or Support Type Alignment for eco partners) ─────
  const isEcoPartner = myIsInvestor && mine?.member_role === "ecosystem_partner";
  const myAsks     = mine?.ask_categories   ?? [];
  const theirOffers= theirs?.offer_categories ?? [];
  const myOffers   = mine?.offer_categories  ?? [];
  const theirAsks  = theirs?.ask_categories  ?? [];
  const askOfferOverlap = myAsks.filter(a  => theirOffers.some(o => semanticMatch(a, o))).length;
  const offerAskOverlap = myOffers.filter(o => theirAsks.some(a  => semanticMatch(o, a))).length;

  const targetRaiseMin = startupV2?.target_raise_min != null ? Number(startupV2.target_raise_min) : null;
  const targetRaiseMax = startupV2?.target_raise_max != null ? Number(startupV2.target_raise_max) : null;

  // MATCHED = overlap covers all possible matches (e.g. 1/1 is a full match, not partial)
  // PARTIAL  = at least 1 match but not full coverage, or either side has no data yet
  // MISMATCH = both sides have data but zero semantic overlap
  const aoMax = Math.min(myAsks.length,   theirOffers.length);
  const oaMax = Math.min(myOffers.length, theirAsks.length);

  const thesisParams: Param[] = isEcoPartner
    ? [
        // Eco partner: partner's offerings (myVal) vs startup's needs (theirVal)
        {
          name: "Partner support",
          myVal:    myOffers.slice(0, 3).join(", ") || "None",
          theirVal: theirAsks.slice(0, 3).join(", ") || "None",
          status: ps(
            offerAskOverlap > 0 && offerAskOverlap >= oaMax,
            offerAskOverlap >= 1 || !myOffers.length || !theirAsks.length,
          ),
        },
      ]
    : [
        {
          name: "Ask / Offer fit",
          myVal:    myAsks.slice(0, 3).join(", ")     || "None",
          theirVal: theirOffers.slice(0, 3).join(", ") || "None",
          status: ps(
            askOfferOverlap > 0 && askOfferOverlap >= aoMax,
            askOfferOverlap >= 1 || !myAsks.length || !theirOffers.length,
          ),
        },
        {
          name: "Offer / Ask fit",
          myVal:    myOffers.slice(0, 3).join(", ") || "None",
          theirVal: theirAsks.slice(0, 3).join(", ") || "None",
          status: ps(
            offerAskOverlap > 0 && offerAskOverlap >= oaMax,
            offerAskOverlap >= 1 || !myOffers.length || !theirAsks.length,
          ),
        },
      ];

  // Raise size context is investment-specific; skip for ecosystem partners
  if (!isEcoPartner && (targetRaiseMin != null || targetRaiseMax != null)) {
    thesisParams.push({
      name: "Target raise",
      myVal:    myIsInvestor ? "Investor" : raiseLabel(targetRaiseMin, targetRaiseMax),
      theirVal: myIsInvestor ? raiseLabel(targetRaiseMin, targetRaiseMax) : "Investor",
      status: "partial",
    });
  }

  const thesisScore = aiScores.investment_thesis ?? scoreFromEvidence(thesisParams);

  // ── 4. Geographic Fit (Low weight) ────────────────────────────────────────
  const cityMatch    = !!(mine?.city && mine.city === theirs?.city);
  const myRegions: string[]    = (myV2?.target_regions    as string[] | null) ?? [];
  const theirRegions: string[] = (theirV2?.target_regions as string[] | null) ?? [];
  const regionOverlap = myRegions.filter(r => theirRegions.includes(r)).length;
  const hasRegionData = myRegions.length > 0 || theirRegions.length > 0;

  const geoParams: Param[] = [
    {
      name: "City / Location",
      myVal: mine?.city ?? "Not specified",
      theirVal: theirs?.city ?? "Not specified",
      status: ps(cityMatch, !!(mine?.city || theirs?.city)),
    },
    {
      name: "Target regions",
      myVal:    myRegions.slice(0, 3).join(", ")    || "Not specified",
      theirVal: theirRegions.slice(0, 3).join(", ") || "Not specified",
      status: ps(regionOverlap >= 2, regionOverlap >= 1 || !hasRegionData),
    },
  ];
  const geoScore = aiScores.geographic_fit ?? scoreFromEvidence(geoParams);

  return [
    {
      id: "sector", label: "Sector & Vertical",
      score: sectorScore, color: "#6366F1",
      params: sectorParams,
      isEstimated: aiScores.sector_vertical == null,
    },
    {
      id: "stage", label: "Stage Fit",
      score: stageScore, color: "#10B981",
      params: stageParams,
      isEstimated: aiScores.stage_fit == null,
      context: stageContext,
    },
    {
      id: "thesis", label: isEcoPartner ? "Support Type Alignment" : "Investment Thesis",
      score: thesisScore, color: "#8B5CF6",
      params: thesisParams,
      isEstimated: aiScores.investment_thesis == null,
    },
    {
      id: "geographic", label: "Geographic Fit",
      score: geoScore, color: "#F59E0B",
      params: geoParams,
      isEstimated: aiScores.geographic_fit == null,
    },
  ];
}

const CAT_BG: Record<string, string> = {
  sector: "bg-indigo-500", stage: "bg-emerald-500",
  thesis: "bg-violet-500", geographic: "bg-amber-500",
};

function StatusBadge({ status }: { status: ParamStatus }) {
  const map: Record<ParamStatus, string> = {
    matched:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    partial:  "bg-amber-500/15  text-amber-400  border-amber-500/30",
    mismatch: "bg-red-500/15    text-red-400    border-red-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider ${map[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FIELDS = "id, full_name, business_name, sector, stage, city, verification_status, member_role, role_title, ask_categories, offer_categories, asks_summary";

function BreakdownPage() {
  const params   = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const profileAId = params.get("a");
  const profileBId = params.get("b");
  const projectId  = params.get("project");
  const initialScore = parseInt(params.get("score") ?? "70") || 70;

  const [isLoading,  setIsLoading]  = useState(true);
  const [mine,       setMine]       = useState<Profile | null>(null);
  const [theirs,     setTheirs]     = useState<Profile | null>(null);
  const [openCat,    setOpenCat]    = useState<number | null>(0);
  const [fitScore,      setFitScore]      = useState(initialScore);
  const [hasStoredEcoScore, setHasStoredEcoScore] = useState(false);
  const [projectStage,  setProjectStage]  = useState<string | null>(null);
  const [aiCatScores,   setAiCatScores]   = useState<AICategoryScores>({});
  const [aiSummary,    setAiSummary]    = useState<string | null>(null);
  const [aiRationale,  setAiRationale]  = useState<Record<string, string>>({});
  const [isRescoring,  setIsRescoring]  = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user?.id || !profileAId || !profileBId) return;
    void (async () => {
      setIsLoading(true);
      const [
        { data: profileA },
        { data: profileB },
        projectRes,
        scoreRes,
        ecoScoreRes,
      ] = await Promise.all([
        supabase.from("profiles").select(FIELDS).eq("id", profileAId).single(),
        supabase.from("profiles").select(FIELDS).eq("id", profileBId).single(),
        projectId
          ? supabase.from("projects").select("stage").eq("id", projectId).single()
          : Promise.resolve({ data: null }),
        projectId
          ? supabase
              .from("project_match_scores")
              .select("summary, rationale")
              .eq("project_id", projectId)
              .or(`investor_profile_id.eq.${profileAId},investor_profile_id.eq.${profileBId}`)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Ecosystem partner scores live in a separate table
        projectId
          ? supabase
              .from("ecosystem_match_scores")
              .select("fit_score, summary, rationale")
              .eq("project_id", projectId)
              .or(`eco_partner_profile_id.eq.${profileAId},eco_partner_profile_id.eq.${profileBId}`)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const isUserB = user.id === profileBId;
      setMine((isUserB ? profileB : profileA) as Profile ?? null);
      setTheirs((isUserB ? profileA : profileB) as Profile ?? null);
      const proj = (projectRes as { data: unknown }).data as { stage: string | null } | null;
      setProjectStage(proj?.stage ?? null);

      // Use ecosystem_match_scores if project_match_scores has no data (ecosystem partner view)
      const ecoRaw = (ecoScoreRes as { data: unknown }).data as { fit_score?: number; summary?: string; rationale?: Record<string, unknown> } | null;
      // If the ecosystem table has a stored fit_score, use it so the ring matches the discover card.
      if (ecoRaw?.fit_score != null) {
        setFitScore(ecoRaw.fit_score);
        setHasStoredEcoScore(true);
      }
      const scoreData = (
        (scoreRes as { data: unknown }).data ??
        ecoRaw
      ) as { summary?: string; rationale?: Record<string, unknown> } | null;
      const rat = scoreData?.rationale ?? {};
      const toNum = (v: unknown) => typeof v === "number" ? v : typeof v === "string" ? Number(v) || undefined : undefined;
      setAiCatScores({
        sector_vertical:   toNum(rat._cs_sector_vertical),
        stage_fit:         toNum(rat._cs_stage_fit),
        investment_thesis: toNum(rat._cs_investment_thesis),
        geographic_fit:    toNum(rat._cs_geographic_fit),
      });
      setAiSummary(scoreData?.summary ?? null);
      const ratText: Record<string, string> = {};
      for (const [k, v] of Object.entries(rat)) {
        if (!k.startsWith("_cs_") && typeof v === "string") ratText[k] = v;
      }
      setAiRationale(ratText);
      setIsLoading(false);
    })();
  }, [supabase, user?.id, profileAId, profileBId, projectId]);

  const categories  = useMemo(() => computeCategories(mine, theirs, fitScore, projectStage, aiCatScores), [mine, theirs, fitScore, projectStage, aiCatScores]);
  const catScores   = categories.map((c) => c.score);
  const catAxes     = categories.map((c) => c.label);

  useRadar(canvasRef, catAxes, catScores, 260);

  const allEstimated   = categories.every((c) => c.isEstimated);
  const someEstimated  = categories.some((c) => c.isEstimated);

  // Always use the fitScore from the database/API so it matches the main list
  // exactly, regardless of whether the category scores are AI-generated or estimated.
  const ringScore = fitScore;
  const circumf      = 2 * Math.PI * 28;
  const ringOffset   = circumf - (ringScore / 100) * circumf;
  const matchedCount  = categories.flatMap((c) => c.params).filter((p) => p.status === "matched").length;
  const partialCount  = categories.flatMap((c) => c.params).filter((p) => p.status === "partial").length;
  const mismatchCount = categories.flatMap((c) => c.params).filter((p) => p.status === "mismatch").length;
  const evidenceConflict = allEstimated && mismatchCount > 0;

  // If gaps outnumber matches in the evidence, cap at "Developing Match" regardless of score.
  const overallLabel = mismatchCount > matchedCount
    ? "Developing Match"
    : ringScore >= 80 ? "Strong Match"
    : ringScore >= 60 ? "Good Match"
    : "Developing Match";

  const myName    = displayName(mine);
  const theirName = displayName(theirs);

  const handleRescore = async () => {
    if (!projectId) return;
    setIsRescoring(true);
    setRescoreError(null);
    const isEcoPartner = mine?.member_role === "ecosystem_partner";
    try {
      let newScore: number | undefined;

      if (isEcoPartner) {
        // Ecosystem partner rescores via a different endpoint; startup owner is profileBId.
        const startupOwnerId = mine?.id === profileAId ? profileBId : profileAId;
        const res = await fetch("/api/ecosystem/score-company?rescore=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startup_id: startupOwnerId }),
        });
        const data = await res.json() as {
          error?: string;
          scores?: { project_id: string; fit_score: number }[];
        };
        if (!res.ok) {
          if (res.status === 402) setRescoreError("Insufficient credits. You need 1 Ad Credit to rescore.");
          else setRescoreError(data.error ?? `Error ${res.status} — try again.`);
          return;
        }
        newScore = projectId
          ? data.scores?.find((s) => s.project_id === projectId)?.fit_score
          : data.scores?.[0]?.fit_score;
        if (newScore != null) setHasStoredEcoScore(true);

        // Re-fetch AI summary + rationale from ecosystem_match_scores
        if (newScore != null && projectId) {
          const { data: fresh } = await supabase
            .from("ecosystem_match_scores")
            .select("summary, rationale")
            .eq("project_id", projectId)
            .or(`eco_partner_profile_id.eq.${profileAId},eco_partner_profile_id.eq.${profileBId}`)
            .maybeSingle();
          const freshData = fresh as { summary?: string; rationale?: Record<string, unknown> } | null;
          const rat = freshData?.rationale ?? {};
          const toNum = (v: unknown) => typeof v === "number" ? v : typeof v === "string" ? Number(v) || undefined : undefined;
          setAiCatScores({
            sector_vertical:   toNum(rat._cs_sector_vertical),
            stage_fit:         toNum(rat._cs_stage_fit),
            investment_thesis: toNum(rat._cs_investment_thesis),
            geographic_fit:    toNum(rat._cs_geographic_fit),
          });
          setAiSummary(freshData?.summary ?? null);
          const ratText: Record<string, string> = {};
          for (const [k, v] of Object.entries(rat)) {
            if (!k.startsWith("_cs_") && typeof v === "string") ratText[k] = v;
          }
          setAiRationale(ratText);
        }
      } else {
        // Investor or startup path.
        const res = await fetch(`/api/projects/${projectId}/generate-match?rescore=true`, { method: "POST" });
        const data = await res.json() as {
          error?: string;
          score?: { fit_score: number };
          scores?: { investor_profile_id?: string; fit_score: number }[];
        };
        if (!res.ok) {
          if (res.status === 402) setRescoreError("Insufficient credits. You need 1 Ad Credit to rescore.");
          else setRescoreError(data.error ?? `Error ${res.status} — try again.`);
          return;
        }
        newScore =
          data.score?.fit_score ??
          data.scores?.find((s) => s.investor_profile_id === profileBId || s.investor_profile_id === profileAId)?.fit_score;

        // Re-fetch AI scores + summary from project_match_scores (investor/startup only).
        if (newScore != null && projectId) {
          const { data: fresh } = await supabase
            .from("project_match_scores")
            .select("summary, rationale")
            .eq("project_id", projectId)
            .or(`investor_profile_id.eq.${profileAId},investor_profile_id.eq.${profileBId}`)
            .maybeSingle();
          const freshData = fresh as { summary?: string; rationale?: Record<string, unknown> } | null;
          const rat = freshData?.rationale ?? {};
          const toNum = (v: unknown) => typeof v === "number" ? v : typeof v === "string" ? Number(v) || undefined : undefined;
          setAiCatScores({
            sector_vertical:   toNum(rat._cs_sector_vertical),
            stage_fit:         toNum(rat._cs_stage_fit),
            investment_thesis: toNum(rat._cs_investment_thesis),
            geographic_fit:    toNum(rat._cs_geographic_fit),
          });
          setAiSummary(freshData?.summary ?? null);
          const ratText: Record<string, string> = {};
          for (const [k, v] of Object.entries(rat)) {
            if (!k.startsWith("_cs_") && typeof v === "string") ratText[k] = v;
          }
          setAiRationale(ratText);
        }
      }

      if (newScore != null) setFitScore(newScore);
      else setRescoreError("Score updated — refresh to see the latest.");
    } catch (e) {
      setRescoreError(e instanceof Error ? e.message : "Rescore failed — try again.");
    } finally {
      setIsRescoring(false);
    }
  };

  const isParticipant = user?.id === profileAId || user?.id === profileBId;
  const canRescore = !!projectId && isParticipant && (
    mine?.member_role === "investor" ||
    mine?.member_role === "startup"  ||
    mine?.member_role === "founder"  ||
    mine?.member_role === "ecosystem_partner"
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F4F4FF]">

      {/* Header */}
      <section className="border-b border-[#2A2A3E] bg-[#12121A] px-4 sm:px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={mine?.member_role === "ecosystem_partner" ? "/ecosystem" : "/matches"}
              className="text-sm text-indigo-400 hover:underline"
            >
              {mine?.member_role === "ecosystem_partner" ? "← Back to portfolio" : "← Back to matches"}
            </Link>
            {canRescore && (
              <div className="flex items-center gap-3">
                {rescoreError && (
                  <p className="text-xs text-rose-400">{rescoreError}</p>
                )}
                <button
                  type="button"
                  disabled={isRescoring || isLoading}
                  onClick={() => void handleRescore()}
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 transition-colors"
                  title="Costs 1 Ad Credit"
                >
                  {isRescoring ? (
                    <>
                      <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Rescoring…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .963L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                      </svg>
                      Rescore (1 cr)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">
                Deep-Dive Analytics
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#F4F4FF]">Compatibility Breakdown</h1>
              {!isLoading && (
                <p className="mt-1 text-sm text-[#8B8BA7]">
                  <span className="text-[#F4F4FF] font-medium">{myName}</span>
                  <span className="mx-2 text-[#2A2A3E]">×</span>
                  <span className="text-[#F4F4FF] font-medium">{theirName}</span>
                  <span className="ml-3 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                    Exoasia Intelligence Match
                  </span>
                </p>
              )}
            </div>

            {/* Overall fit ring */}
            {!isLoading && (
              <div className="flex items-center gap-4 rounded-2xl border border-[#2A2A3E] bg-[#1A1A26] px-5 py-4">
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="28" fill="none" stroke="#2A2A3E" strokeWidth="5.5" />
                  <circle cx="34" cy="34" r="28" fill="none" stroke="#6366F1" strokeWidth="5.5"
                    strokeLinecap="round" strokeDasharray={circumf} strokeDashoffset={ringOffset}
                    transform="rotate(-90 34 34)" />
                  <text x="34" y="39" textAnchor="middle" fill="#F4F4FF" fontSize="12" fontWeight="700" fontFamily="system-ui,sans-serif">
                    {ringScore}%
                  </text>
                </svg>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Overall Fit</p>
                  <p className="mt-1 text-sm font-bold text-[#F4F4FF]">{overallLabel}</p>
                  <p className="text-[11px] text-[#8B8BA7]">
                    {matchedCount} matched · {partialCount} partial · {mismatchCount} gap{mismatchCount !== 1 ? "s" : ""}
                  </p>
                  {evidenceConflict && (
                    <p className="mt-1 text-[10px] text-amber-400">Evidence shows gaps — rescore for Exoasia Intelligence dimension analysis</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#12121A]" />
            ))}
          </div>
        ) : (
          <>
            {/* AI match summary */}
            {(aiSummary || Object.keys(aiRationale).length > 0) && (
              <div className="rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  Exoasia Intelligence Match Summary
                </p>
                {aiSummary && (
                  <p className="text-sm text-[#C4C4D4] leading-relaxed">{aiSummary}</p>
                )}
                {Object.keys(aiRationale).length > 0 && (
                  <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
                    {Object.entries(aiRationale).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <dt className="shrink-0 capitalize text-[#8B8BA7]">{k.replace(/_/g, " ")}:</dt>
                        <dd className="text-[#C4C4D4]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}

            {/* 5-axis radar + accordion */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Radar */}
              <div className="lg:col-span-2 rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-6 flex flex-col items-center">
                <p className="self-start text-xs font-bold text-[#F4F4FF]">Exoasia Intelligence Dimension Scores</p>
                <p className="self-start text-[11px] text-[#8B8BA7] mt-0.5 mb-6">Per-dimension fit assessed by Exoasia Intelligence — rescore to update</p>
                <canvas ref={canvasRef} width={260} height={260} />
                <div className="mt-5 w-full space-y-2.5">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${CAT_BG[cat.id] ?? "bg-indigo-500"}`} />
                        <span className="text-[#8B8BA7]">{cat.label}</span>
                      </div>
                      <span className="font-bold text-[#F4F4FF]">{cat.score}%{cat.isEstimated ? " *" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accordion */}
              <div className="lg:col-span-3">
                <p className="text-xs font-bold text-[#F4F4FF] mb-4">Parameter Breakdown</p>
                <div className="space-y-2">
                  {categories.map((cat, idx) => {
                    const isOpen   = openCat === idx;
                    const matched  = cat.params.filter((p) => p.status === "matched").length;
                    const partial  = cat.params.filter((p) => p.status === "partial").length;
                    const mismatch = cat.params.filter((p) => p.status === "mismatch").length;
                    return (
                      <div key={cat.id} className="rounded-xl border border-[#2A2A3E] bg-[#12121A] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenCat(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1A1A26] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${CAT_BG[cat.id] ?? "bg-indigo-500"}`} />
                            <span className="text-sm font-semibold text-[#F4F4FF]">{cat.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              {matched > 0 && <span className="text-emerald-400">{matched}✓</span>}
                              {partial > 0 && <span className="text-amber-400">{partial}~</span>}
                              {mismatch > 0 && <span className="text-red-400">{mismatch}✗</span>}
                            </div>
                            {cat.isEstimated && (
                              <span className="rounded-full bg-[#2A2A3E] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#8B8BA7]" title="Estimated from evidence — rescore for AI-assessed value">
                                est.
                              </span>
                            )}
                            <span className="font-bold text-sm text-[#F4F4FF]" title={cat.isEstimated ? "Estimated from evidence — rescore for AI-assessed value" : "AI-assessed score for this dimension"}>{cat.score}%</span>
                            <svg className={`h-4 w-4 text-[#8B8BA7] transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-[#2A2A3E] px-4 py-3 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7] pb-1 border-b border-[#2A2A3E]">
                              <span>Evidence</span>
                              <div>
                                <p>{mine?.full_name || myName}</p>
                                {mine?.business_name && (
                                  <p className="mt-0.5 text-[9px] font-normal normal-case tracking-normal text-[#4A4A6A]">{mine.business_name}</p>
                                )}
                              </div>
                              <div>
                                <p>{theirs?.full_name || theirName}</p>
                                {theirs?.business_name && (
                                  <p className="mt-0.5 text-[9px] font-normal normal-case tracking-normal text-[#4A4A6A]">{theirs.business_name}</p>
                                )}
                              </div>
                            </div>
                            {cat.params.map((p) => (
                              <div key={p.name} className="grid grid-cols-3 gap-2 items-start">
                                <div>
                                  <p className="text-[11px] font-medium text-[#C4C4D4]">{p.name}</p>
                                  <StatusBadge status={p.status} />
                                </div>
                                <p className="text-xs text-[#8B8BA7] break-words">{p.myVal}</p>
                                <p className="text-xs text-[#8B8BA7] break-words">{p.theirVal}</p>
                              </div>
                            ))}
                            {cat.context && cat.context.length > 0 && (
                              <div className="border-t border-[#2A2A3E] pt-3 space-y-2">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A6A]">Context — not scored</p>
                                {cat.context.map((c) => (
                                  <div key={c.name} className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-medium text-[#8B8BA7]">{c.name}</p>
                                    <span className="rounded-full bg-[#1A1A26] border border-[#2A2A3E] px-2 py-0.5 text-[10px] text-[#8B8BA7]">{c.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI match note */}
            <div className="rounded-2xl bg-[#12121A] border border-[#2A2A3E] p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7] mb-2">Exoasia Intelligence Scoring Note</p>
              {allEstimated ? (
                <p className="text-sm text-[#C4C4D4] leading-relaxed">
                  {"The "}
                  <span className="font-bold text-[#F4F4FF]">{ringScore}%</span>
                  {" ring score is estimated — it is the average of four evidence-based dimension scores, not an Exoasia Intelligence judgment. Each dimension score is derived by directly matching profile fields (sector, stage, geography, thesis). The "}
                  <span className="text-[#8B8BA7]">Evidence</span>
                  {" rows show the profile data used to produce each estimate. Use the Rescore button to replace these estimates with the Exoasia Intelligence overall fit score and per-dimension scores."}
                </p>
              ) : (
                <p className="text-sm text-[#C4C4D4] leading-relaxed">
                  {"The "}
                  <span className="font-bold text-[#F4F4FF]">{fitScore}%</span>
                  {" overall score is Exoasia Intelligence's holistic judgment — it is not the sum or average of the dimension scores. Each Exoasia Intelligence-assessed dimension score is an independent evaluation of that aspect alone. The "}
                  <span className="text-[#8B8BA7]">Evidence</span>
                  {" rows show the profile data Exoasia Intelligence scored against — they do not calculate it. A dimension's score may differ from what the evidence rows suggest: Exoasia Intelligence weighs additional context such as profile completeness, semantic sector overlap, and cross-dimension signals that the simplified evidence rows don't capture."}
                  {someEstimated && <>{" Dimensions marked "}<span className="font-bold text-[#F4F4FF]">est.</span>{" are estimated from evidence and will be replaced with Exoasia Intelligence scores on rescore."}</>}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BreakdownPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-72 animate-pulse rounded-xl bg-[#12121A]" />
          <div className="h-4 w-48 animate-pulse rounded bg-[#12121A] mx-auto" />
        </div>
      </div>
    }>
      <BreakdownPage />
    </Suspense>
  );
}
