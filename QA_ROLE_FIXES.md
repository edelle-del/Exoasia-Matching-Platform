# Founders Arena role QA and local fixes

Tested 3 October 2026 against https://foundersarena.exoasia.org and the local production build.

Admin, Founder, Ecosystem Partner, and Investor accounts all logged in successfully. The live pass covered dashboards, role-accessible navigation, desktop/mobile views, notifications, matches, projects, payments, documents, events, community, and available admin/advisor pages. Additional checks opened invitation/event forms and ecosystem discovery/portfolio controls. Production writes were blocked after login. No real purchases, uploads, invitations, credit grants, or database migrations were performed on production. This is a broad read-only QA pass; it does not certify every transactional workflow.

## Confirmed live findings and code changes

| Account / area | Finding and evidence | Origin in local source | Change |
| --- | --- | --- | --- |
| Admin: user search | `Dev,` returned HTTP 500 with a PostgREST filter parsing error; `Dev` returned 200. | [admin users API](src/app/api/admin/users/route.ts) interpolated search text into an unquoted `.or()` filter. | Added [quoted/escaped search filters](src/lib/admin-user-search.ts) and pagination validation. Local authenticated searches with commas, parentheses, and quotes now return 200. |
| Admin: credit balances | Founder showed 100,000 credits in admin while its own dashboard/payments showed 0. The grant expired after seven days. | [admin users API](src/app/api/admin/users/route.ts) summed ledger entries without applying expiry. | Uses the same [balance calculation](src/lib/credits-util.ts) as member pages. Local admin now reports 0 for that founder. |
| Investor: notifications | Match-job notification URLs navigated/prefetched `/api/jobs/<id>/acknowledge`, producing GET 405. | [notification API](src/app/api/notifications/route.ts), [notification page](src/app/notifications/page.tsx), [dashboard widget](src/app/dashboard/_components/MemberWidgets.tsx): POST action used as a link destination. | Links now go to `/matches`; acknowledgement is a separate POST on ordinary clicks. Local investor notification payload verified. |
| Ecosystem Partner: matches | `/matches` showed no projects while Portfolio → Discover showed 25 startup projects and 5 investor profiles. | [matches page](src/app/matches/page.tsx) used the generic matching flow; the generated-match API supports founder/investor flows. | Ecosystem accounts visiting `/matches` go to the existing `/ecosystem` discovery workflow. Verified locally. |
| Admin: Introductions | Live page exposed raw versioned `_v:2` asks JSON. | [introductions page](src/app/advisor/introductions/page.tsx). | The local source already uses `formatAsksSummary`. No new change was needed for this finding; production appears behind the local source. Verify after deploying. |
| Shared: pricing | Startup pricing repeated actions with conflicting descriptions of the free initial sweep. | [payments page](src/app/payments/page.tsx), duplicated `CREDIT_COSTS` rows. | Removed the duplicate rows and retained the authoritative costs. |
| Sign-in | Earlier live checks showed unauthenticated email existence responses. | [email-check API](src/app/api/auth/check-email/route.ts), [sign-in page](src/app/sign-in/page.tsx). | Retired enumeration endpoint (404) and removed separate account-existence checking from sign-in. |
| Founder: KYC | Earlier live document screen could mark documents submitted without uploading a file (`pending://` placeholder). | [documents page](src/app/documents/page.tsx), removed placeholder helper in [app-data](src/lib/app-data.ts). | Real multipart upload with a 10 MB limit, PDF/PNG/JPEG header validation, private storage, authorized short-lived downloads, and rejection of approval for missing/placeholder files. [Upload route](src/app/api/documents/upload/route.ts), [download route](src/app/api/documents/[id]/download/route.ts), [review API](src/app/api/advisor/documents/[id]/route.ts). Requires the KYC migration below. |
| Shared: payment confirmation | Earlier live `/payments/success` claimed success without a checkout or paid record. | [success page](src/app/payments/success/page.tsx), unconditional success display. | Owner-authenticated [status API](src/app/api/payments/status/route.ts), bounded polling, and separate pending/error/not-found/paid states. Local visit without a checkout shows “Checkout not found”. |
| Founder: stage actions | Earlier checks found several stage buttons that only logged to the console. | [Stage 1](src/app/stage-1/page.tsx), [Stage 2](src/app/stage-2/page.tsx), [Stage 3](src/app/stage-3/page.tsx), [Stage 4](src/app/stage-4/page.tsx). | Connected available onboarding/events/documents/deal-board workflows. Unimplemented enrollment, applications, booking, and download-package actions are explicitly disabled with “Coming soon”. Those features still need implementation. |
| Invitations: nomination acceptance | Earlier live checks found nomination acceptance redirected away before its token workflow could open. | [public-path rules](src/lib/auth/access.ts), [AuthGate](src/app/_components/AuthGate.tsx). | Allowed `/accept-nomination` as a public token-entry page and an exception for invited users. |

## Additional source defects fixed

These findings came from tracing the affected workflows in source; no malicious webhook or real purchase was sent to production.

- [Webhook](src/app/api/payments/webhook/route.ts) accepted requests without signature enforcement when the secret was absent. [PayMongo signature helper](src/lib/paymongo.ts) selected an empty test signature ahead of the live signature. It now fails closed, verifies the configured mode with constant-time comparison, and rejects stale signatures.
- Webhook payment/ledger updates were separate operations with no retry-safe fulfillment. [Payment migration](supabase/migrations/20261003000200_payment_fulfillment.sql) adds a service-role-only transaction that locks the payment, checks amount/member, awards once, updates the subscription, and rolls back on failure. Purchase terms are snapshotted at checkout rather than recalculated later.
- [Checkout API](src/app/api/payments/checkout/route.ts) ignored a pending-payment insert error while using a client subject to read-only payment policies. It now records through the server admin client, checks the insert, and uses a known local payment UUID in the confirmation URL.
- Free or expired plans could be treated as active. Added [shared subscription validation](src/lib/subscription.ts) to credits, matches, and payments.
- [Credit deduction](src/lib/credits.ts) could report success after a failed ledger insert. It now propagates failure.
- Environment files were not ignored by Git. [.gitignore](.gitignore) now excludes environment secrets and local QA dependencies/evidence. Existing user environment files and the pre-existing lockfile change were preserved.
- [Vitest configuration](vitest.config.ts) discovered bundled dependency test files inside `.next` after a build. Restored default dependency exclusions and excluded build/scratch artifacts so `npm test` works after `npm run build`.

## Validation

- All four roles: live login and local production-build login passed.
- Local browser regressions: punctuation searches; founder admin balance; denial of admin API access to other roles; ecosystem redirect; real document file controls; missing-checkout confirmation; safe investor notification URLs.
- Unit tests: 155 passed across five files. Updated stale credit-policy assertions and added signature, subscription, document validation, public access, and search regressions.
- TypeScript check and Next.js production build passed. The build required network access for Google Fonts. Next.js still warns about an unrelated parent-directory lockfile used to infer the workspace root.
- Isolated PostgreSQL/PGlite: [payment checks](scratch/sql-qa/verify.cjs) passed amount/owner validation, repeated and queued retries, single subscription extension, rollback on ledger failure, and service-only execution. This is not a multi-connection load test.
- Isolated PostgreSQL/PGlite: [KYC checks](scratch/sql-qa/verify-kyc.cjs) passed private-bucket settings, restricted insert metadata, denied member self-approval, and permitted reviewer approval.
- Read-only browser runners are in [scratch/live-qa](scratch/live-qa). Raw live JSON/screenshots are kept locally and ignored by Git because they contain member data. Credentials were supplied at runtime, not stored in the runners.

## Required before deployment

Apply [20261003000100_kyc_upload_access.sql](supabase/migrations/20261003000100_kyc_upload_access.sql) and [20261003000200_payment_fulfillment.sql](supabase/migrations/20261003000200_payment_fulfillment.sql) in the intended Supabase environment before deploying this code. No production migration or deployment has been performed.

Configure `PAYMONGO_WEBHOOK_SECRET` and `PAYMONGO_MODE` consistently with the provider. Existing pending checkouts lack the new purchase snapshot fields and intentionally require manual reconciliation; the new fulfillment function will not guess their terms. Existing placeholder KYC rows need a real document resubmission.

Run test-mode checkout/webhook and upload/reviewer/download workflows in a staging Supabase environment before production rollout. Missing stage features remain disabled pending product implementation. Other transactional workflows, real email delivery, payment-provider delivery/retries, and full production migration compatibility remain outside this read-only live pass.
