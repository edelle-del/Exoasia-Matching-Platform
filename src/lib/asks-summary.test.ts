import { describe, expect, it } from "vitest";
import { formatAsksSummary } from "./asks-summary";

describe("formatAsksSummary", () => {
  it("turns an investor profile blob into a readable summary", () => {
    const raw = JSON.stringify({
      _v: 2,
      investor_type: "Angel Networks",
      entity_class: ["Angel"],
      investment_interests: ["Direct Investment in Startups"],
      target_regions: ["Global"],
      target_industries: ["AI"],
      target_stages: ["Pre-seed"],
      lp_check_min: "",
      lp_check_max: "10,000",
      direct_check_min: "10,000",
      direct_check_max: "100,000",
      anp_affiliated: true,
      demo_day_judge: "yes",
      referrals: [{ name: "Valerie Badilla", contact: "https://example.com" }],
    });

    expect(formatAsksSummary(raw)).toBe(
      "Angel Networks · Angel · Direct Investment in Startups · Regions: Global · Industries: AI · Stages: Pre-seed · Direct check: $10,000–$100,000 · LP check: up to $10,000",
    );
  });

  it("keeps legacy free-text asks", () => {
    expect(formatAsksSummary("Looking for a technical co-founder")).toBe(
      "Looking for a technical co-founder",
    );
  });

  it("hides unreadable JSON instead of dumping it", () => {
    expect(formatAsksSummary('{"unexpected":true}')).toBeNull();
    expect(formatAsksSummary("{not json")).toBeNull();
    expect(formatAsksSummary("")).toBeNull();
    expect(formatAsksSummary(null)).toBeNull();
  });
});
