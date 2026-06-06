import type {
  VentureReadinessReport,
  ProjectProfile,
  ExecutiveSummary,
  Conclusion,
  DimensionSection,
  DimensionSections,
  ReadinessScores,
} from "./types";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFlexibleTextPattern(text: string): string {
  return Array.from(text.trim())
    .map((char) => {
      if (/\s/.test(char)) return "\\s+";
      return `${escapeRegExp(char)}\\s*`;
    })
    .join("");
}

function buildFlexibleLinePattern(text: string): string {
  return `(?:^|\\n)[ \\t]*${buildFlexibleTextPattern(text)}(?:[ \\t]{2,}[^\\n]*)?(?:\\n|$)`;
}

function matchesFlexibleHeaderLine(line: string, header: string): boolean {
  const re = new RegExp(
    `^[ \\t]*${buildFlexibleTextPattern(header)}(?:[ \\t]{2,}.*)?$`,
    "i",
  );
  return re.test(line);
}

/**
 * Extract the text following `sectionHeader` up to the earliest match of any
 * header in `nextHeaders`.
 *
 * Headers must appear at the start of a line (with optional leading whitespace).
 * Trailing content on the same line is allowed (e.g. "PROJECT PROFILE    AS OF 5/21/2026"),
 * so the regex consumes everything through the trailing newline before content begins.
 *
 * Disambiguation note: callers that need to distinguish "PROBLEM" from
 * "PROBLEM WORTH SOLVING" should pass the more specific header in nextHeaders and
 * restrict the search text appropriately (see parseDimensionSections).
 */
export function extractSection(
  text: string,
  sectionHeader: string,
  nextHeaders: string[],
): string {
  const lines = text.split("\n");
  const collected: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (!inSection) {
      if (matchesFlexibleHeaderLine(line, sectionHeader)) {
        inSection = true;
      }
      continue;
    }

    if (nextHeaders.some((header) => matchesFlexibleHeaderLine(line, header))) {
      break;
    }

    collected.push(line);
  }

  return collected.join("\n").trim();
}

/**
 * Extract bullet-point items from a block of text.
 * Recognises bullets: •  ·  -  *
 */
export function extractBulletItems(text: string): string[] {
  const isNoiseLine = (line: string): boolean => {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized) return true;
    if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(normalized)) return true;
    if (/^assessment snapshot\b/i.test(normalized)) return true;
    if (/^recommended next steps:/i.test(normalized)) return true;

    const headerLikeLabels = [
      "PROJECT PROFILE",
      "EXECUTIVE SUMMARY",
      "CONCLUSION",
      "KEY STRENGTHS",
      "PRIORITY ACTIONS",
      "FINDINGS",
      "RECOMMENDATIONS",
      ...DIMENSION_HEADERS,
    ];

    return headerLikeLabels.some((label) => {
      const pattern = new RegExp(`^${buildFlexibleTextPattern(label)}$`, "i");
      return pattern.test(normalized);
    });
  };

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && !isNoiseLine(line));

  const bulletItems = lines
    .map((line) => {
      const bulletMatch =
        line.match(/^[•·\-*]\s+(.+)$/) ?? line.match(/^[•·]\s*(.+)$/);
      return bulletMatch?.[1]?.trim() ?? null;
    })
    .filter((item): item is string => item !== null && item.length > 0);

  if (bulletItems.length > 0) return bulletItems;
  if (lines.length <= 1) return [];

  return lines;
}

// All known field labels in the PROJECT PROFILE block, ordered longest-first to
// prevent "Role" matching before "Role Title" in the separate-line fallback.
const KNOWN_FIELD_LABELS: string[] = [
  "Years In Operation",
  "Business Name",
  "Project Name",
  "Fundraising Stage",
  "Target Raise Min",
  "Target Raise Max",
  "Primary Industries",
  "Target Regions",
  "Referral Source",
  "Referral Name",
  "Technical Founder",
  "Employee Band",
  "Annual Revenue",
  "Product Stage",
  "Co-founders",
  "Role Title",
  "Pitch Deck",
  "Additional Info",
  "First Name",
  "Last Name",
  "Short Bio",
  "LinkedIn",
  "Venture",
  "Website",
  "Industry",
  "Location",
  "Description",
  "Phone",
  "City",
  "Sector",
  "Role",
  "PDPA",
];

/**
 * Extract a single field value from a block of text.
 *
 * Attempts three patterns in order:
 *   1. "Label   value" – label followed by 2+ spaces (or a tab) on the same line.
 *   2. "Label\tvalue" – explicit tab separator.
 *   3. "Label\nvalue" – value on the next non-empty line, but only when that
 *      line does not start with another known field label.
 */
export function extractFieldValue(
  text: string,
  fieldLabel: string,
): string | null {
  const escaped = escapeRegExp(fieldLabel);

  // Pattern 1: same line, ≥2 spaces
  const sameLineRe = new RegExp(
    `(?:^|\\n)[ \\t]*${escaped}[ \\t]{2,}([^\\n]+)`,
    "i",
  );
  const sameLineMatch = sameLineRe.exec(text);
  if (sameLineMatch?.[1]?.trim()) return sameLineMatch[1].trim();

  // Pattern 2: tab separator
  const tabRe = new RegExp(`(?:^|\\n)[ \\t]*${escaped}\\t([^\\n]+)`, "i");
  const tabMatch = tabRe.exec(text);
  if (tabMatch?.[1]?.trim()) return tabMatch[1].trim();

  // Pattern 3: separate lines
  const sepRe = new RegExp(
    `(?:^|\\n)[ \\t]*${escaped}[ \\t]*\\n[ \\t]*([^\\n]+)`,
    "i",
  );
  const sepMatch = sepRe.exec(text);
  if (sepMatch?.[1]?.trim()) {
    const candidate = sepMatch[1].trim();
    const isAnotherField = KNOWN_FIELD_LABELS.some((label) => {
      const lc = label.toLowerCase();
      const cc = candidate.toLowerCase();
      return cc === lc || cc.startsWith(lc + " ") || cc.startsWith(lc + "\t");
    });
    if (!isAnotherField) return candidate;
  }

  // Pattern 4: single space separator — guard against matching a prefix of a
  // longer label (e.g. "Role " + "Title CEO" should not match for label "Role").
  const singleSpaceRe = new RegExp(`(?:^|\\n)[ \\t]*${escaped} ([^\\n]+)`, "i");
  const singleSpaceMatch = singleSpaceRe.exec(text);
  if (singleSpaceMatch?.[1]?.trim()) {
    const candidate = singleSpaceMatch[1].trim();
    const firstWord = (candidate.match(/^(\S+)/)?.[1] ?? "").toLowerCase();
    const wouldFormLongerLabel = KNOWN_FIELD_LABELS.some(
      (label) =>
        label.toLowerCase() === `${fieldLabel.toLowerCase()} ${firstWord}`,
    );
    const isAnotherField = KNOWN_FIELD_LABELS.some((label) => {
      const lc = label.toLowerCase();
      const cc = candidate.toLowerCase();
      return cc === lc || cc.startsWith(lc + " ") || cc.startsWith(lc + "\t");
    });
    if (!wouldFormLongerLabel && !isAnotherField) return candidate;
  }

  return null;
}

export function parseReportDate(text: string): string | null {
  const normalized = text.replace(/\s+/g, "");
  const m = normalized.match(/([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/);
  return m?.[1] ?? null;
}

export function parseProjectProfile(profileText: string): ProjectProfile {
  const f = (label: string) => extractFieldValue(profileText, label);

  const targetRegionsRaw = f("Target Regions");
  const primaryIndustriesRaw = f("Primary Industries");
  const raiseMinRaw = f("Target Raise Min");
  const raiseMaxRaw = f("Target Raise Max");

  return {
    venture: f("Venture"),
    project_name: f("Project Name"),
    website: f("Website"),
    industry: f("Industry"),
    location: f("Location"),
    description: f("Description"),
    first_name: f("First Name"),
    last_name: f("Last Name"),
    business_name: f("Business Name"),
    phone: f("Phone"),
    role_title: f("Role Title"),
    city: f("City"),
    sector: f("Sector"),
    short_bio: f("Short Bio"),
    linkedin: f("LinkedIn"),
    employee_band: f("Employee Band"),
    annual_revenue: f("Annual Revenue"),
    role: f("Role"),
    years_in_operation: f("Years In Operation"),
    referral_source: f("Referral Source"),
    referral_name: f("Referral Name"),
    target_regions: targetRegionsRaw
      ? targetRegionsRaw
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : [],
    primary_industries: primaryIndustriesRaw
      ? primaryIndustriesRaw
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean)
      : [],
    fundraising_stage: f("Fundraising Stage"),
    product_stage: f("Product Stage"),
    co_founders: f("Co-founders"),
    technical_founder: f("Technical Founder"),
    pitch_deck: f("Pitch Deck"),
    target_raise_min: raiseMinRaw ? parseFloat(raiseMinRaw) || null : null,
    target_raise_max: raiseMaxRaw ? parseFloat(raiseMaxRaw) || null : null,
    pdpa: f("PDPA"),
    additional_info: f("Additional Info"),
  };
}

export function parseAssessmentScores(text: string): ReadinessScores {
  const m = text.match(
    /Assessment snapshot\s*[—–\-]\s*Technology:\s*([\d.]+)[,.]?\s*Business:\s*([\d.]+)[,.]?\s*Investment:\s*([\d.]+)[,.]?\s*Team:\s*([\d.]+)/i,
  );
  if (!m)
    return { technology: null, business: null, investment: null, team: null };
  return {
    technology: parseFloat(m[1]),
    business: parseFloat(m[2]),
    investment: parseFloat(m[3]),
    team: parseFloat(m[4]),
  };
}

export function parseExecutiveSummary(summaryText: string): ExecutiveSummary {
  const assessment = parseAssessmentScores(summaryText);
  const strengthsText = extractSection(summaryText, "KEY STRENGTHS", [
    "PRIORITY ACTIONS",
  ]);
  const actionsText = extractSection(summaryText, "PRIORITY ACTIONS", []);
  return {
    assessment,
    key_strengths: extractBulletItems(strengthsText),
    priority_actions: extractBulletItems(actionsText),
  };
}

export function parseConclusion(conclusionText: string): Conclusion {
  return { recommended_next_steps: extractBulletItems(conclusionText) };
}

export function parseDimensionSection(sectionText: string): DimensionSection {
  const findingsText = extractSection(sectionText, "FINDINGS", [
    "RECOMMENDATIONS",
  ]);
  const recommendationsText = extractSection(
    sectionText,
    "RECOMMENDATIONS",
    [],
  );
  return {
    findings: extractBulletItems(findingsText),
    recommendations: extractBulletItems(recommendationsText),
  };
}

const DIMENSION_HEADERS = [
  "IDEAS WORTH PURSUING",
  "PROBLEM",
  "SOLUTION",
  "TEAM",
  "SCALABILITY",
  "BM VIABILITY",
  "RISK MITIGATION",
] as const;

function parseDimensionSections(text: string): DimensionSections {
  const empty: DimensionSection = { findings: [], recommendations: [] };

  const result: Record<string, DimensionSection> = {};
  let currentHeader: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentHeader) {
      result[currentHeader] = parseDimensionSection(
        currentLines.join("\n").trim(),
      );
    }
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const matchedHeader = DIMENSION_HEADERS.find((header) =>
      matchesFlexibleHeaderLine(line, header),
    );

    if (matchedHeader) {
      flush();
      currentHeader = matchedHeader;
      currentLines = [rawLine];
      continue;
    }

    if (currentHeader) currentLines.push(rawLine);
  }

  flush();

  return {
    ideas_worth_pursuing: result["IDEAS WORTH PURSUING"] ?? empty,
    problem: result["PROBLEM"] ?? empty,
    solution: result["SOLUTION"] ?? empty,
    team: result["TEAM"] ?? empty,
    scalability: result["SCALABILITY"] ?? empty,
    bm_viability: result["BM VIABILITY"] ?? empty,
    risk_mitigation: result["RISK MITIGATION"] ?? empty,
  };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value.trim()].filter(Boolean);
  }
  return [];
}

function normalizeConclusionText(text: string): string[] {
  const normalized = text.replace(/\r/g, "\n").trim();
  if (!normalized) return [];

  const withoutPrefix = normalized.replace(
    /^\s*Recommended next steps:\s*/i,
    "",
  );

  const items = withoutPrefix
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [withoutPrefix.trim()];
}

function mapRawVrrSections(
  sections:
    | Array<{
        title?: string;
        findings?: unknown;
        recommendations?: unknown;
      }>
    | undefined,
): DimensionSections {
  const empty: DimensionSection = { findings: [], recommendations: [] };
  const mapped: Record<string, DimensionSection> = {
    "IDEAS WORTH PURSUING": empty,
    PROBLEM: empty,
    SOLUTION: empty,
    TEAM: empty,
    SCALABILITY: empty,
    "BM VIABILITY": empty,
    "RISK MITIGATION": empty,
  };

  for (const section of sections ?? []) {
    const title = section.title?.toUpperCase().trim();
    if (!title || !(title in mapped)) continue;
    mapped[title] = {
      findings: toStringArray(section.findings),
      recommendations: toStringArray(section.recommendations),
    };
  }

  return {
    ideas_worth_pursuing: mapped["IDEAS WORTH PURSUING"],
    problem: mapped.PROBLEM,
    solution: mapped.SOLUTION,
    team: mapped.TEAM,
    scalability: mapped.SCALABILITY,
    bm_viability: mapped["BM VIABILITY"],
    risk_mitigation: mapped["RISK MITIGATION"],
  };
}

function isVentureReadinessReport(
  value: unknown,
): value is VentureReadinessReport {
  return (
    typeof value === "object" &&
    value !== null &&
    "profile" in value &&
    "executive_summary" in value &&
    "conclusion" in value &&
    "sections" in value
  );
}

export function normalizeVentureReadinessReport(
  report: unknown,
): VentureReadinessReport | null {
  if (!report || typeof report !== "object") return null;
  if (isVentureReadinessReport(report)) return report;

  const raw = report as {
    project?: Record<string, unknown>;
    summary?: Record<string, unknown>;
    ai_report?: Record<string, unknown>;
    generated_at?: unknown;
  };

  const project = raw.project ?? {};
  const summary = raw.summary ?? {};
  const aiReport = raw.ai_report ?? {};

  const profile = {
    venture: typeof project.name === "string" ? project.name : null,
    project_name: typeof project.name === "string" ? project.name : null,
    website: null,
    industry: null,
    location: null,
    description:
      typeof project.description === "string" ? project.description : null,
    first_name: null,
    last_name: null,
    business_name: null,
    phone: null,
    role_title: null,
    city: null,
    sector: typeof project.sector === "string" ? project.sector : null,
    short_bio: null,
    linkedin: null,
    employee_band: null,
    annual_revenue: null,
    role: null,
    years_in_operation: null,
    referral_source: null,
    referral_name: null,
    target_regions: [],
    primary_industries: [],
    fundraising_stage: typeof project.stage === "string" ? project.stage : null,
    product_stage: typeof project.stage === "string" ? project.stage : null,
    co_founders: null,
    technical_founder: null,
    pitch_deck: null,
    target_raise_min: null,
    target_raise_max: null,
    pdpa: null,
    additional_info: null,
  };

  const snapshot = typeof summary.snapshot === "string" ? summary.snapshot : "";
  const parsedSummary = parseExecutiveSummary(snapshot);

  const executiveSummary = {
    assessment: parsedSummary.assessment,
    key_strengths: toStringArray(summary.strengths).length
      ? toStringArray(summary.strengths)
      : parsedSummary.key_strengths,
    priority_actions: toStringArray(summary.priorities).length
      ? toStringArray(summary.priorities)
      : parsedSummary.priority_actions,
  };

  return {
    report_date:
      typeof raw.generated_at === "string"
        ? raw.generated_at
        : typeof project.created_at === "string"
          ? project.created_at
          : null,
    profile,
    executive_summary: executiveSummary,
    conclusion: {
      recommended_next_steps: normalizeConclusionText(
        typeof summary.conclusion === "string" ? summary.conclusion : "",
      ),
    },
    sections: mapRawVrrSections(
      Array.isArray(aiReport.sections) ? aiReport.sections : undefined,
    ),
  };
}

/**
 * Parse a full Venture Confidence Report from extracted PDF text.
 */
export function parseVentureReadinessText(
  text: string,
): VentureReadinessReport {
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const profileText = extractSection(t, "PROJECT PROFILE", [
    "PROBLEM WORTH SOLVING",
    "VENTURE READINESS LEVEL",
    "EXECUTIVE SUMMARY",
  ]);

  const executiveSummaryText = extractSection(t, "EXECUTIVE SUMMARY", [
    "CONCLUSION",
    "IDEAS WORTH PURSUING",
  ]);

  const conclusionText = extractSection(t, "CONCLUSION", [
    "IDEAS WORTH PURSUING",
  ]);

  // Dimension sections are searched only in the portion of text that starts at
  // the CONCLUSION heading so that radar-chart axis labels ("PROBLEM", "TEAM"
  // etc. appearing earlier in the doc) are not mistaken for section headers.
  const conclusionRe = /(?:^|\n)[ \t]*CONCLUSION(?:[ \t]{2,}[^\n]*)?(?:\n|$)/i;
  const conclusionMatch = conclusionRe.exec(t);
  const afterConclusion = conclusionMatch ? t.slice(conclusionMatch.index) : t;

  return {
    report_date: parseReportDate(t),
    profile: parseProjectProfile(profileText),
    executive_summary: parseExecutiveSummary(executiveSummaryText),
    conclusion: parseConclusion(conclusionText),
    sections: parseDimensionSections(afterConclusion),
  };
}
