import { describe, it, expect } from "vitest";
import {
  extractSection,
  extractBulletItems,
  extractFieldValue,
  parseReportDate,
  parseAssessmentScores,
  parseProjectProfile,
  parseExecutiveSummary,
  parseConclusion,
  parseDimensionSection,
  parseVentureReadinessText,
} from "./parser";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const FULL_REPORT_TEXT = `
Venture Confidence
Report

PROJECT PROFILE                          AS OF 5/21/2026

Venture    Sample
Project Name    Sample
Website    https://example.com
Industry    Healthcare
Location    Belize
Description    Sample
First Name    Sample
Last Name    Sample
Business Name    Sample
Phone    Sample
Role Title    Sample
City    Sample
Sector    Medtech
Short Bio    Sample
LinkedIn    Sample
Employee Band    11-50
Annual Revenue    20-100K
Role    Startup / Founder
Years In Operation
Referral Source    Referred by a Member
Referral Name    Sample
Target Regions    Asia Pacific, Latin America
Primary Industries    Mobility & Transportation
Fundraising Stage    Pre-seed
Product Stage    Traction
Co-founders    2
Technical Founder    Yes
Pitch Deck
Target Raise Min    10000
Target Raise Max    100000
PDPA    Yes
Additional Info    Sample

PROBLEM WORTH SOLVING

Radar Snapshot
IDEAS WORTH PURSUING    PROBLEM
RISK MITIGATION    75%    SOLUTION
                   50%
BM VIABILITY       25%    TEAM
SCALABILITY

VENTURE READINESS LEVEL

Readiness progression

Technology Readiness
Business Readiness
Investment Readiness
Team Readiness

0   1   2   3   4   5   6   7   8   9   10
Level progress

EXECUTIVE SUMMARY

Assessment snapshot — Technology: 2.0, Business: 2.0, Investment: 2.0, Team: 1.5.

KEY STRENGTHS
• Market need is clearly validated
• Unique value proposition differentiates from incumbents
• Customer interviews show strong enthusiasm

PRIORITY ACTIONS
• Secure early adopter commitments
• File provisional patents where applicable
• Develop a concise pitch deck highlighting differentiation
• Create a go-to-market roadmap
• Begin building a minimum viable product

CONCLUSION

Recommended next steps: Secure early adopter commitments ; File provisional patents where applicable

• Secure early adopter commitments
• File provisional patents where applicable
• Develop a concise pitch deck highlighting differentiation
• Create a go-to-market roadmap
• Begin building a minimum viable product

IDEAS WORTH PURSUING

FINDINGS
• Market need is clearly validated
• Unique value proposition differentiates from incumbents
• Customer interviews show strong enthusiasm
• Competitive landscape analysis confirms gap
• Intellectual property potential identified

RECOMMENDATIONS
• Secure early adopter commitments
• File provisional patents where applicable
• Develop a concise pitch deck highlighting differentiation
• Create a go-to-market roadmap
• Begin building a minimum viable product

PROBLEM

FINDINGS
• Problem is acute and quantifiable
• Target users experience high friction without solution
• Existing alternatives are costly or inefficient
• Pain points are documented across multiple segments
• Regulatory trends amplify urgency

RECOMMENDATIONS
• Quantify total addressable pain in monetary terms
• Gather case studies to illustrate impact
• Map user journey to pinpoint friction points
• Engage industry analysts for third-party validation
• Publish thought-leadership content to raise awareness

SOLUTION

FINDINGS
• Solution directly addresses core pain points
• Technology stack is scalable and modular
• Early prototypes demonstrate feasibility
• User feedback rates prototype >80% satisfaction
• Clear path to product-market fit identified

RECOMMENDATIONS
• Finalize MVP with prioritized feature set
• Conduct beta testing with a diverse user group
• Establish key performance metrics for adoption
• Iterate based on data-driven user insights
• Prepare documentation for regulatory compliance

TEAM

FINDINGS
• Founders possess complementary skill sets
• Domain expertise aligns with market needs
• Advisory board includes industry veterans
• Team has prior startup execution experience
• Roles and responsibilities are clearly defined

RECOMMENDATIONS
• Formalize equity and vesting agreements
• Identify gaps in sales or engineering and recruit accordingly
• Implement OKR framework for alignment
• Schedule regular board advisory sessions
• Invest in team development and retention programs

SCALABILITY

FINDINGS
• Current architecture supports moderate growth
• Customer acquisition cost is low but rising with scale
• Supply chain dependencies could become bottlenecks
• International market regulations not yet mapped
• Operational processes need automation

RECOMMENDATIONS
• Design a cloud-native infrastructure for elastic scaling
• Optimize CAC through referral and partnership programs
• Diversify suppliers and negotiate tiered contracts
• Map and preemptively address international regulations
• Automate key operational workflows to reduce overhead

BM VIABILITY

FINDINGS
• Revenue model is clearly defined and tested
• Multiple revenue streams identified
• Unit economics show positive trajectory
• Pricing strategy validated by early customers
• Path to profitability outlined in financial model

RECOMMENDATIONS
• Run financial projections for 3 and 5-year horizons
• Stress-test assumptions with scenario planning
• Identify key cost drivers and optimize early
• Build investor-ready financial dashboards
• Document customer lifetime value metrics

RISK MITIGATION

FINDINGS
• Major risks have been identified and documented
• Mitigation strategies are in place for top risks
• Regulatory risks are being monitored
• Technical risks are addressed in the roadmap
• Market risks are hedged through diversification

RECOMMENDATIONS
• Create a formal risk register and review quarterly
• Secure key person insurance for founders
• Establish legal protections for IP
• Build contingency plans for supply chain disruptions
• Engage compliance advisors for regulatory tracking
`.trim();

// ─── extractSection ───────────────────────────────────────────────────────────

describe("extractSection", () => {
  it("extracts content between two known headers", () => {
    const text = `EXECUTIVE SUMMARY\n\nSome content here.\n\nCONCLUSION\n\nOther content.`;
    const result = extractSection(text, "EXECUTIVE SUMMARY", ["CONCLUSION"]);
    expect(result).toBe("Some content here.");
  });

  it("returns empty string when header not found", () => {
    const result = extractSection("No relevant text.", "EXECUTIVE SUMMARY", [
      "CONCLUSION",
    ]);
    expect(result).toBe("");
  });

  it("returns content to end of text when no nextHeader matches", () => {
    const text = `SECTION A\nContent A`;
    const result = extractSection(text, "SECTION A", ["SECTION B"]);
    expect(result).toBe("Content A");
  });

  it("stops at the earliest matching nextHeader when multiple are provided", () => {
    const text = `SECTION A\nContent A\nSECTION B\nContent B\nSECTION C\nContent C`;
    const result = extractSection(text, "SECTION A", [
      "SECTION C",
      "SECTION B",
    ]);
    expect(result).toBe("Content A");
  });

  it("does not match PROBLEM WORTH SOLVING when searching for standalone PROBLEM", () => {
    const text = `PROBLEM WORTH SOLVING\n\nRadar text.\n\nPROBLEM\n\nDimension content.`;
    const result = extractSection(text, "PROBLEM", ["SOLUTION"]);
    // Should match the standalone PROBLEM, not PROBLEM WORTH SOLVING
    expect(result).toBe("Dimension content.");
  });

  it("is case-insensitive for the header", () => {
    const text = `executive summary\n\nContent here.`;
    const result = extractSection(text, "EXECUTIVE SUMMARY", []);
    expect(result).toBe("Content here.");
  });

  it("handles leading whitespace on header lines", () => {
    const text = `  SECTION A  \nContent`;
    const result = extractSection(text, "SECTION A", []);
    expect(result).toBe("Content");
  });

  it("trims extracted content", () => {
    const text = `SECTION A\n\n   Content   \n\nSECTION B`;
    const result = extractSection(text, "SECTION A", ["SECTION B"]);
    expect(result).toBe("Content");
  });

  it("matches OCR-spaced headers", () => {
    const text = `K E Y S T R E N GT H S\nContent here.\nP R I O R I T Y AC T I O N S`;
    const result = extractSection(text, "KEY STRENGTHS", ["PRIORITY ACTIONS"]);
    expect(result).toBe("Content here.");
  });
});

// ─── extractBulletItems ───────────────────────────────────────────────────────

describe("extractBulletItems", () => {
  it("extracts • bullet items", () => {
    const text = "• First item\n• Second item\n• Third item";
    expect(extractBulletItems(text)).toEqual([
      "First item",
      "Second item",
      "Third item",
    ]);
  });

  it("extracts - bullet items", () => {
    const text = "- First item\n- Second item";
    expect(extractBulletItems(text)).toEqual(["First item", "Second item"]);
  });

  it("extracts * bullet items", () => {
    const text = "* Alpha\n* Beta";
    expect(extractBulletItems(text)).toEqual(["Alpha", "Beta"]);
  });

  it("extracts · (middle dot) bullet items", () => {
    const text = "· Item one\n· Item two";
    expect(extractBulletItems(text)).toEqual(["Item one", "Item two"]);
  });

  it("ignores non-bullet lines", () => {
    const text = "Header line\n• Bullet item\nPlain line\n• Another bullet";
    expect(extractBulletItems(text)).toEqual(["Bullet item", "Another bullet"]);
  });

  it("returns empty array for empty string", () => {
    expect(extractBulletItems("")).toEqual([]);
  });

  it("returns empty array when no bullets present", () => {
    expect(extractBulletItems("Just some plain text here.")).toEqual([]);
  });

  it("trims each bullet item", () => {
    const text = "•   Padded item   ";
    expect(extractBulletItems(text)).toEqual(["Padded item"]);
  });

  it("handles mixed bullet styles in one block", () => {
    const text = "• Bullet A\n- Dash B\n* Star C";
    expect(extractBulletItems(text)).toEqual(["Bullet A", "Dash B", "Star C"]);
  });

  it("preserves items with special characters", () => {
    const text =
      "• User feedback rates prototype >80% satisfaction\n• Cost: $1M–$2M";
    const items = extractBulletItems(text);
    expect(items[0]).toBe("User feedback rates prototype >80% satisfaction");
    expect(items[1]).toBe("Cost: $1M–$2M");
  });

  it("extracts plain lines when bullets are omitted", () => {
    const text = `Market need is clearly validated\nUnique value proposition differentiates from incumbents\nCustomer interviews show strong enthusiasm`;
    expect(extractBulletItems(text)).toEqual([
      "Market need is clearly validated",
      "Unique value proposition differentiates from incumbents",
      "Customer interviews show strong enthusiasm",
    ]);
  });

  it("ignores OCR-style headers and page footers", () => {
    const text = `F I N D I N G S\n• Keep this line\n-- 3 of 6 --`;
    expect(extractBulletItems(text)).toEqual(["Keep this line"]);
  });
});

// ─── extractFieldValue ────────────────────────────────────────────────────────

describe("extractFieldValue", () => {
  it("extracts value from same-line with 2+ spaces", () => {
    const text = "Venture    Sample Company";
    expect(extractFieldValue(text, "Venture")).toBe("Sample Company");
  });

  it("extracts value from same-line with tab separator", () => {
    const text = "Venture\tSample Company";
    expect(extractFieldValue(text, "Venture")).toBe("Sample Company");
  });

  it("extracts value from separate line", () => {
    const text = "Venture\nSample Company";
    expect(extractFieldValue(text, "Venture")).toBe("Sample Company");
  });

  it("returns null when field is absent", () => {
    const text = "Website    https://example.com";
    expect(extractFieldValue(text, "Venture")).toBeNull();
  });

  it("returns null when field has no value (trailing spaces only)", () => {
    const text = "Years In Operation   \nReferral Source    Referred";
    expect(extractFieldValue(text, "Years In Operation")).toBeNull();
  });

  it("returns null when field label exists but value is next field label", () => {
    const text = "Years In Operation\nReferral Source    Referred by a Member";
    // "Referral Source" is a known field label so it should be rejected
    expect(extractFieldValue(text, "Years In Operation")).toBeNull();
  });

  it("does not confuse Role with Role Title", () => {
    const text = "Role Title    Lead Engineer\nRole    Startup / Founder";
    expect(extractFieldValue(text, "Role")).toBe("Startup / Founder");
    expect(extractFieldValue(text, "Role Title")).toBe("Lead Engineer");
  });

  it("extracts URL values correctly", () => {
    const text = "Website    https://example.com";
    expect(extractFieldValue(text, "Website")).toBe("https://example.com");
  });

  it("extracts comma-separated values as a single string", () => {
    const text = "Target Regions    Asia Pacific, Latin America";
    expect(extractFieldValue(text, "Target Regions")).toBe(
      "Asia Pacific, Latin America",
    );
  });

  it("handles multi-word field labels", () => {
    const text = "Business Name    Acme Corp";
    expect(extractFieldValue(text, "Business Name")).toBe("Acme Corp");
  });

  it("extracts numeric string values", () => {
    const text = "Target Raise Min    10000";
    expect(extractFieldValue(text, "Target Raise Min")).toBe("10000");
  });

  it("handles PDPA field", () => {
    const text = "PDPA    Yes";
    expect(extractFieldValue(text, "PDPA")).toBe("Yes");
  });

  it("works when field appears mid-text with surrounding content", () => {
    const text = `Industry    Healthcare\nLocation    Belize\nDescription    Sample`;
    expect(extractFieldValue(text, "Location")).toBe("Belize");
  });
});

// ─── parseReportDate ──────────────────────────────────────────────────────────

describe("parseReportDate", () => {
  it("extracts date from AS OF prefix", () => {
    expect(parseReportDate("PROJECT PROFILE    AS OF 5/21/2026")).toBe(
      "5/21/2026",
    );
  });

  it("returns null when date is absent", () => {
    expect(parseReportDate("PROJECT PROFILE")).toBeNull();
  });

  it("handles different valid date formats", () => {
    expect(parseReportDate("AS OF 1/1/2024")).toBe("1/1/2024");
    expect(parseReportDate("AS OF 12/31/2025")).toBe("12/31/2025");
  });

  it("is case-insensitive", () => {
    expect(parseReportDate("as of 5/21/2026")).toBe("5/21/2026");
  });

  it("handles extra whitespace after AS OF", () => {
    expect(parseReportDate("AS OF  5/21/2026")).toBe("5/21/2026");
  });

  it("handles OCR-spaced report dates", () => {
    expect(
      parseReportDate("PROJECT PROFILE         A S O F 5 / 2 1 / 2 0 2 6"),
    ).toBe("5/21/2026");
  });
});

// ─── parseAssessmentScores ────────────────────────────────────────────────────

describe("parseAssessmentScores", () => {
  it("extracts all four scores with em-dash separator", () => {
    const text =
      "Assessment snapshot — Technology: 2.0, Business: 2.0, Investment: 2.0, Team: 1.5.";
    const scores = parseAssessmentScores(text);
    expect(scores.technology).toBe(2.0);
    expect(scores.business).toBe(2.0);
    expect(scores.investment).toBe(2.0);
    expect(scores.team).toBe(1.5);
  });

  it("extracts scores with en-dash separator", () => {
    const text =
      "Assessment snapshot – Technology: 3.0, Business: 4.5, Investment: 2.5, Team: 3.5.";
    const scores = parseAssessmentScores(text);
    expect(scores.technology).toBe(3.0);
    expect(scores.business).toBe(4.5);
    expect(scores.investment).toBe(2.5);
    expect(scores.team).toBe(3.5);
  });

  it("extracts scores with hyphen separator", () => {
    const text =
      "Assessment snapshot - Technology: 1.0, Business: 1.0, Investment: 1.0, Team: 1.0.";
    const scores = parseAssessmentScores(text);
    expect(scores.technology).toBe(1.0);
    expect(scores.team).toBe(1.0);
  });

  it("returns all nulls when snapshot line is absent", () => {
    const scores = parseAssessmentScores("No snapshot here.");
    expect(scores).toEqual({
      technology: null,
      business: null,
      investment: null,
      team: null,
    });
  });

  it("handles integer scores (no decimal)", () => {
    const text =
      "Assessment snapshot — Technology: 5, Business: 7, Investment: 3, Team: 4.";
    const scores = parseAssessmentScores(text);
    expect(scores.technology).toBe(5);
    expect(scores.business).toBe(7);
    expect(scores.investment).toBe(3);
    expect(scores.team).toBe(4);
  });

  it("handles max score of 10", () => {
    const text =
      "Assessment snapshot — Technology: 10.0, Business: 10.0, Investment: 10.0, Team: 10.0.";
    const scores = parseAssessmentScores(text);
    expect(scores.technology).toBe(10.0);
  });
});

// ─── parseProjectProfile ─────────────────────────────────────────────────────

describe("parseProjectProfile", () => {
  const PROFILE_TEXT = `
Venture    Sample
Project Name    Sample Project
Website    https://example.com
Industry    Healthcare
Location    Belize
Description    Sample description
First Name    John
Last Name    Doe
Business Name    Acme Corp
Phone    +1-555-0100
Role Title    CEO
City    Manila
Sector    Medtech
Short Bio    Experienced founder
LinkedIn    Sample
Employee Band    11-50
Annual Revenue    20-100K
Role    Startup / Founder
Years In Operation
Referral Source    Referred by a Member
Referral Name    Jane Smith
Target Regions    Asia Pacific, Latin America
Primary Industries    Mobility & Transportation
Fundraising Stage    Pre-seed
Product Stage    Traction
Co-founders    2
Technical Founder    Yes
Pitch Deck
Target Raise Min    10000
Target Raise Max    100000
PDPA    Yes
Additional Info    Sample notes
`.trim();

  it("extracts basic string fields", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.venture).toBe("Sample");
    expect(profile.project_name).toBe("Sample Project");
    expect(profile.website).toBe("https://example.com");
    expect(profile.industry).toBe("Healthcare");
    expect(profile.location).toBe("Belize");
    expect(profile.sector).toBe("Medtech");
    expect(profile.fundraising_stage).toBe("Pre-seed");
    expect(profile.product_stage).toBe("Traction");
    expect(profile.technical_founder).toBe("Yes");
    expect(profile.pdpa).toBe("Yes");
  });

  it("extracts name fields correctly", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.first_name).toBe("John");
    expect(profile.last_name).toBe("Doe");
    expect(profile.business_name).toBe("Acme Corp");
  });

  it("extracts target regions as array", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.target_regions).toEqual(["Asia Pacific", "Latin America"]);
  });

  it("extracts primary industries as array", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.primary_industries).toEqual(["Mobility & Transportation"]);
  });

  it("parses target raise min/max as numbers", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.target_raise_min).toBe(10000);
    expect(profile.target_raise_max).toBe(100000);
  });

  it("returns null for empty Years In Operation", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.years_in_operation).toBeNull();
  });

  it("returns null for empty Pitch Deck", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.pitch_deck).toBeNull();
  });

  it("returns empty arrays when Target Regions is absent", () => {
    const profile = parseProjectProfile("Venture    Test");
    expect(profile.target_regions).toEqual([]);
    expect(profile.primary_industries).toEqual([]);
  });

  it("returns null raise amounts when fields are absent", () => {
    const profile = parseProjectProfile("Venture    Test");
    expect(profile.target_raise_min).toBeNull();
    expect(profile.target_raise_max).toBeNull();
  });

  it("does not confuse Role with Role Title", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.role_title).toBe("CEO");
    expect(profile.role).toBe("Startup / Founder");
  });

  it("extracts referral fields", () => {
    const profile = parseProjectProfile(PROFILE_TEXT);
    expect(profile.referral_source).toBe("Referred by a Member");
    expect(profile.referral_name).toBe("Jane Smith");
  });
});

// ─── parseExecutiveSummary ────────────────────────────────────────────────────

describe("parseExecutiveSummary", () => {
  const EXEC_TEXT = `
Assessment snapshot — Technology: 2.0, Business: 2.0, Investment: 2.0, Team: 1.5.

KEY STRENGTHS
• Market need is clearly validated
• Unique value proposition differentiates from incumbents
• Customer interviews show strong enthusiasm

PRIORITY ACTIONS
• Secure early adopter commitments
• File provisional patents where applicable
• Develop a concise pitch deck highlighting differentiation
`.trim();

  it("extracts assessment scores", () => {
    const result = parseExecutiveSummary(EXEC_TEXT);
    expect(result.assessment.technology).toBe(2.0);
    expect(result.assessment.business).toBe(2.0);
    expect(result.assessment.investment).toBe(2.0);
    expect(result.assessment.team).toBe(1.5);
  });

  it("extracts key strengths", () => {
    const result = parseExecutiveSummary(EXEC_TEXT);
    expect(result.key_strengths).toHaveLength(3);
    expect(result.key_strengths[0]).toBe("Market need is clearly validated");
    expect(result.key_strengths[2]).toBe(
      "Customer interviews show strong enthusiasm",
    );
  });

  it("extracts priority actions", () => {
    const result = parseExecutiveSummary(EXEC_TEXT);
    expect(result.priority_actions).toHaveLength(3);
    expect(result.priority_actions[0]).toBe("Secure early adopter commitments");
    expect(result.priority_actions[2]).toBe(
      "Develop a concise pitch deck highlighting differentiation",
    );
  });

  it("returns empty arrays when sections are absent", () => {
    const result = parseExecutiveSummary("Some random text.");
    expect(result.key_strengths).toEqual([]);
    expect(result.priority_actions).toEqual([]);
  });

  it("handles OCR-spaced section headers from the PDF", () => {
    const text = `
Assessment snapshot — Technology: 2.0, Business: 2.0, Investment: 2.0, Team: 1.5.

K E Y S T R E N GT H S
Market need is clearly validated
Unique value proposition differentiates from incumbents
Customer interviews show strong enthusiasm

P R I O R I T Y AC T I O N S
Secure early adopter commitments
File provisional patents where applicable
Develop a concise pitch deck highlighting differentiation
`.trim();

    const result = parseExecutiveSummary(text);
    expect(result.key_strengths).toHaveLength(3);
    expect(result.key_strengths[0]).toBe("Market need is clearly validated");
    expect(result.priority_actions).toHaveLength(3);
    expect(result.priority_actions[2]).toBe(
      "Develop a concise pitch deck highlighting differentiation",
    );
  });

  it("returns null scores when snapshot line is absent", () => {
    const result = parseExecutiveSummary(
      "KEY STRENGTHS\n• A strength\nPRIORITY ACTIONS\n• An action",
    );
    expect(result.assessment).toEqual({
      technology: null,
      business: null,
      investment: null,
      team: null,
    });
  });
});

// ─── parseConclusion ──────────────────────────────────────────────────────────

describe("parseConclusion", () => {
  it("extracts recommended next steps as a list", () => {
    const text = `
Recommended next steps: A ; B ; C

• Secure early adopter commitments
• File provisional patents where applicable
• Create a go-to-market roadmap
`.trim();
    const result = parseConclusion(text);
    expect(result.recommended_next_steps).toHaveLength(3);
    expect(result.recommended_next_steps[0]).toBe(
      "Secure early adopter commitments",
    );
    expect(result.recommended_next_steps[2]).toBe(
      "Create a go-to-market roadmap",
    );
  });

  it("returns empty array when no bullet items present", () => {
    const result = parseConclusion("Recommended next steps: Do things.");
    expect(result.recommended_next_steps).toEqual([]);
  });

  it("returns empty array for empty text", () => {
    expect(parseConclusion("").recommended_next_steps).toEqual([]);
  });

  it("extracts plain lines when the PDF omits bullet markers", () => {
    const text = `Recommended next steps: Secure early adopter commitments ; File provisional patents where applicable\nSecure early adopter commitments\nFile provisional patents where applicable\nCreate a go-to-market roadmap`;
    const result = parseConclusion(text);
    expect(result.recommended_next_steps).toEqual([
      "Secure early adopter commitments",
      "File provisional patents where applicable",
      "Create a go-to-market roadmap",
    ]);
  });
});

// ─── parseDimensionSection ────────────────────────────────────────────────────

describe("parseDimensionSection", () => {
  const SECTION_TEXT = `
FINDINGS
• Problem is acute and quantifiable
• Target users experience high friction without solution
• Existing alternatives are costly or inefficient

RECOMMENDATIONS
• Quantify total addressable pain in monetary terms
• Gather case studies to illustrate impact
• Map user journey to pinpoint friction points
`.trim();

  it("extracts findings", () => {
    const result = parseDimensionSection(SECTION_TEXT);
    expect(result.findings).toHaveLength(3);
    expect(result.findings[0]).toBe("Problem is acute and quantifiable");
    expect(result.findings[2]).toBe(
      "Existing alternatives are costly or inefficient",
    );
  });

  it("extracts recommendations", () => {
    const result = parseDimensionSection(SECTION_TEXT);
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0]).toBe(
      "Quantify total addressable pain in monetary terms",
    );
    expect(result.recommendations[2]).toBe(
      "Map user journey to pinpoint friction points",
    );
  });

  it("returns empty arrays when FINDINGS is absent", () => {
    const result = parseDimensionSection("RECOMMENDATIONS\n• Do something");
    expect(result.findings).toEqual([]);
    expect(result.recommendations).toEqual(["Do something"]);
  });

  it("returns empty arrays when RECOMMENDATIONS is absent", () => {
    const result = parseDimensionSection("FINDINGS\n• A finding");
    expect(result.findings).toEqual(["A finding"]);
    expect(result.recommendations).toEqual([]);
  });

  it("handles empty section text", () => {
    const result = parseDimensionSection("");
    expect(result.findings).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("finds 5 findings when provided", () => {
    const text = `FINDINGS
• F1
• F2
• F3
• F4
• F5
RECOMMENDATIONS
• R1`;
    const result = parseDimensionSection(text);
    expect(result.findings).toHaveLength(5);
  });
});

// ─── parseVentureReadinessText – integration ──────────────────────────────────

describe("parseVentureReadinessText", () => {
  it("extracts the report date", () => {
    const report = parseVentureReadinessText(FULL_REPORT_TEXT);
    expect(report.report_date).toBe("5/21/2026");
  });

  it("handles OCR-spaced headers in the full report", () => {
    const text = `
Venture Confidence
Report
PROJECT PROFILE         A S O F 5 / 2 1 / 2 0 2 6
Venture         Sample
Project Name    Sample
Website         https://example.com
Industry        Healthcare
Location        Belize
Description     Sample
First Name      Sample
Last Name       Sample
Business Name Sample
Phone   Sample
Role Title      Sample
City    Sample
Sector  Medtech
Short Bio       Sample
LinkedIn        Sample
Employee Band 11-50
Annual Revenue 20-100K
Role    Startup / Founder
Years In Operation
Referral Source Referred by a Member
Referral Name   Sample
Target Regions Asia Pacific, Latin America
Primary Industries Mobility & Transportation
Fundraising Stage Pre-seed
Product Stage   Traction
Co-founders     2
Technical Founder Yes
Pitch Deck
Target Raise Min 10000
Target Raise Max 100000
PDPA    Yes
Additional Info         Sample
EXECUTIVE SUMMARY
Assessment snapshot — Technology: 2.0, Business: 2.0, Investment: 2.0, Team: 1.5.

K E Y S T R E N GT H S
Market need is clearly validated
Unique value proposition differentiates from incumbents
Customer interviews show strong enthusiasm

P R I O R I T Y AC T I O N S
Secure early adopter commitments
File provisional patents where applicable
Develop a concise pitch deck highlighting differentiation

CONCLUSION
Recommended next steps: Secure early adopter commitments ; File provisional patents where applicable ; Develop a concise pitch deck highlighting differentiation
Secure early adopter commitments
File provisional patents where applicable
Develop a concise pitch deck highlighting differentiation

IDEAS WORTH PURSUING
F I N D I N G S
Market need is clearly validated
Unique value proposition differentiates from incumbents
Customer interviews show strong enthusiasm
R E C O M M E N DAT I O N S
Secure early adopter commitments
File provisional patents where applicable
Develop a concise pitch deck highlighting differentiation
`.trim();

    const report = parseVentureReadinessText(text);
    expect(report.report_date).toBe("5/21/2026");
    expect(report.executive_summary.key_strengths).toHaveLength(3);
    expect(report.executive_summary.priority_actions).toHaveLength(3);
    expect(report.conclusion.recommended_next_steps).toHaveLength(3);
    expect(report.sections.ideas_worth_pursuing.findings).toHaveLength(3);
    expect(report.sections.ideas_worth_pursuing.recommendations).toHaveLength(
      3,
    );
  });

  // Profile
  it("extracts profile.sector", () => {
    expect(parseVentureReadinessText(FULL_REPORT_TEXT).profile.sector).toBe(
      "Medtech",
    );
  });

  it("extracts profile.industry", () => {
    expect(parseVentureReadinessText(FULL_REPORT_TEXT).profile.industry).toBe(
      "Healthcare",
    );
  });

  it("extracts profile.target_regions as array", () => {
    const regions =
      parseVentureReadinessText(FULL_REPORT_TEXT).profile.target_regions;
    expect(regions).toContain("Asia Pacific");
    expect(regions).toContain("Latin America");
  });

  it("extracts profile.fundraising_stage", () => {
    expect(
      parseVentureReadinessText(FULL_REPORT_TEXT).profile.fundraising_stage,
    ).toBe("Pre-seed");
  });

  it("extracts profile.target_raise_min as number", () => {
    expect(
      parseVentureReadinessText(FULL_REPORT_TEXT).profile.target_raise_min,
    ).toBe(10000);
  });

  it("extracts profile.target_raise_max as number", () => {
    expect(
      parseVentureReadinessText(FULL_REPORT_TEXT).profile.target_raise_max,
    ).toBe(100000);
  });

  it("returns null for empty profile fields (Years In Operation)", () => {
    expect(
      parseVentureReadinessText(FULL_REPORT_TEXT).profile.years_in_operation,
    ).toBeNull();
  });

  // Executive summary
  it("extracts executive_summary.assessment scores", () => {
    const { assessment } =
      parseVentureReadinessText(FULL_REPORT_TEXT).executive_summary;
    expect(assessment.technology).toBe(2.0);
    expect(assessment.business).toBe(2.0);
    expect(assessment.investment).toBe(2.0);
    expect(assessment.team).toBe(1.5);
  });

  it("extracts executive_summary.key_strengths", () => {
    const strengths =
      parseVentureReadinessText(FULL_REPORT_TEXT).executive_summary
        .key_strengths;
    expect(strengths.length).toBeGreaterThanOrEqual(3);
    expect(strengths).toContain("Market need is clearly validated");
  });

  it("extracts executive_summary.priority_actions", () => {
    const actions =
      parseVentureReadinessText(FULL_REPORT_TEXT).executive_summary
        .priority_actions;
    expect(actions.length).toBeGreaterThanOrEqual(3);
    expect(actions).toContain("Secure early adopter commitments");
  });

  // Conclusion
  it("extracts conclusion.recommended_next_steps", () => {
    const steps =
      parseVentureReadinessText(FULL_REPORT_TEXT).conclusion
        .recommended_next_steps;
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps).toContain("Secure early adopter commitments");
  });

  // Dimension sections – IDEAS WORTH PURSUING
  it("extracts ideas_worth_pursuing findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.ideas_worth_pursuing;
    expect(findings).toHaveLength(5);
    expect(findings[0]).toBe("Market need is clearly validated");
  });

  it("extracts ideas_worth_pursuing recommendations", () => {
    const { recommendations } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.ideas_worth_pursuing;
    expect(recommendations).toHaveLength(5);
  });

  // Dimension sections – PROBLEM (must not be confused with PROBLEM WORTH SOLVING)
  it("extracts problem findings without conflating PROBLEM WORTH SOLVING", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.problem;
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toBe("Problem is acute and quantifiable");
  });

  it("extracts problem recommendations", () => {
    const { recommendations } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.problem;
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toBe(
      "Quantify total addressable pain in monetary terms",
    );
  });

  // SOLUTION
  it("extracts solution findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.solution;
    expect(findings[0]).toBe("Solution directly addresses core pain points");
  });

  // TEAM
  it("extracts team findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.team;
    expect(findings[0]).toBe("Founders possess complementary skill sets");
  });

  it("extracts team recommendations", () => {
    const { recommendations } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.team;
    expect(recommendations[0]).toBe("Formalize equity and vesting agreements");
  });

  // SCALABILITY
  it("extracts scalability findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.scalability;
    expect(findings[0]).toBe("Current architecture supports moderate growth");
  });

  // BM VIABILITY
  it("extracts bm_viability findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.bm_viability;
    expect(findings[0]).toBe("Revenue model is clearly defined and tested");
  });

  it("extracts bm_viability recommendations", () => {
    const { recommendations } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.bm_viability;
    expect(recommendations[0]).toBe(
      "Run financial projections for 3 and 5-year horizons",
    );
  });

  // RISK MITIGATION
  it("extracts risk_mitigation findings", () => {
    const { findings } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.risk_mitigation;
    expect(findings[0]).toBe("Major risks have been identified and documented");
  });

  it("extracts risk_mitigation recommendations", () => {
    const { recommendations } =
      parseVentureReadinessText(FULL_REPORT_TEXT).sections.risk_mitigation;
    expect(recommendations[0]).toBe(
      "Create a formal risk register and review quarterly",
    );
  });

  // Edge cases
  it("handles CRLF line endings", () => {
    const crlfText = FULL_REPORT_TEXT.replace(/\n/g, "\r\n");
    const report = parseVentureReadinessText(crlfText);
    expect(report.report_date).toBe("5/21/2026");
    expect(report.profile.sector).toBe("Medtech");
  });

  it("handles completely empty text gracefully", () => {
    const report = parseVentureReadinessText("");
    expect(report.report_date).toBeNull();
    expect(report.profile.venture).toBeNull();
    expect(report.executive_summary.key_strengths).toEqual([]);
    expect(report.sections.problem.findings).toEqual([]);
  });

  it("handles text with only a profile section", () => {
    const partialText = `PROJECT PROFILE    AS OF 1/1/2024\nVenture    MyVenture`;
    const report = parseVentureReadinessText(partialText);
    expect(report.profile.venture).toBe("MyVenture");
    expect(report.executive_summary.key_strengths).toEqual([]);
    expect(report.sections.problem.findings).toEqual([]);
  });

  it("returns empty dimension arrays when sections are missing", () => {
    const report = parseVentureReadinessText(
      "PROJECT PROFILE\nVenture    X\nEXECUTIVE SUMMARY\nAssessment snapshot — Technology: 1.0, Business: 1.0, Investment: 1.0, Team: 1.0.",
    );
    expect(report.sections.problem.findings).toEqual([]);
    expect(report.sections.scalability.recommendations).toEqual([]);
  });
});
