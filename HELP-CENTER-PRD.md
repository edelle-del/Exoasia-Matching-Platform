# Help Center PRD — Founders Arena

> **Product:** Founders Arena by Exoasia  
> **Document type:** Product Requirements Document + Help Center Content Source  
> **Reference design:** [Ceevee Documentation](https://cv-ai.work/docs)  
> **Version:** v1.0 — June 2026  
> **Route target:** `/docs` (public or signed-in, TBD)

---

## 1. Purpose

This PRD defines the **Help Center** for Founders Arena — a documentation experience members, partners, and operators use to learn the platform without contacting support.

It serves two roles:

1. **Product spec** — layout, navigation, UX patterns, and implementation requirements for the `/docs` page.
2. **Content source** — complete copy, structure, tables, tips, and FAQ ready to drop into MDX or a CMS.

The Help Center is **not** internal engineering documentation. It mirrors the member-facing tone and step-by-step style of [Ceevee's docs](https://cv-ai.work/docs): plain language, numbered flows, feature tables, tips, screenshot placeholders, and a searchable sidebar.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Reduce onboarding support tickets | ↓ 30% "how do I…" tickets within 60 days of launch |
| Improve self-serve activation | ↑ % of new members who complete profile + first AI score within 7 days |
| Increase intro conversion | ↑ % of scored pairs that become accepted intros |
| Keep legal/compliance visible | 100% of Stage 3+ comms link to disclaimer section |

**Non-goals:** API reference, database schema, internal agent configuration (see `AGENTS.md` and `founders-arena-product-document.md` for those).

---

## 3. UX Specification (Ceevee-style)

### 3.1 Page layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo · Docs · Sign In · Get Started                │
├──────────────┬──────────────────────────────────────────────┤
│              │  # Documentation                             │
│  Sidebar     │  Everything you need to use Founders Arena.  │
│  (sticky)    │                                              │
│              │  ## Getting Started                          │
│  · Getting   │  ### 1. Receive your invite                  │
│    Started   │  [screenshot]                                │
│  · Profile   │  ### 2. Complete onboarding                  │
│  · AI Match  │  ...                                         │
│  · Intros    │                                              │
│  · Deal Board│  > Tip: Keep your ASK/OFFER updated...       │
│  · Data Room │                                              │
│  · Credits   │  ## FAQ                                      │
│  · Partners  │  ...                                         │
│  · Account   │                                              │
│  · FAQ       │  [ CTA: Ready to get started? ]              │
└──────────────┴──────────────────────────────────────────────┘
```

### 3.2 Layout rules (match Ceevee)

| Element | Spec |
|---|---|
| **Max content width** | ~720px reading column; sidebar ~240px |
| **Sidebar** | Sticky; anchor links scroll main content; active section highlighted on scroll |
| **Mobile** | Sidebar collapses to hamburger or horizontal pill nav |
| **Typography** | H1 page title → H2 sections → H3 subsections; body 16px, comfortable line-height |
| **Screenshots** | Full-width within content column; caption below in muted text |
| **Tips** | Blockquote or tinted callout: `Tip:` prefix |
| **Notes** | Muted callout for plan-gated or role-specific features: `Note:` prefix |
| **Tables** | Full-width; zebra optional; used for status definitions, plans, score tiers |
| **Search** | Top-of-sidebar or header search filtering section titles + body (Phase 2) |
| **Footer CTA** | Bottom banner: "Ready to join Founders Arena?" → Sign In / Get Invited |
| **Theme** | Light docs surface (readable long-form); brand accent `#FF6B1F` for links and active nav |

### 3.3 Content patterns (reuse from Ceevee)

Every feature section should follow this template where applicable:

1. **One-line purpose** — what this feature does and who it's for  
2. **Step-by-step** — numbered list for primary happy path  
3. **Sub-features** — bullet list with bold labels  
4. **Screenshot placeholder** — `[Screenshot: {filename}]` + caption  
5. **Tip** — optional best-practice callout  
6. **Table** — statuses, tiers, or plan comparison when useful  

### 3.4 Role-aware content

| Audience | Sidebar visibility |
|---|---|
| **All visitors** | Getting Started, FAQ, Account & Security, Legal |
| **Startups & Investors** | Profile, AI Matching, Introductions, Deal Board, Data Room, Co-Founders, Requests, Credits |
| **Ecosystem Partners** | Partner Portfolio, Nominate Startup, Co-Pilot Kanban (replace startup/investor matching sections) |
| **Advisors / Admins** | Separate "For Advisors" section — linked from footer, not main member nav |

Implementation option: single docs page with role tabs, or `/docs` + `/docs/partners` + `/docs/advisors`.

### 3.5 Screenshot inventory (production checklist)

Capture these before launch (1280×800 or 2× retina):

| ID | Screen | Used in section |
|---|---|---|
| `docs-sign-in.png` | Sign-in page | Getting Started |
| `docs-onboarding-step.png` | Onboarding form (step 1) | Getting Started |
| `docs-dashboard-startup.png` | Startup dashboard | Your Dashboard |
| `docs-dashboard-investor.png` | Investor dashboard | Your Dashboard |
| `docs-matches-pipeline.png` | Matches page with score cards | AI Matching |
| `docs-request-intro.png` | Request Intro button state | Requesting Introductions |
| `docs-deal-board.png` | Deal board kanban | Deal Board |
| `docs-data-room.png` | Data room file list | Data Room |
| `docs-requests-inbox.png` | Requests pending tab | Requests Inbox |
| `docs-ecosystem-portfolio.png` | Partner portfolio overview | Ecosystem Partners |
| `docs-ecosystem-kanban.png` | Co-Pilot Kanban | Ecosystem Partners |
| `docs-payments.png` | Credits & plans page | Credits & Plans |
| `docs-account-settings.png` | Account settings | Account & Security |

---

## 4. Information Architecture

### Sidebar navigation (member docs)

```
Getting Started
Your Profile & Dashboard
AI Matching & Fit Scores
Requesting Introductions
Match Pipeline
Deal Board
Data Room
Co-Founders
Requests Inbox
Credits & Plans
Events & Community
Ecosystem Partners        ← separate track; hide for startup/investor if role-detected
Account & Security
Legal & Disclaimers
FAQ
```

### Anchor slug convention

| Section | Slug |
|---|---|
| Getting Started | `#getting-started` |
| Your Profile & Dashboard | `#profile-dashboard` |
| AI Matching & Fit Scores | `#ai-matching` |
| Requesting Introductions | `#requesting-introductions` |
| Match Pipeline | `#match-pipeline` |
| Deal Board | `#deal-board` |
| Data Room | `#data-room` |
| Co-Founders | `#co-founders` |
| Requests Inbox | `#requests-inbox` |
| Credits & Plans | `#credits-plans` |
| Events & Community | `#events-community` |
| Ecosystem Partners | `#ecosystem-partners` |
| Account & Security | `#account-security` |
| Legal & Disclaimers | `#legal` |
| FAQ | `#faq` |

---

## 5. Help Center Content

> **Instructions for implementers:** Everything below is production-ready copy. Preserve heading hierarchy when converting to MDX. Replace `[Screenshot: …]` with actual assets from §3.5.

---

# Documentation

Everything you need to know about using Founders Arena to discover aligned investors, manage introductions, and track deals with institutional discipline.

---

## Getting Started

Founders Arena is a private, invite-only matching platform for verified startups, investors, and ecosystem partners across the Philippines and Southeast Asia. Here's how to get started in four steps.

### 1. Receive Your Invite

Accounts are pre-provisioned by a Growth Advisor. Self-registration is disabled — you must sign in with the email address your advisor invited.

- Visit **Get Invited** (`/get-invited`) to understand the invite-only process
- If you already have an invited email, go to **Sign In** (`/sign-in`)

[Screenshot: docs-sign-in.png]  
*Sign-in page*

### 2. Accept Your Invite & Consents

After signing in with your invited email, complete the invite claim flow:

1. Open **Accept Invite** (`/accept-invite`)
2. Review and accept **PDPA-PH** data privacy consent
3. Accept **NDA-light** and **non-circumvention** agreements
4. Confirm your account — access activates once claim is complete

### 3. Complete Onboarding

New members are guided through onboarding (`/onboarding`) to build a verified profile. What you fill in depends on your role:

**All members**
- Full name, role title, city, and country
- Sector focus and short bio
- WhatsApp number
- Top ASKs (what you're looking for) and OFFERs (what you provide)
- How you heard about the platform

**Startups additionally provide**
- Business name, employee band, and revenue range
- Product stage (Working Prototype, MVP, or Traction)
- Fundraising stage and growth thesis

**Investors additionally provide**
- Organization name and investor type
- Investment thesis, ticket size, target regions, and stage preferences
- Three verifiable references

**Ecosystem partners additionally provide**
- Organization type (TBI, accelerator, VC firm, etc.)
- Sector focus, target regions, and stage preference
- Three verifiable references

[Screenshot: docs-onboarding-step.png]  
*Onboarding — profile basics*

On submit, your profile is created with **pending verification**. You receive **10 welcome credits** automatically. A Growth Advisor reviews your account before matching features unlock.

> **Tip:** The more complete your profile — especially ASKs, OFFERs, and thesis fields — the better AI fit scores will be. Include specifics investors care about: stage, sector, ticket size, and geography.

### 4. Explore Your Dashboard

Once verified, land on your **Dashboard** (`/dashboard`). Your view depends on role:

| Element | Startup | Investor | Ecosystem Partner |
|---|---|---|---|
| Portal label | Startup Profile | Investor Profile | Partner Profile |
| Pending matches | ✓ | ✓ | ✓ |
| Active deals | ✓ | ✓ | — |
| Credit balance | ✓ | ✓ | ✓ |
| Profile strength ring | ✓ | ✓ | ✓ |
| Pipeline summary | Projects + investor scores | Opportunities + scored startups | Portfolio quick links |

[Screenshot: docs-dashboard-startup.png]  
*Startup dashboard*

---

## Your Profile & Dashboard

Your profile is the foundation for every match, score, and introduction on the platform.

### Editing Your Profile

Access your profile from the sidebar footer (`/profile`). You can update:

- **Contact info** — Name, bio, WhatsApp, city
- **Business details** — Sector, stage, employee band, revenue (startups)
- **Investment mandate** — Thesis, ticket size, regions, stage preferences (investors)
- **ASK/OFFER framework** — Top categories and free-text summaries
- **Organization info** — Type, sector focus, references (ecosystem partners)

Changes to ASKs and OFFERs affect future AI scoring cycles. Keep them current before each matching cycle.

### Profile Strength

The dashboard **profile strength ring** shows how complete your profile is and suggests the next field to fill. Stronger profiles rank higher in advisor review queues and produce more accurate AI fit scores.

### Account Settings

Manage security and contact preferences at **Account Settings** (`/account-settings`):

- Update WhatsApp / phone number
- Send a password reset link (email/password accounts)
- Report a bug
- Request account deletion

> **Note:** Accounts created via Google Sign-In do not have a platform password. Use your Google account to sign in.

[Screenshot: docs-account-settings.png]  
*Account settings*

---

## AI Matching & Fit Scores

Founders Arena uses **Exoasia Intelligence** (powered by Google Gemini) to score structural compatibility between startup projects and investor profiles. Scores are signals — they do not create introductions on their own.

### How Scoring Works

**Startups — Find Investors**

1. Create an active project (via your dashboard pipeline or matches flow)
2. Click **Find Investors** on a project card
3. AI scores your project against all eligible investor profiles (0–100)
4. Results appear on your **Matches** page (`/matches`) ranked by fit

**Investors — Score a Project**

1. Browse active startup projects (visible in your matches pipeline)
2. Click **Score this project** on any project card
3. AI generates a fit score and one-line summary
4. The score badge appears on the project card

[Screenshot: docs-matches-pipeline.png]  
*Matches page — AI score cards*

### Fit Score Tiers

| Score | Badge colour | Meaning |
|---|---|---|
| 80–100 | Emerald | Excellent match — strong structural alignment |
| 65–79 | Indigo | Strong match — worth pursuing |
| 50–64 | Amber | Moderate match — review rationale before acting |
| Below 50 | Dimmed | Low match — alignment gaps likely |

### What the AI Considers

| Dimension | Weight |
|---|---|
| Sector focus and vertical alignment | High |
| Business / fundraising stage | High |
| ASK/OFFER strategic fit | High |
| Capital requirement / allocation mandate | Medium |
| Growth thesis compatibility | Medium |

Each score includes a **one-line rationale** explaining why the pairing scored as it did.

> **Tip:** Run scoring after updating your profile or project description. Stale scores do not auto-refresh — re-score when your thesis or project details change materially.

---

## Requesting Introductions

Scoring tells you *who* might align. Introductions are how you *act* on that signal — always with advisor oversight and bilateral consent.

### Startup-Initiated: Request Intro

1. Open **Matches** (`/matches`)
2. Find a scored investor with a strong fit
3. Click **Request Intro**
4. Your side is marked **Accepted**; the investor receives a **Pending** request
5. The button changes to **Requested ✓** — you cannot request twice

[Screenshot: docs-request-intro.png]  
*Request Intro on a scored investor*

### Investor-Initiated: Express Interest

1. Open **Matches** (`/matches`) or browse scored projects
2. Click **Express Interest** on a project without an existing match
3. Your side is marked **Accepted**; the startup receives a **Pending** request
4. The button changes to **Sent**

### What Happens Next

1. The counterpart sees the request in **Matches** and **Requests Inbox**
2. They accept or decline
3. If both accept, the match moves to **Advisor Review**
4. A Growth Advisor approves, modifies framing, or blocks the introduction
5. On approval, the advisor formally introduces both parties

> **Important:** No profile data is shared with a counterpart until bilateral consent and advisor approval. The platform facilitates alignment — it does not guarantee outcomes.

---

## Match Pipeline

Your **Matches** page (`/matches`) has two sections:

### Score Cards

All AI-scored project–investor pairings relevant to you, with fit percentage, rationale, and action buttons (**Request Intro** or **Express Interest**).

### Match List

All active introduction records involving you, with inline **Accept** and **Decline** buttons for pending items.

### Match Status Definitions

| Status | What it means |
|---|---|
| **Pending** | One party initiated; the other has not responded |
| **Approved** | A Growth Advisor reviewed and approved the introduction |
| **Accepted** | Both parties accepted |
| **Introduced** | The advisor formally connected both parties |
| **Declined** | One party declined — declined matches do not persist in future cycles |

### Accepting or Declining

When you receive a pending intro:

1. Review the counterpart's sector, stage, and fit score
2. Click **Accept** or **Decline** on the match card or in **Requests Inbox**
3. Accepting may consume **1 credit** (see Credits & Plans)
4. Declined matches are archived — they will not reappear in the next cycle

---

## Deal Board

Once both parties are **Accepted** or **Introduced**, you can track deal progress on the **Deal Board** (`/deal-board`).

### Deal Board Stages

| Stage | Entry criteria | Typical next step |
|---|---|---|
| **Qualified** | Intro completed; basic fit confirmed | Schedule discovery call |
| **Intro & Scoping** | Discovery call done | Draft scope / problem statement |
| **Proposal** | Proposal or pilot terms sent | Agree success metrics |
| **Negotiation** | MoU / term sheet in progress | Sign or pass |
| **Closed Won** | Agreement signed; kickoff confirmed | — |
| **On Hold** | Deal paused or lost — reason required | Capture learnings |

[Screenshot: docs-deal-board.png]  
*Deal board kanban*

### Working With Deal Cards

Each card tracks:

- **Fit score** (from the original AI match)
- **Confidence** — Low / Medium / High
- **Impact projection** — Estimated deal value or KPI impact
- **Next action** and **due date**
- **Blocker flags**

**Promote an intro to a deal:** From accepted introductions, click **Promote to Deal Board** to create a card in **Qualified**.

**Keep cards fresh:** Update your next action at least every **7 days**. Cards with no update for 7+ days are flagged stale. Negotiation-stage cards stale for **14+ days** escalate to your Growth Advisor.

**Close a deal:** Moving to **Closed Won** or **On Hold** requires a reason code on hold/lost cards before archiving.

---

## Data Room

Each startup project can have a secure **Data Room** (`/data-room`) for sensitive documents — pitch decks, financial models, cap tables, and diligence materials.

### Uploading Files

Project **owners** and **co-founders** can upload files at any time. Files are stored securely with access controlled per project.

### Requesting Access

Investors and verified members can request access:

1. Navigate to the project or data room
2. Click **Request Access**
3. Optionally add a message explaining your interest
4. The request appears in the project owner's **Requests Inbox**

### Approving or Denying

Project owners review data room requests in **Requests Inbox**:

1. See requester name, role, sector, and message
2. Click **Approve** or **Deny**
3. Approved requesters get read-only access to all files in that data room

[Screenshot: docs-data-room.png]  
*Data room — file list and access controls*

### Access Levels

| Role | Access |
|---|---|
| Project owner | Full read and write |
| Co-founders | Full read |
| Approved requesters | Read-only after approval |
| Growth Advisors / Admins | Full read |
| Everyone else | No access |

---

## Co-Founders

Startup projects can be co-owned by multiple founders. The lead founder invites co-founders who receive owner-equivalent access to the project, data room, match scores, and deal cards.

### Inviting a Co-Founder

1. Open the project page
2. Click **Invite Co-founder**
3. Enter their email or phone number
4. An invite token is sent (valid **14 days**)

### Accepting an Invite

**Existing members:** The invite appears in **Requests Inbox** under Co-founder Invites. Accept or decline in-app.

**New users:** They receive an email signup link with the token pre-loaded. After registration, they are linked to the project automatically.

> **Tip:** Co-founders see the project on their own **Matches** and **Data Room** views — no need to share passwords or files externally.

---

## Requests Inbox

All inbound invitations and connection requests live in one place: **Requests** (`/requests`). The sidebar badge shows your total pending count and refreshes every 30 seconds.

[Screenshot: docs-requests-inbox.png]  
*Requests inbox — pending tab*

### Pending Tab

| Category | Source | Actions |
|---|---|---|
| Co-founder Invites | Another founder invited you to co-own a project | Accept / Decline |
| Data Room Requests | Someone requested access to your project's files | Approve / Deny |
| Ecosystem Collaboration | An ecosystem partner invited you to their portfolio | Accept / Decline |
| Connection Requests | Match or introduction request from another member | Accept / Decline |

### Accepted Tab

Historical record of everything you've accepted — co-founder projects, portfolio partnerships, connections, and approved data room access — with links back to the relevant project or match.

---

## Credits & Plans

Founders Arena uses a **credit economy** for premium platform actions. Your balance appears on the dashboard and is tracked in a transparent transaction ledger.

### Earning Credits

| Source | Credits | When |
|---|---|---|
| Welcome bonus | +10 | Account created after onboarding |
| Event attendance | Variable | Registered event with pitch credit |
| Starter plan | +20 / month | Active subscription |
| Professional plan | +60 / month | Active subscription |
| Premium plan | +120 / month | Active subscription |
| Credit packages | +20 / +75 / +200 | One-time purchase |

### Spending Credits

| Action | Cost |
|---|---|
| Match acceptance | 1 credit |
| Premium match report | Variable |
| Profile unlock | Variable |
| Premium introduction request | Variable |

Manage subscriptions and purchases on the **Payments** page (`/payments`).

[Screenshot: docs-payments.png]  
*Credits & subscription plans*

### Subscription Plans

| Plan | Monthly credits | Best for |
|---|---|---|
| Free | 5 | Exploring the platform |
| Starter | 20 | First introductions |
| Professional | 60 | Regular deal flow |
| Premium | 120 | High-volume matching |

> **Tip:** Welcome credits are enough for your first few match acceptances. Upgrade when you are actively running multiple intro pipelines.

---

## Events & Community

### Events

The **Events** page (`/events`) lists platform events — weekly sessions, monthly dinners, pitch nights, and Demo Days. Register to earn pitch credits and attendance-based Ad Credits where applicable.

### Community

**Community** (`/community`) is the member directory and engagement surface. Visibility is gated by verification stage and match status — you only see profiles you are permitted to view under platform consent rules.

---

## Ecosystem Partners

> **Note:** This section applies to ecosystem partner accounts (accelerators, incubators, TBIs, angel networks, and VC firms). Startups and investors should skip to Account & Security.

Ecosystem partners manage a **portfolio of startups** and monitor their matching activity — without pitching their own deals.

### Portfolio Command Center

Open **Portfolio** (`/ecosystem`) for two views:

#### Portfolio Overview

Summary metrics:

| Metric | Definition |
|---|---|
| Portfolio Companies | Startups in your active portfolio |
| Active Projects | Investment projects across portfolio companies |
| Total Intros | Cumulative introduction records |
| Active Matches | Accepted or Introduced matches |
| Pending | Awaiting a response |
| Stale Alerts | No activity in 7+ days |

The company feed lists each portfolio startup with sector, stage, project count, best fit score, and match counts. Click any company for a deep-dive: projects, scores, and full match timeline.

[Screenshot: docs-ecosystem-portfolio.png]  
*Portfolio overview*

#### Co-Pilot Kanban

A multi-company board with three columns:

| Column | Match statuses |
|---|---|
| Discover | Pending |
| Intro Sent | Approved |
| Active | Accepted, Introduced |

Stale cards (7+ days inactive) show a rose border and an **Intervene** button. Intervening resets the activity clock and signals that you have nudged the parties.

Use the **company filter** to focus on one portfolio startup.

[Screenshot: docs-ecosystem-kanban.png]  
*Co-Pilot Kanban*

### Nominate a Startup

1. Click **Nominate Startup** in the portfolio header or company feed
2. Enter the startup's email and an optional message
3. A 14-day invite token is generated and sent
4. On acceptance, the startup joins your portfolio

> **Note:** The startup-side nomination acceptance flow is rolling out. Contact your Growth Advisor if a nominated startup cannot complete the link.

### Partner Navigation

Partners see: **Dashboard**, **Portfolio**, **Events**, **Community**, and **Requests** — not Deal Board or startup project creation tools.

---

## Account & Security

### Sign-In Options

- **Email & password** — Invited email + password set during claim
- **Google Sign-In** — One-click OAuth where enabled

### Changing Your Password

Email/password accounts: open **Account Settings** → enter your email → **Send reset link**. Follow the link to `/reset-password`.

Google accounts: manage password through Google — not through Founders Arena.

### Data & Privacy

Your profile, projects, match history, and uploaded documents are stored securely and accessible only to you, your deal counterparts (with consent), and authorized Growth Advisors. Data is governed by **PDPA-PH**. KYC documents are visible only to advisors and administrators.

### Reporting Issues

Use **Report a Bug** in Account Settings to send subject, description, and reproduction steps to the platform team.

---

## Legal & Disclaimers

The following disclaimer appears in Stage 3+ communications and must be linked from the Help Center:

> *Founders Arena and The Growth Network do not offer securities, solicit investments, or provide financial advice. All investment decisions and transactions are initiated and executed solely by participating members. The Network provides structured facilitation, infrastructure, and verified introductions only. Participation does not guarantee capital allocation, partnership formation, or transaction completion.*

### Approved Language

Automated and member-facing copy must avoid:

| Do not use | Use instead |
|---|---|
| "Raise capital through us" | "Structured introductions" |
| "Access funding" | "Alignment facilitation" |
| "Investor pool" | "Capital conversations" |
| "Get funded fast" | "Verified deal flow" |
| "Investment guarantee" | "Facilitated matching" |

---

## FAQ

**How do I get an account?**  
Founders Arena is invite-only. A Growth Advisor pre-provisions your email. Visit `/get-invited` for the full flow.

**Can I sign up without an invite?**  
No. Self-registration is disabled. Contact Exoasia or a member for a referral to an advisor.

**How accurate are AI fit scores?**  
Scores reflect structural alignment — sector, stage, ASK/OFFER fit, and thesis compatibility. They are strong signals, not guarantees. Scores above 80 generally indicate excellent compatibility; always review the rationale.

**Do scores update automatically?**  
No. Re-run **Find Investors** or **Score this project** after meaningful profile or project changes.

**Can I request the same intro twice?**  
No. The system is idempotent — once requested, the button shows **Requested ✓** or **Sent**.

**What if I decline a match?**  
Declined matches do not carry into future matching cycles.

**How often do matching cycles run?**  
Every 2–4 weeks for verified Stage 2+ members with complete profiles.

**Who sees my full profile?**  
Only you, authorized Growth Advisors, and counterparts in **confirmed, consent-verified matches**. No profile is shared without bilateral consent.

**How do credits work?**  
You earn credits on signup, events, and subscriptions. You spend them on match acceptance and premium features. View balance on your dashboard and history on `/payments`.

**Can ecosystem partners invest through the platform?**  
Partners monitor portfolio deal flow and facilitate introductions. They do not list their own investment projects on the startup/investor pipeline.

**What happens if my verification is pending?**  
Matching features stay locked until an advisor approves your account. Complete your profile to speed up review.

**Is my data secure?**  
Yes. Data is encrypted in transit (HTTPS), access is enforced with row-level security, and KYC documents are advisor-only.

**How do I delete my account?**  
Account Settings → **Delete account** → type confirmation phrase. This action is irreversible.

---

## Ready to get started?

Join Founders Arena and start making verified, advisor-governed introductions.

- **Sign In** → `/sign-in`
- **Get Invited** → `/get-invited`

---

## 6. Technical Implementation Notes

### Recommended stack

| Layer | Recommendation |
|---|---|
| Route | `src/app/docs/page.tsx` (public) |
| Content | MDX files in `content/docs/` or inline sections component |
| Navigation | Sticky sidebar reading `sections[]` config |
| Search | Phase 1: client filter; Phase 2: Pagefind or Algolia |
| SEO | `metadata.title`, `description`, OG image per section |
| Analytics | Track section views + CTA clicks |

### MDX frontmatter example

```yaml
---
title: Documentation
description: Everything you need to use Founders Arena.
sections:
  - slug: getting-started
    title: Getting Started
  - slug: ai-matching
    title: AI Matching & Fit Scores
---
```

### Accessibility

- WCAG AA contrast on docs surface
- Skip link to main content
- Sidebar keyboard-navigable
- `prefers-reduced-motion`: no scroll-spy animation

### Launch checklist

- [ ] All §3.5 screenshots captured and optimized (WebP)
- [ ] Member, partner, and FAQ content reviewed by Growth Advisor
- [ ] Legal disclaimer approved
- [ ] Link from app footer + Account Settings → Help Center
- [ ] Contextual `?` links from Matches, Deal Board, Requests → relevant anchor
- [ ] Mobile sidebar tested
- [ ] 404 fallback for bad anchors

---

## 7. Relationship to Other Docs

| Document | Purpose |
|---|---|
| `HELP-CENTER-PRD.md` (this file) | Help center spec + member-facing copy |
| `founders-arena-product-document.md` | Internal product reference (all roles, DB, gaps) |
| `AGENTS.md` | AI agent behavior and governance |
| `PRODUCT.md` | Brand personality and design principles |
| `ECOSYSTEM_PARTNER_FEATURES.md` | Partner feature brief for events/Demo Day |

---

*Founders Arena by Exoasia Innovation Hub — growthnetwork.exoasia.org*  
*Confidential by default · Limited seats · Operator-led*
