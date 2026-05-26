/**
 * E2E tests for the onboarding flow.
 *
 * Covers the startup happy path end-to-end:
 *   Role selection → Assessment gate → Profile form → Project form → Dashboard
 *
 * Run with:
 *   npm run test:e2e
 *
 * Requires a running dev server (started automatically) and valid .env.local with
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { test, expect, type Page } from "@playwright/test";
import { createAdminClient, createOrResetTestUser, deleteTestUser } from "./helpers";

// ─── Test user credentials ────────────────────────────────────────────────────

const TEST_EMAIL = "e2e.onboarding@test.local";
const TEST_PASSWORD = "E2eTest123!";

// ─── Shared setup/teardown ────────────────────────────────────────────────────

let testUserId: string;

test.beforeAll(async () => {
  const admin = createAdminClient();
  testUserId = await createOrResetTestUser(admin, TEST_EMAIL, TEST_PASSWORD);
  console.log(`\n  Test user: ${TEST_EMAIL} (${testUserId})`);
});

test.afterAll(async () => {
  const admin = createAdminClient();
  await deleteTestUser(admin, testUserId);
  console.log(`\n  Cleaned up test user: ${TEST_EMAIL}`);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/onboarding", { timeout: 15_000 });
}

async function selectFromDropdown(page: Page, inputPlaceholder: string, optionText: string) {
  const input = page.getByPlaceholder(inputPlaceholder);
  await input.click();
  await input.fill(optionText);
  // Options render inside the absolutely-positioned dropdown (z-20 class)
  await page.locator(".z-20").getByRole("button", { name: optionText, exact: true }).click();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Onboarding — startup flow", () => {
  test("shows role selection screen on first visit", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByRole("heading", { name: /What brings you to FOUNDERS ARENA/i }),
    ).toBeVisible();

    // All three role cards should be present
    await expect(page.locator("button").filter({ hasText: "Startup / Founder" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "Investor" })).toBeVisible();
    await expect(page.locator("button").filter({ hasText: "Ecosystem Partner" })).toBeVisible();
  });

  test("role confirmation modal appears and can be cancelled", async ({ page }) => {
    await signIn(page);

    // Click a role card
    await page.locator("button").filter({ hasText: "Investor" }).click();

    // Confirmation modal should appear
    await expect(page.getByText("Confirm your role")).toBeVisible();
    await expect(page.getByText("Your role cannot be changed after confirmation")).toBeVisible();

    // Cancel returns to role selection
    await page.getByRole("button", { name: "Go back" }).click();
    await expect(
      page.getByRole("heading", { name: /What brings you to FOUNDERS ARENA/i }),
    ).toBeVisible();
  });

  test("startup role → assessment gate", async ({ page }) => {
    await signIn(page);

    await page.locator("button").filter({ hasText: "Startup / Founder" }).click();
    await expect(page.getByText("Confirm your role")).toBeVisible();
    await page.locator("button").filter({ hasText: "Confirm — I'm a" }).click();

    // Assessment gate is startup-only
    await expect(
      page.getByRole("heading", { name: /Have you completed the Startup Readiness Assessment/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("investor role → skips assessment, goes straight to profile", async ({ page }) => {
    await signIn(page);

    await page.locator("button").filter({ hasText: /^Investor$/ }).click();
    await page.locator("button").filter({ hasText: "Confirm — I'm a" }).click();

    // Should land directly on the profile form (no Step N of M indicator for non-startups)
    await expect(
      page.getByRole("heading", { name: "Complete your profile" }),
    ).toBeVisible({ timeout: 5_000 });
    // Assessment gate should NOT appear
    await expect(
      page.getByRole("heading", { name: /Have you completed the Startup Readiness Assessment/i }),
    ).not.toBeVisible();

    // Reset for the next test: clear member_role
    const admin = createAdminClient();
    await admin.from("profiles").update({ member_role: null }).eq("id", testUserId);
  });

  test("full startup onboarding: role → skip assessment → profile → project → dashboard", async ({
    page,
  }) => {
    await signIn(page);

    // ── 1. Role selection ─────────────────────────────────────────────────────
    await page.locator("button").filter({ hasText: "Startup / Founder" }).click();
    await page.locator("button").filter({ hasText: "Confirm — I'm a" }).click();

    // ── 2. Assessment gate ────────────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /Have you completed the Startup Readiness Assessment/i }),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /Skip and fill in manually/i }).click();

    // ── 3. Profile form (Step 2 of 3) ─────────────────────────────────────────
    await expect(page.getByText("Step 2 of 3")).toBeVisible({ timeout: 5_000 });

    // Basic info
    await page.locator("#first_name").fill("E2E");
    await page.locator("#last_name").fill("Tester");
    await page.locator("#business_name").fill("E2E Startup Inc");
    await page.locator("#how_heard_about").selectOption("Social Media");
    await page.locator("#phone_whatsapp").fill("+639171234567");
    await page.locator("#years_in_operation").selectOption("1-3 years");
    await page.locator("#role_title").fill("Founder & CEO");
    await page.locator("#city").fill("Manila");

    // Sector (pill toggle — click a unique sector name)
    await page.locator("button").filter({ hasText: /^Fintech$/ }).first().click();

    // Bio & links
    await page.locator("#short_bio").fill("Building the future of fintech in Southeast Asia.");
    await page.locator("#linkedin_url").fill("https://linkedin.com/in/e2etestuser");

    // Employee & revenue
    await page.locator("#employee_band").selectOption("1-10");
    await page.locator("#annual_revenue_estimate").selectOption("Under $20K");

    // Startup-specific: Target Regions
    await selectFromDropdown(page, "Search regions…", "Asia Pacific");

    // Startup-specific: Target Industries
    await selectFromDropdown(page, "Search industries…", "Fintech");

    // Close any open dropdown by clicking a neutral area
    await page.locator("#first_name").click({ force: true });

    // Fundraising stage
    await page.locator("button").filter({ hasText: /^Pre-seed$/ }).click();

    // Product stage
    await page.locator("button").filter({ hasText: /^MVP$/ }).click();

    // Co-founders
    await page.locator('input[type="number"]').fill("2");

    // Target raise min / max
    await page.getByPlaceholder("100,000").fill("500000");
    await page.getByPlaceholder("1,000,000").fill("2000000");

    // PDPA consent
    await page.locator('input[type="checkbox"]').check();

    // Submit
    await page.locator('button[type="submit"]').click();

    // ── 4. Project form (Step 3 of 3) ─────────────────────────────────────────
    await expect(page.getByText("Step 3 of 3")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("e.g. SmartSupply PH").fill("E2E Test Project");
    await page.locator("button").filter({ hasText: /Save project/ }).click();

    // ── 5. Dashboard ──────────────────────────────────────────────────────────
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("returning user goes directly to profile form, skipping role selection", async ({ page }) => {
    // Simulate a returning user by setting member_role (and the fields the sign-in page
    // checks to determine needsOnboarding: full_name + sector).
    const admin = createAdminClient();
    await admin.from("profiles").upsert(
      {
        id: testUserId,
        member_role: "startup",
        full_name: "E2E Tester",
        business_name: "E2E Startup Inc",
        sector: "Fintech",
        account_status: "active",
      },
      { onConflict: "id" },
    );

    // Sign in manually — returning users are sent to /dashboard, not /onboarding,
    // because the sign-in page sees full_name + sector already set.
    await page.goto("/sign-in");
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

    // Navigate to /onboarding as a returning user would ("Update your profile" link)
    await page.goto("/onboarding");

    // Should skip role selection and show the profile form immediately
    await expect(
      page.getByRole("heading", { name: "Complete your profile" }),
    ).toBeVisible({ timeout: 10_000 });

    // Role selection step must NOT appear
    await expect(
      page.getByRole("heading", { name: /What brings you to FOUNDERS ARENA/i }),
    ).not.toBeVisible();

    // Role must display as locked (not editable)
    await expect(page.getByText("Startup / Founder")).toBeVisible();
    await expect(page.getByText("Locked")).toBeVisible();
  });
});
