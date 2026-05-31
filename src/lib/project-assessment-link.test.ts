import { describe, expect, it } from "vitest";
import {
  buildProjectAssessmentRedirectUrl,
  compressProjectAssessmentData,
  createProjectAssessmentData,
  decompressProjectAssessmentData,
} from "./project-assessment-link";

describe("project assessment link helpers", () => {
  it("builds the canonical JSON payload", () => {
    expect(
      createProjectAssessmentData({
        owner_id: "  owner-42  ",
        name: "  SmartSupply PH  ",
        description: "  Route supplier orders automatically  ",
        stage: " MVP ",
        sector: " Fintech ",
      }),
    ).toEqual({
      owner_id: "owner-42",
      name: "SmartSupply PH",
      description: "Route supplier orders automatically",
      stage: "MVP",
      sector: "Fintech",
    });
  });

  it("compresses and decodes the payload round-trip", () => {
    const payload = {
      owner_id: "owner-42",
      name: "SmartSupply PH",
      description: "Route supplier orders automatically",
      stage: "MVP",
      sector: "Fintech",
    };

    const encoded = compressProjectAssessmentData(payload);

    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(decompressProjectAssessmentData(encoded)).toEqual(payload);
  });

  it("encodes the redirect URL with a base64 path segment", () => {
    const payload = {
      owner_id: "owner-42",
      name: "SmartSupply PH",
      description: "Route supplier orders automatically",
      stage: "MVP",
      sector: "Fintech",
    };

    const url = buildProjectAssessmentRedirectUrl(payload);

    // extract the last path segment (the encoded payload) so tests don't depend on the base URL
    const segment = url.substring(url.lastIndexOf("/") + 1);
    expect(segment.length).toBeGreaterThan(0);
    expect(decompressProjectAssessmentData(segment)).toEqual(payload);
  });
});
