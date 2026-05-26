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
  // Allow trailing content on the header line only when it is preceded by 2+
  // spaces/tabs (e.g. "PROJECT PROFILE    AS OF 5/21/2026").  A single space
  // after the header keyword means the keyword is part of a longer phrase
  // (e.g. "PROBLEM WORTH SOLVING"), so those lines are correctly rejected.
  const headerRe = new RegExp(
    `(?:^|\\n)[ \\t]*${escapeRegExp(sectionHeader)}(?:[ \\t]{2,}[^\\n]*)?(?:\\n|$)`,
    "i",
  );
  const match = headerRe.exec(text);
  if (!match) return "";

  const contentStart = match.index + match[0].length;
  let contentEnd = text.length;

  for (const nextHeader of nextHeaders) {
    const nextRe = new RegExp(
      `(?:^|\\n)[ \\t]*${escapeRegExp(nextHeader)}(?:[ \\t]{2,}[^\\n]*)?(?:\\n|$)`,
      "i",
    );
    const nextMatch = nextRe.exec(text.slice(contentStart));
    if (nextMatch) {
      const candidateEnd = contentStart + nextMatch.index;
      if (candidateEnd < contentEnd) contentEnd = candidateEnd;
    }
  }

  return text.slice(contentStart, contentEnd).trim();
}

/**
 * Extract bullet-point items from a block of text.
 * Recognises bullets: •  ·  -  *
 */
export function extractBulletItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      const m = t.match(/^[•·\-*]\s+(.+)$/) ?? t.match(/^[•·]\s*(.+)$/);
      return m?.[1]?.trim() ?? null;
    })
    .filter((item): item is string => item !== null && item.length > 0);
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
  const tabRe = new RegExp(
    `(?:^|\\n)[ \\t]*${escaped}\\t([^\\n]+)`,
    "i",
  );
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
  const singleSpaceRe = new RegExp(
    `(?:^|\\n)[ \\t]*${escaped} ([^\\n]+)`,
    "i",
  );
  const singleSpaceMatch = singleSpaceRe.exec(text);
  if (singleSpaceMatch?.[1]?.trim()) {
    const candidate = singleSpaceMatch[1].trim();
    const firstWord = (candidate.match(/^(\S+)/)?.[1] ?? "").toLowerCase();
    const wouldFormLongerLabel = KNOWN_FIELD_LABELS.some(
      (label) => label.toLowerCase() === `${fieldLabel.toLowerCase()} ${firstWord}`,
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
  const m = text.match(/AS OF\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
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
      ? targetRegionsRaw.split(",").map((r) => r.trim()).filter(Boolean)
      : [],
    primary_industries: primaryIndustriesRaw
      ? primaryIndustriesRaw.split(",").map((i) => i.trim()).filter(Boolean)
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
  if (!m) return { technology: null, business: null, investment: null, team: null };
  return {
    technology: parseFloat(m[1]),
    business: parseFloat(m[2]),
    investment: parseFloat(m[3]),
    team: parseFloat(m[4]),
  };
}

export function parseExecutiveSummary(summaryText: string): ExecutiveSummary {
  const assessment = parseAssessmentScores(summaryText);
  const strengthsText = extractSection(summaryText, "KEY STRENGTHS", ["PRIORITY ACTIONS"]);
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
  const findingsText = extractSection(sectionText, "FINDINGS", ["RECOMMENDATIONS"]);
  const recommendationsText = extractSection(sectionText, "RECOMMENDATIONS", []);
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

  // Locate each dimension header (line-anchored, same pattern as extractSection)
  const entries: Array<{ header: string; pos: number }> = [];
  for (const header of DIMENSION_HEADERS) {
    const re = new RegExp(
      `(?:^|\\n)[ \\t]*${escapeRegExp(header)}(?:[ \\t]{2,}[^\\n]*)?(?:\\n|$)`,
      "i",
    );
    const m = re.exec(text);
    if (m) entries.push({ header, pos: m.index });
  }
  entries.sort((a, b) => a.pos - b.pos);

  const result: Record<string, DimensionSection> = {};
  for (let i = 0; i < entries.length; i++) {
    const { header, pos } = entries[i];
    const contentStart = pos + header.length;
    const contentEnd =
      i + 1 < entries.length ? entries[i + 1].pos : text.length;
    result[header] = parseDimensionSection(
      text.slice(contentStart, contentEnd).trim(),
    );
  }

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

/**
 * Parse a full Venture Confidence Report from extracted PDF text.
 */
export function parseVentureReadinessText(text: string): VentureReadinessReport {
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
