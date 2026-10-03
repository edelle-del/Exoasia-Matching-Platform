const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'reports');
const issues = [
  ['QA-01', 'Account existence exposed without login', 'High', 'Live confirmed · Earlier founder/public pass',
    'Anonymous requests to /api/auth/check-email returned exists:true for an existing account and exists:false for a nonexistent address. Sign-in distinguished unknown email from incorrect password.',
    'src/app/api/auth/check-email/route.ts; src/app/sign-in/page.tsx',
    'The public endpoint used a privileged profile lookup and sign-in called it after failed authentication.',
    'Retired the endpoint with HTTP 404 and removed the existence check from sign-in. Account-existence information is no longer returned by this endpoint.',
    'Local implementation completed. Further authentication abuse controls were recommended earlier but were not implemented in this work.'],
  ['QA-02', 'KYC documents submitted without a file', 'High', 'Live confirmed · Earlier founder/public pass',
    'The documents page had no file input. Clicking Submit attempted to insert status=submitted with a pending:// storage path. QA intercepted the request, so no production record was created.',
    'src/app/documents/page.tsx; src/lib/app-data.ts; src/app/api/documents/upload/route.ts; src/app/api/documents/[id]/download/route.ts; src/app/api/advisor/documents/[id]/route.ts; src/app/advisor/documents/page.tsx',
    'A placeholder helper inserted a submitted record directly. Reviewer file links used the stored path rather than an authorized download route. Existing owner-update policies also permitted changing review fields.',
    'Removed the placeholder helper. Added actual multipart uploads, 10 MB limit, PDF/PNG/JPEG file-header checks, private storage, owner/reviewer download authorization, 60-second download links, and storage existence checks before approval. Added policies preventing member self-approval.',
    'Local file controls and validation tests passed. Isolated SQL verified denied self-approval and allowed reviewer approval. Requires KYC migration; full storage upload/review/download remains a staging check. Old placeholders need resubmission.'],
  ['QA-03', 'Payment success displayed without a payment', 'Medium', 'Live confirmed · Earlier founder/public pass',
    'Opening /payments/success directly without checkout parameters displayed Payment successful. No evidence showed that this page itself awarded credits.',
    'src/app/payments/success/page.tsx; src/app/api/payments/status/route.ts',
    'The success heading was unconditional; session_id was only an optional display reference.',
    'Added an authenticated, owner-filtered payment-status endpoint and bounded polling. The page now distinguishes paid, pending, failed, missing/invalid checkout, and verification error.',
    'Local founder browser check confirmed a visit without a checkout shows Checkout not found. Real provider checkout/confirmation remains a staging check.'],
  ['QA-04', 'Stage workflow buttons did nothing', 'Medium', 'Live confirmed · Earlier founder/public pass',
    'Stage 4 Back to Stage 3 and due-diligence Open left the page unchanged and only logged to the console. Source tracing found the same pattern on other stages.',
    'src/app/stage-1/page.tsx; src/app/stage-2/page.tsx; src/app/stage-3/page.tsx; src/app/stage-4/page.tsx',
    'Activation, RSVP, document submission, pathway/application, execution gates, and portal handlers were console-only placeholders.',
    'Stage 1 activation opens onboarding and RSVP opens events. Stage 2 opens documents. Stage 4 returns to Stage 3, opens the deal board for execution, and opens documents for review. Unimplemented Stage 3 enrollment/applications and Stage 4 booking/download-package actions are disabled with Coming soon.',
    'Partial functional remediation: enabled actions navigate; unfinished features are clearly unavailable. Enrollment, application processing, appointment booking, and due-diligence package generation still need product implementation.'],
  ['QA-05', 'Nomination acceptance route was inaccessible', 'Medium', 'Live confirmed · Earlier founder/public pass',
    'Anonymous visitors to /accept-nomination were sent to sign-in; a signed-in founder was sent to the dashboard instead of the verification page.',
    'src/lib/auth/access.ts; src/app/_components/AuthGate.tsx; middleware/access consumers; src/app/accept-nomination/page.tsx',
    'Shared public access rules omitted the token-verification page. Invited-user redirects also forced the unrelated invitation flow.',
    'Added /accept-nomination to public entry paths and allowed invited accounts to open it. Existing server-side token/code validation remains in place.',
    'Access-rule regression tests passed. A real delivered nomination and complete new/existing-user acceptance journey still need staging verification.'],
  ['QA-06', 'Duplicate and conflicting Startup pricing rows', 'Low', 'Live confirmed · Earlier and four-role passes',
    'Startup pricing listed investor unlock/profile actions twice. Bulk sweep copy disagreed between applies on all tiers and free for first run.',
    'src/app/payments/page.tsx',
    'CREDIT_COSTS contained two sets of Startup rows, both rendered by the role filter; duplicate action names shared expansion state.',
    'Removed duplicate rows and retained the authoritative displayed costs and introductory allowance.',
    'Local change completed. Stale credit-policy unit assertions were updated to current fees. Every paid matching workflow was not exercised against production.'],
  ['QA-07', 'Admin search crashed on punctuation', 'Medium', 'Live confirmed · Four-role pass',
    'Admin user search Dev, returned HTTP 500 with a PostgREST filter parsing error; Dev returned HTTP 200.',
    'src/app/api/admin/users/route.ts; src/lib/admin-user-search.ts',
    'Search text was interpolated into an unquoted .or() filter expression.',
    'Added quoted filters with escaping for quotes/backslashes. Added integer pagination validation and a maximum page size.',
    'Authenticated local searches containing commas, parentheses, and quotes returned HTTP 200. Search-format regression tests passed.'],
  ['QA-08', 'Admin balances counted expired credits', 'Medium', 'Live confirmed · Four-role pass',
    'Admin listed 100,000 credits for the founder while the founder dashboard/payments showed 0. The seven-day grant had expired.',
    'src/app/api/admin/users/route.ts; src/lib/credits-util.ts',
    'The admin list summed ledger entries without applying expiry and debit allocation rules.',
    'Loaded expiry/creation fields and used the same calculateCurrentBalance helper as member balances.',
    'Local authenticated admin API now reports 0 for that founder, consistent with the member view.'],
  ['QA-09', 'Investor notifications navigated to a POST endpoint', 'Medium', 'Live confirmed · Four-role pass',
    'Match-job notifications pointed to /api/jobs/<id>/acknowledge. Link navigation/prefetch issued GET and received HTTP 405.',
    'src/app/api/notifications/route.ts; src/app/notifications/page.tsx; src/app/dashboard/_components/MemberWidgets.tsx',
    'A mutation endpoint was used as the notification destination. The notifications page did not separately acknowledge it.',
    'Notification href is now /matches, with acknowledgeHref for a separate POST on ordinary clicks. Network failures are handled before navigating. Removed unsupported notification guarantees about prospect counts/refunds.',
    'Local investor notification payload verified safe page links and separate acknowledgement endpoints. A real acknowledgement mutation was not sent during live QA.'],
  ['QA-10', 'Ecosystem matching showed no discoverable projects', 'Medium', 'Live confirmed · Four-role pass',
    'The ecosystem /matches page displayed no projects, while Portfolio → Discover exposed 25 startup projects and five investor profiles.',
    'src/app/matches/page.tsx; src/app/api/matches/generated/route.ts; existing /ecosystem discovery flow',
    'The generic matching page/API path supports founder and investor flows rather than the ecosystem workflow.',
    'Ecosystem accounts visiting /matches are redirected to the existing portfolio/discovery page at /ecosystem.',
    'Local ecosystem browser check verified the redirect. This reuses existing discovery; it does not add a new ecosystem matching algorithm.'],
  ['QA-11', 'Raw JSON displayed in Admin Introductions', 'Medium', 'Live confirmed · Four-role pass',
    'The live Introductions page rendered asks as raw {_v:2,...} onboarding data instead of readable profile information.',
    'src/app/advisor/introductions/page.tsx; src/app/advisor/members/[id]/page.tsx; src/lib/asks-summary.ts; src/lib/asks-summary.test.ts',
    'Structured asks_summary data was rendered directly in the live version. Local source already uses formatAsksSummary on Introductions and member details.',
    'No new source edit was required for this finding. The existing local formatter produces readable regions, industries, stages, and funding ranges; unreadable JSON is hidden rather than dumped.',
    'Formatter unit tests passed. Confirmed live evidence is for Introductions; not every admin member detail was verified live. Production appears behind local source, but deployed commit parity was not independently verified. Deploy and recheck.'],
  ['SRC-01', 'Webhook verification failed open without a secret', 'High', 'Source-only finding · Earlier and four-role tracing',
    'Signature checking was conditional on PAYMONGO_WEBHOOK_SECRET being present. No unsigned event was sent to production.',
    'src/app/api/payments/webhook/route.ts',
    'An unset secret bypassed verification and allowed event processing.',
    'The webhook now returns HTTP 503 when unconfigured and rejects invalid signatures before parsing/fulfillment.',
    'Signature helper tests passed. Production secret configuration and provider delivery need staging verification.'],
  ['SRC-02', 'Live signature selection could choose an empty test slot', 'High', 'Source-only finding · Four-role tracing',
    'The signature helper selected te before li using nullish fallback, so an empty test signature could mask the actual live signature.',
    'src/lib/paymongo.ts; src/lib/qa-regressions.test.ts',
    'Selection was not tied to the configured provider mode; timestamp freshness and constant-time comparison also needed enforcement.',
    'Selects the test/live signature according to PAYMONGO_MODE, validates its format, uses timingSafeEqual, and rejects timestamps outside five minutes.',
    'Tests passed for live signatures with empty test slots, wrong mode, missing secret, tampering, and stale timestamps. Configure mode consistently with PayMongo.'],
  ['SRC-03', 'Repeated or failed webhooks could award credits incorrectly', 'High', 'Source-only finding · Earlier and four-role tracing',
    'Payment update and credit insertion were separate operations without an atomic once-only claim. Provider retries could attempt repeated awards; partial failure could leave inconsistent state.',
    'src/app/api/payments/webhook/route.ts; src/app/api/payments/checkout/route.ts; supabase/migrations/20261003000200_payment_fulfillment.sql',
    'Fulfillment lacked transactional row locking and idempotency, and recalculated purchase terms rather than storing them with the checkout.',
    'Checkout snapshots credits, subscription duration, and purchase label. A service-role-only SQL function locks the payment, validates session amount/member, fulfills pending payments once, extends subscriptions, and rolls back on ledger failure.',
    'Isolated SQL passed duplicate/queued retry, single extension, amount/owner validation, rollback, and privilege checks. Not a multi-connection load test. Requires migration; old pending checkouts need manual reconciliation.'],
  ['SRC-04', 'Checkout ignored failed payment recording', 'High', 'Source-only finding · Four-role tracing',
    'The checkout handler inserted a pending payment through a user client despite read-only payment policies and ignored the insert error. Confirmation also relied on an undocumented provider URL placeholder.',
    'src/app/api/payments/checkout/route.ts',
    'The provider checkout could be returned without a usable local record for later reconciliation.',
    'Pending payments are inserted with the server admin client, errors are checked, and confirmation uses a preallocated local payment UUID. A failed insert does not return a checkout redirect.',
    'TypeScript/build passed. Real test-mode checkout and provider return behavior still need staging verification.'],
  ['SRC-05', 'Free or expired subscriptions appeared active', 'Medium', 'Source-only finding · Four-role tracing',
    'A truthy subscription plan string could treat free as subscribed; payments could display an expired plan as active.',
    'src/lib/subscription.ts; src/lib/credits.ts; src/app/matches/page.tsx; src/app/payments/page.tsx',
    'Subscription checks were inconsistent and did not uniformly inspect expiration.',
    'Added shared validation: free/missing plans are inactive; invalid or expired dates are inactive; a non-free plan with no expiry retains existing compatibility behavior.',
    'Regression tests passed for free, expired, invalid, and valid subscriptions.'],
  ['SRC-06', 'Credit deduction reported success after a failed write', 'Medium', 'Source-only finding · Four-role tracing',
    'The credit ledger insert could fail while the deduction helper returned as if it succeeded.',
    'src/lib/credits.ts; src/lib/credits.test.ts',
    'The database insert error was ignored.',
    'The helper checks the error and throws on failed deductions. Tests assert actual costs, free actions, insufficient balances, and failed ledger writes.',
    'Unit tests passed. This change does not redesign concurrent credit spending across all existing workflows.'],
  ['SRC-07', 'Environment secrets were not excluded from Git', 'Medium', 'Source-only repository finding · Four-role work',
    'Environment files were untracked but not excluded by the project ignore rules. No confirmed secret publication was found or asserted.',
    '.gitignore',
    'The ignore configuration lacked an environment-file pattern.',
    'Added .env* exclusion with an .env.example exception. Also ignored QA dependencies, raw result JSON, and evidence images. Preserved existing user environment files and the pre-existing lockfile change.',
    'Repository status no longer lists the environment files. Credentials were provided at runtime and not added to QA runner source.'],
  ['SRC-08', 'Unit tests failed after a production build', 'Low', 'Locally reproduced · Final regression run',
    'After npm run build, Vitest discovered bundled pdf-parse dependency tests inside .next. All 155 application tests passed, but two unrelated generated suites failed.',
    'vitest.config.ts',
    'Custom exclusions replaced default dependency exclusions and did not exclude build artifacts.',
    'Restored configDefaults.exclude and excluded .next, scratch, and existing E2E folders from the unit suite.',
    'Final npm test passed: five files, 155 tests. TypeScript and git diff --check also passed.'],
];
const actors = {
  'QA-01': ['Public visitor / anyone calling the unauthenticated endpoint; all account holders whose existence can be disclosed', 'Anonymous browser; founder account used as the known-existing address'],
  'QA-02': ['Founder submitting KYC; Admin / Advisor reviewing documents', 'Founder submission screen; reviewer access and policy fixes traced in source'],
  'QA-03': ['Logged-in member using the shared payment confirmation page', 'Founder; shared page may also affect Investor and Ecosystem Partner'],
  'QA-04': ['Founder using the Stage 1–4 journey', 'Founder; Stage 4 clicks reproduced live and other stage handlers traced in source'],
  'QA-05': ['Public nomination recipient; invited or existing member accepting a nomination', 'Anonymous visitor and signed-in Founder; invited-account exception traced in source'],
  'QA-06': ['Founder / Startup viewing pricing; other actors viewing the Startup pricing tab', 'Startup pricing tab in earlier Founder and subsequent role checks'],
  'QA-07': ['Admin searching the user directory', 'Admin'],
  'QA-08': ['Admin viewing member credits; Founder whose balance was misreported', 'Admin and Founder views compared'],
  'QA-09': ['Investor opening match-job notifications; any member receiving the same job-notification type', 'Investor'],
  'QA-10': ['Ecosystem Partner using Matches / portfolio discovery', 'Ecosystem Partner'],
  'QA-11': ['Admin / Advisor reviewing introductions and member information', 'Admin on Introductions; member-details formatter verified in local source, not every live detail page'],
  'SRC-01': ['Payment webhook caller; backend payment processing; purchasing members', 'Source-only; no unsigned production event sent'],
  'SRC-02': ['PayMongo live webhook sender; backend verifier; members awaiting payment fulfillment', 'Source-only with signature unit tests; no production provider transaction'],
  'SRC-03': ['PayMongo webhook retries; backend fulfillment; members buying credits or subscriptions', 'Source-only with isolated SQL checks; no real account balance changed'],
  'SRC-04': ['Member initiating checkout; backend checkout/payment recording', 'Source-only; no real checkout performed'],
  'SRC-05': ['Founder / Investor / Ecosystem Partner using shared subscription and credit features', 'Source-only with helper regression tests; not reproduced for every role live'],
  'SRC-06': ['Member performing a credit-consuming action; backend credit ledger', 'Source-only with simulated database-write failure tests'],
  'SRC-07': ['Developer / repository maintainer; indirectly all users if secrets were published', 'Local Git configuration; no confirmed secret publication'],
  'SRC-08': ['Developer / CI runner executing unit tests after a production build', 'Local developer test run'],
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const issueHtml = issue => {
  const [id,title,severity,evidence,observed,source,cause,change,status] = issue;
  if (!actors[id]) throw new Error('Missing account/actor mapping: ' + id);
  const [affected, checked] = actors[id];
  return `<article><div class="eyebrow">${escape(id)} · ${escape(severity)} · ${escape(evidence)}</div><h2>${escape(title)}</h2><div class="actor"><b>Affected account type / actor:</b> ${escape(affected)}<br><b>Account / actor actually checked:</b> ${escape(checked)}</div><p><b>Observed / impact.</b> ${escape(observed)}</p><p><b>Cause.</b> ${escape(cause)}</p><p><b>Changes.</b> ${escape(change)}</p><p><b>Validation / remaining work.</b> ${escape(status)}</p><div class="source"><b>Source files relative to the application root</b>${source.split('; ').map(s=>`<div>${escape(s)}</div>`).join('')}</div></article>`;
};
const pages = [];
pages.push(`<section class="page cover"><div class="eyebrow">EXOASIA · FOUNDERS ARENA</div><h1>QA findings<br>and local changes</h1><p class="subtitle">Consolidated earlier and four-role QA report<br>Testing date: 3 October 2026</p><div class="summary"><strong>19 findings</strong><span>11 live-confirmed findings · 8 source/local findings</span></div><p>This report combines the earlier founder/public audit, the Admin, Founder, Ecosystem Partner and Investor pass, and the fixes made in the local application.</p><p><b>Current state:</b> local changes completed; the raw-JSON formatter already existed locally; unfinished stage features are disabled. No production deployment or migrations were performed.</p><p><b>Verification:</b> 155 unit tests, TypeScript, production build, four-role local browser checks, and isolated payment/KYC SQL tests passed.</p><h3>Scope and limits</h3><p>The first pass covered 33 routes, eight 390 × 844 mobile views, authentication/invitation pages, project details, profile completeness, data-room tabs, and selected controls. The subsequent pass logged into all four supplied role accounts and checked their available pages, navigation, forms, and selected read-only APIs.</p><p>Production writes were blocked after login. No real purchase, upload, invitation, credit grant, message, profile edit, deletion, or migration was performed. This is a broad read-only audit, not certification of every transaction or every admin detail page.</p><p>No passwords, session tokens, private member screenshots, or raw member-data captures are included in this PDF. Source paths identify where to review the code.</p><div class="note">Severity is a QA triage assessment, not a claim of a demonstrated production exploit. Each finding identifies affected account types or system actors and separately names the account or actor actually checked. Shared-code impact is not a claim that the bug was reproduced under every role. Source-only findings are identified separately throughout.</div></section>`);
for (let i=0;i<issues.length;i+=2) pages.push(`<section class="page"><div class="running">FOUNDERS ARENA · CONSOLIDATED FINDINGS</div>${issues.slice(i,i+2).map(issueHtml).join('')}</section>`);
pages.push(`<section class="page"><div class="running">FOUNDERS ARENA · VALIDATION AND RELEASE NOTES</div><h2>Tests and evidence</h2><ul><li>All four supplied roles successfully logged into the live site and local production build.</li><li>Local browser checks passed for admin punctuation search, corrected founder balance, non-admin denial of the admin API, ecosystem routing, document file controls, missing-checkout confirmation, and investor notification links.</li><li>155 unit tests passed across five test files. Existing stale policy assertions were corrected; signature, subscription, upload validation, access, and search regressions were added.</li><li>TypeScript and Next.js production build passed. The build needed Google Fonts network access. Next.js still warns about a parent-directory lockfile when inferring the workspace root.</li><li>Payment SQL checks passed amount/owner validation, repeated and queued retries, once-only subscription extension, rollback after a ledger failure, and service-role execution restrictions.</li><li>KYC SQL checks passed private-bucket settings, insert restrictions, denied member self-approval, and allowed reviewer approval.</li><li>Final git diff --check passed; Git emitted line-ending conversion warnings.</li></ul><h2>Before deployment</h2><ol><li>Review and apply <code>supabase/migrations/20261003000100_kyc_upload_access.sql</code> and <code>supabase/migrations/20261003000200_payment_fulfillment.sql</code> in the intended Supabase environment before deploying the code.</li><li>Configure <code>PAYMONGO_WEBHOOK_SECRET</code> and <code>PAYMONGO_MODE</code> consistently with the provider.</li><li>Manually reconcile old pending checkouts without the new purchase snapshots. The fulfillment function intentionally does not guess their terms.</li><li>Ask members to resubmit old placeholder KYC documents with actual files.</li><li>Run test-mode payment/provider retries and real upload/review/download flows in staging, then verify the deployed admin JSON formatter.</li><li>Implement enrollment, applications, booking, and due-diligence downloads before enabling those actions.</li></ol><h3>Observations not filed as bugs</h3><p>Matches loaded after waiting; a rechecked data room and all tabs worked. Empty deals/events/matches and missing documents can be valid states. Founder access to admin/advisor pages and ecosystem APIs was correctly denied. Eight mobile checks showed no horizontal page overflow; a full accessibility/device audit was not performed.</p><h3>Supporting local records</h3><p><code>scratch/live-qa/QA_REPORT.md</code> is the historical pre-fix report. <code>QA_ROLE_FIXES.md</code> records the subsequent changes. Browser runners and SQL verification scripts are under <code>scratch/live-qa</code> and <code>scratch/sql-qa</code>. Historical source line numbers may have moved after edits.</p><p class="note">Application root: ${escape(root)}<br>Live site: https://foundersarena.exoasia.org<br>The deployed commit was not independently verified. Report statements about local fixes do not imply they are already live.</p></section>`);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Founders Arena — QA Findings and Changes</title><style>@page{size:A4;margin:16mm 16mm 18mm}*{box-sizing:border-box}body{margin:0;color:#17243b;font-family:Arial,sans-serif;font-size:10pt;line-height:1.45}.page{break-after:page}.page:last-child{break-after:auto;font-size:9pt;line-height:1.3}.page:last-child li{margin:5px 0}.page:last-child h2{font-size:14pt;margin:10px 0}.running{font-size:8pt;letter-spacing:1px;color:#526780;border-bottom:1px solid #ccd6e1;padding-bottom:9px;margin-bottom:22px}.eyebrow{color:#42647e;font-size:8pt;font-weight:bold;letter-spacing:.4px}h1{font-size:34pt;line-height:1.1;margin:22px 0}h2{font-size:16pt;line-height:1.2;margin:10px 0 15px}h3{font-size:11pt;margin:20px 0 8px}p{margin:10px 0}.subtitle{font-size:13pt;color:#526780}.summary{background:#edf3f7;border-left:5px solid #2c6a89;padding:18px;margin:26px 0}.summary strong{display:block;font-size:22pt}.summary span{display:block;margin-top:6px}article{break-inside:avoid;margin-bottom:28px;padding-bottom:22px;border-bottom:1px solid #dbe3eb}.actor{background:#eaf2f8;border-left:3px solid #2c6a89;padding:8px 10px;font-size:9pt;line-height:1.35}.source{background:#f4f6f9;padding:10px 12px;font-size:8pt;overflow-wrap:anywhere}.source b{display:block;margin-bottom:5px}.source div,code{font-family:Consolas,monospace;font-size:8pt;overflow-wrap:anywhere}.note{font-size:9pt;background:#f4f6f9;padding:12px;color:#44556b}li{margin:8px 0}ul,ol{padding-left:22px}</style></head><body>${pages.join('')}</body></html>`;
(async () => {
  fs.mkdirSync(output, { recursive:true });
  const htmlPath = path.join(output, 'Founders_Arena_QA_Findings_and_Changes.html');
  const pdfPath = path.join(output, 'Founders_Arena_QA_Findings_and_Changes.pdf');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const page = await browser.newPage();
  await page.setContent(html, {waitUntil:'load'});
  await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:8px;width:100%;padding:0 16mm;color:#667085;display:flex;justify-content:space-between"><span>Founders Arena · QA findings and local changes · 3 October 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'});
  await browser.close();
  console.log(JSON.stringify({pdf:pdfPath,findings:issues.length,plannedPages:pages.length,bytes:fs.statSync(pdfPath).size}));
})().catch(error=>{console.error(error.message);process.exit(1)});
