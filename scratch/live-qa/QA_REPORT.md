# Founders Arena live QA — 3 October 2026

Target: https://foundersarena.exoasia.org

Tested with the supplied founder account in headless Microsoft Edge: 33 initial routes, eight mobile views at 390 × 844, public authentication/invitation pages, project details, profile completeness, all three project data-room tabs, and selected forms/buttons. Small-screen authentication checks also used 390 × 600.

This is a broad founder/public QA pass, not complete validation of every role and transaction. Advisor/admin navigation correctly redirected this account; the ecosystem portfolio API returned 403. Investor, advisor, admin, paid-plan, real checkout/webhook, email delivery, real uploads, and full invitation acceptance require appropriate accounts or a staging environment. No purchases, messages, invitations, deletions, or profile edits were submitted. The KYC submission request was intercepted before reaching production.

Source references are from local commit `ec4acfc9cbaa288fd27e864f39ac8131f432ea07`. The deployed commit was not independently verified. The implementations below explain the observed behavior; deployment parity should be checked before patching.

## Confirmed findings

### QA-01 — High: unauthenticated API reveals account existence

**Reproduction:** From an anonymous browser request context, POST an email to `/api/auth/check-email`. The supplied account returned HTTP 200 with `{"exists":true}`; a nonexistent test address returned HTTP 200 with `{"exists":false}`. No login is required. Only those two addresses were checked.

**Impact:** Someone can determine whether a person has a platform account. The sign-in screen also intentionally distinguishes incorrect email from incorrect password.

**Origin:** [check-email route](../../src/app/api/auth/check-email/route.ts), lines 4–21, uses the privileged admin client to query profiles and returns an existence flag. [Sign-in](../../src/app/sign-in/page.tsx), lines 114–127, calls this endpoint after invalid credentials.

```ts
const admin = createAdminClient();
const { data } = await admin.from("profiles")
  .select("id").ilike("email", email.trim()).maybeSingle();
return NextResponse.json({ exists: !!data });
```

**Suggested fix:** Remove the public lookup and use the same invalid-credentials message for unknown email and wrong password. Apply abuse controls to authentication flows. If an internal account lookup is needed, protect it with an authorized staff role. Simply hiding the distinction in the UI leaves the API exposure intact.

**Acceptance check:** Anonymous requests cannot obtain account existence; failed login responses do not reveal which field is wrong.

### QA-02 — High: KYC submission accepts no document and writes a placeholder

**Reproduction:** Open `/documents` and click `Submit sec-certificate`. The page has no file input. The browser attempted a POST to Supabase's `member_documents` table containing:

```json
{
  "document_type": "sec-certificate",
  "status": "submitted",
  "file_path": "pending://sec-certificate/<timestamp>"
}
```

The request was intercepted and answered locally with a QA error. No document record was created in production; both document types remained missing.

**Impact:** The UI's submission action represents a KYC document as submitted without any underlying file. Members cannot provide reviewable evidence through this page.

**Origin:** [Documents page](../../src/app/documents/page.tsx), lines 37–50 and 89, wires the buttons to `submitPlaceholder`. [app-data helper](../../src/lib/app-data.ts), lines 537–550, directly inserts `status: "submitted"` and a `pending://` path.

**Suggested fix:** Add file selection and validated upload to private storage. Create the submission record only after upload succeeds, with the real storage key. Enforce member ownership, acceptable MIME types and size limits on the server; keep document access restricted to authorized reviewers. A draft placeholder should never have submitted status.

**Acceptance check:** No file means no submission; failed uploads do not create submitted rows; authorized reviewers can retrieve the actual uploaded document.

Evidence: [documents screenshot](evidence/deep-documents-intercepted.png), [captured page data](deep-results.json).

### QA-03 — Medium: payment confirmation appears without a payment

**Reproduction:** While logged in, navigate directly to `/payments/success` with no query parameters and without starting checkout. It displays `Payment successful` and says the payment has been processed.

**Impact:** This is a false confirmation and can make members expect credits they never purchased. This test did not show that credits were granted or that payment authorization can be bypassed.

**Origin:** [Payment success page](../../src/app/payments/success/page.tsx), lines 8–34. `session_id` is used only as an optional display reference; the success heading is unconditional. There is no payment-status fetch.

**Suggested fix:** Require an authenticated server-side lookup of a checkout/payment belonging to the current user. Render pending, paid, failed, or invalid states from the verified record. When the webhook is still pending, show a verification state instead of success. Continue granting credits only through verified backend processing.

**Acceptance check:** Missing, fabricated, unpaid, and another user's checkout IDs cannot show a verified success confirmation.

Evidence: [payment screenshot](evidence/deep-_payments_success.png).

### QA-04 — Medium: stage workflow buttons perform no user-visible action

**Reproduction:** On `/stage-4`, click `Back to Stage 3` and the first `Open` under the due diligence package. The URL and content stay unchanged. Console output is `stage-4-gate return` and `stage-4-portal Download due diligence package`. Other stage buttons use the same placeholder pattern.

**Origin:**

- [Stage 4](../../src/app/stage-4/page.tsx), lines 31–36: both handlers only call `console.log`; they serve Enter execution, Back to Stage 3, and all three portal Open buttons.
- [Stage 1](../../src/app/stage-1/page.tsx), lines 90–95: activation and RSVP handlers only log.
- [Stage 2](../../src/app/stage-2/page.tsx), lines 51–52: Submit documents only logs.
- [Stage 3](../../src/app/stage-3/page.tsx), lines 69–74: pathway/application handlers only log. The application form also cancels its default submission.

**Suggested fix:** Use actual navigation for Back to Stage 3, Submit documents, and event discovery. Implement the activation/pathway workflows and real authorized download/booking destinations. Enforce eligibility on the server for execution actions. Until those features exist, present a clear unavailable state instead of an enabled action.

**Acceptance check:** Each enabled CTA opens its intended workflow, downloads an authorized artifact, or gives a clear actionable eligibility message.

Evidence: [Stage 4 screenshot](evidence/ui-stage4-noop.png), [stage page captures](results.json).

### QA-05 — Medium: nomination acceptance page is unreachable through normal access rules

**Reproduction:** In an anonymous browser, open `/accept-nomination`. It redirects to `/sign-in`, rather than displaying the email/code verification form. The signed-in founder account was redirected from the same route to `/dashboard`.

**Origin:** [Access rules](../../src/lib/auth/access.ts), starting at line 3, omit `/accept-nomination` from both public paths and permitted member prefixes. [Middleware](../../middleware.ts), lines 51–55, redirects anonymous visitors. [AuthGate](../../src/app/_components/AuthGate.tsx), lines 21–23 and 85–86, also uses these rules. The [nomination page](../../src/app/accept-nomination/page.tsx) is explicitly designed to verify a code before offering account creation, and the [nomination API](../../src/app/api/ecosystem/nominate/route.ts) generates a destination at this URL.

**Impact:** The intended pre-registration verification entry is inaccessible. Full delivery and acceptance of a real nomination email were not tested, so additional invitation failures are not asserted.

**Suggested fix:** Treat this verification entry as public in the shared access rules. Review the invited-account redirect so legitimate nomination verification is not forced into the unrelated `/accept-invite` flow. Keep OTP validation server-side, expiring, rate limited, and single use. Verify the full new-user and existing-user invitation journeys on staging.

**Acceptance check:** A signed-out recipient can reach the verification form; a valid invitation completes the intended flow without dashboard/sign-in/accept-invite detours.

Evidence: `public_accept-nomination` in [UI captures](ui-results.json).

### QA-06 — Low: duplicate credit pricing rows disagree about the first matching run

**Reproduction:** Open `/payments` and select Startup under What Credits Buy. Investor unlock and investor profile rows appear twice. One Bulk AI Match Sweep row says `3 cr per sweep · applies on all tiers`; the other says `Free for first run · then 3 cr per sweep`. Matches also displays `Generate first matches for free`.

**Origin:** [Payments page](../../src/app/payments/page.tsx), lines 23–83, contains two sets of startup rows in `CREDIT_COSTS`. The renderer at line 920 filters by role and renders both sets. Duplicate investor unlock entries also share the same expansion state because it is keyed by action text.

**Suggested fix:** Define one row per action with a stable action ID. Derive costs and introductory allowances from the backend's shared policy. Reconcile first-run behavior with [bulk-generate](../../src/app/api/matches/bulk-generate/route.ts), lines 50–64, and the project generation endpoint before publishing the copy.

**Acceptance check:** Each action appears once; the displayed first-run and subsequent cost agree with the backend; expanding a row affects only that row.

Evidence: [payments screenshot](evidence/_payments.png), [mobile payments screenshot](evidence/mobile_payments.png).

## Additional source-only payment risks

These were found while tracing payment confirmation. They were not exercised against the live webhook because doing so could change credit balances. Deployment configuration and behavior remain unverified.

1. **Signature verification fails open if the secret is missing.** In [payment webhook](../../src/app/api/payments/webhook/route.ts), lines 20–29, verification runs only inside `if (webhookSecret)`. An unset secret allows processing without a verified signature. Suggested fix: reject requests or fail startup when the secret is missing; require a valid signature before processing any payment event.
2. **Webhook credit awards are not idempotent in this handler.** The same file updates a payment and then inserts a credit ledger entry for each paid event without first checking/claiming whether it was already processed. Retries can attempt duplicate awards. Database-side protections were not independently confirmed. Suggested fix: an atomic database transaction that claims a unique event/session, validates the existing payment and amount, transitions pending to paid once, and awards credits once. Test duplicate and concurrent delivery on staging.

## Results that should not be filed as confirmed bugs

- Matches loaded after a longer wait; early loading captures do not establish a permanent hang.
- An initial project data-room capture was blank while a chunk request was aborted. Rechecking the page and all three tabs succeeded; this is not a confirmed application crash.
- No horizontal document overflow appeared in the eight 390-pixel mobile checks. This is not a complete accessibility or device/browser audit.
- Missing documents, empty deals, no upcoming events, and no generated matches are valid states for this account.
- Founder attempts to reach advisor/admin features were denied as expected.

## Recommended implementation order

1. Close account enumeration and review webhook signature/idempotency risks.
2. Replace placeholder KYC with a real upload/review workflow.
3. Restore nomination entry and stage CTA behavior.
4. Verify payment confirmation against backend status.
5. Consolidate pricing policy and remove duplicate rows.

Local browser runners and evidence are in this folder. Runners read credentials from environment variables; no password or session state was saved to these files. Captures contain account/community data and should stay local unless redacted for sharing. Application source was not changed.
