import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "./paymongo";
import { hasActiveSubscription } from "./subscription";
import { validateKycFile, KYC_MAX_BYTES } from "./kyc-documents";
import { canAccessPath } from "./auth/access";
import { adminUserSearchFilter } from "./admin-user-search";

afterEach(() => vi.unstubAllEnvs());

describe("webhook signatures", () => {
  const now = 1_790_000_000_000, timestamp = String(now / 1000), body = '{"data":{}}', secret = "test-secret";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  it("accepts the live signature even when the test slot is empty", () => {
    expect(verifyWebhookSignature(body, `t=${timestamp},te=,li=${signature}`, secret, "live", now)).toBe(true);
  });
  it("rejects a valid signature from the wrong mode", () => {
    expect(verifyWebhookSignature(body, `t=${timestamp},te=${signature},li=`, secret, "live", now)).toBe(false);
  });
  it("rejects missing configuration, tampered bodies and stale requests", () => {
    expect(verifyWebhookSignature(body, `t=${timestamp},te=${signature}`, "", "test", now)).toBe(false);
    expect(verifyWebhookSignature(body + " ", `t=${timestamp},te=${signature}`, secret, "test", now)).toBe(false);
    expect(verifyWebhookSignature(body, `t=${timestamp},te=${signature}`, secret, "test", now + 301_000)).toBe(false);
  });
});

describe("QA regressions", () => {
  it("never treats the free plan or an expired/malformed subscription as paid", () => {
    expect(hasActiveSubscription({ subscription_plan: "free" })).toBe(false);
    expect(hasActiveSubscription({ subscription_plan: "6mo", subscription_ends_at: "bad-date" })).toBe(false);
    expect(hasActiveSubscription({ subscription_plan: "6mo", subscription_ends_at: "2000-01-01" })).toBe(false);
    expect(hasActiveSubscription({ subscription_plan: "12mo", subscription_ends_at: "2099-01-01" })).toBe(true);
  });
  it("allows nomination verification while preserving admin route restrictions", () => {
    expect(canAccessPath("/accept-nomination", null)).toBe(true);
    expect(canAccessPath("/admin/users", "member")).toBe(false);
  });
  it("quotes comma, parentheses, backslashes and quotes in admin searches", () => {
    expect(adminUserSearchFilter("Dev,")).toContain('full_name.ilike."%Dev,%"');
    expect(adminUserSearchFilter('a"b\\(c)')).toContain('full_name.ilike."%a\\"b\\\\(c)%"');
  });
  it("rejects empty, oversized and disguised KYC uploads", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7");
    expect(validateKycFile("application/pdf", pdf.length, pdf)).toBeNull();
    expect(validateKycFile("application/pdf", 0, pdf)).not.toBeNull();
    expect(validateKycFile("application/pdf", KYC_MAX_BYTES + 1, pdf)).not.toBeNull();
    expect(validateKycFile("application/pdf", 6, new TextEncoder().encode("<html>"))).not.toBeNull();
  });
});
