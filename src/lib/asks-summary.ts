/**
 * profiles.asks_summary is either legacy free text or a JSON blob (_v: 2)
 * written by onboarding. Advisor screens must never render the raw JSON.
 */

type AsksRecord = Record<string, unknown>;

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function money(value: string): string {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return value;
  const formatted = Number(cleaned).toLocaleString("en-US");
  return `$${formatted}`;
}

function range(min: unknown, max: unknown): string | null {
  const a = asText(min);
  const b = asText(max);
  if (a && b) return `${money(a)}–${money(b)}`;
  if (a) return `from ${money(a)}`;
  if (b) return `up to ${money(b)}`;
  return null;
}

function formatStructuredAsks(data: AsksRecord): string | null {
  const parts: string[] = [];

  const investorType = asText(data.investor_type);
  if (investorType) parts.push(investorType);

  const entityClass = asList(data.entity_class);
  if (entityClass.length) parts.push(entityClass.join(", "));

  const interests = asList(data.investment_interests);
  if (interests.length) parts.push(interests.join(", "));

  const regions = asList(data.target_regions);
  if (regions.length) parts.push(`Regions: ${regions.join(", ")}`);

  const industries = asList(data.target_industries);
  if (industries.length) parts.push(`Industries: ${industries.join(", ")}`);

  const stages = asList(data.target_stages);
  if (stages.length) parts.push(`Stages: ${stages.join(", ")}`);

  const fundraising = asText(data.fundraising_stage);
  if (fundraising) parts.push(`Fundraising: ${fundraising}`);

  const product = asText(data.product_stage);
  if (product) parts.push(`Product: ${product}`);

  const raise = range(data.target_raise_min, data.target_raise_max);
  if (raise) parts.push(`Target raise: ${raise}`);

  const direct = range(data.direct_check_min, data.direct_check_max);
  if (direct) parts.push(`Direct check: ${direct}`);

  const lp = range(data.lp_check_min, data.lp_check_max);
  if (lp) parts.push(`LP check: ${lp}`);

  const support = asList(data.support_types);
  if (support.length) parts.push(`Support: ${support.join(", ")}`);

  return parts.length ? parts.join(" · ") : null;
}

export function formatAsksSummary(raw: string | null | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text.startsWith("{") || text.startsWith("[") ? null : text;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return typeof parsed === "string" ? parsed : null;
  }

  const data = parsed as AsksRecord;
  if (data._v !== 2) return null;
  return formatStructuredAsks(data);
}
