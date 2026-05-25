Read the following files to understand the current state of the platform, then write a comprehensive `PLATFORM.md` document at the project root.

## Files to read first

Read these files before writing anything:

**Routing & access control**
- `middleware.ts`
- `src/lib/auth/access.ts`
- `src/app/_components/TopHeader.tsx` — sidebar nav per role

**Auth & roles**
- `src/app/providers.tsx`
- `src/lib/auth/jwt.ts` (if it exists)

**Onboarding**
- `src/app/onboarding/page.tsx`
- `src/app/api/onboarding/submit/route.ts`

**Startup flows**
- `src/app/projects/page.tsx`
- `src/app/projects/[id]/page.tsx`
- `src/app/matches/page.tsx`
- `src/app/matches/[id]/page.tsx`
- `src/app/deal-board/page.tsx` (if it exists)
- `src/app/api/matches/request-intro/route.ts`

**Investor flows**
- `src/app/api/projects/[id]/score/route.ts` (if it exists)
- `src/lib/ai/geminiProjectMatchingInstructions.ts`
- `src/lib/ai/geminiMatchingInstructions.ts`

**Ecosystem partner flows**
- `src/app/ecosystem/page.tsx`
- `src/app/ecosystem/_components/PortfolioOverview.tsx`
- `src/app/ecosystem/_components/CoPilotKanban.tsx`
- `src/app/ecosystem/_components/NominateModal.tsx`
- `src/app/api/ecosystem/portfolio/route.ts`
- `src/app/api/ecosystem/nominate/route.ts`
- `src/app/api/ecosystem/intervene/route.ts`
- `scripts/create-ecosystem-partner.mjs`

**Advisor/Admin flows**
- `src/app/advisor/manual-match/page.tsx`
- `src/app/advisor/match-queue/page.tsx` (if it exists)
- `src/app/advisor/members/page.tsx` (if it exists)
- `src/app/advisor/introductions/page.tsx` (if it exists)
- `src/app/advisor/network-graph/page.tsx` (if it exists)

**Dashboard**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/_components/MemberWidgets.tsx`
- `src/app/dashboard/_components/AdvisorWidgets.tsx` (if it exists)

**Data layer**
- `src/lib/app-data.ts`
- Most recent 3–4 migration files in `supabase/migrations/` sorted by filename

**Community & notifications**
- `src/app/community/page.tsx` (if it exists)
- `src/app/notifications/page.tsx` (if it exists)
- `src/app/api/notifications/route.ts` (if it exists)

---

## Document to write

Write `PLATFORM.md` at the project root. Structure it exactly as follows:

---

# Founders Arena — Platform Capabilities

> One-paragraph plain-English summary of what the platform is and who it's for.

---

## Role system

Explain the two-layer role system:
- **RBAC role** (`member`, `advisor`, `admin`) — controls route access
- **Member role** (`startup`, `investor`, `ecosystem_partner`) — controls what a member sees inside the app

Include a table showing which sidebar items each role sees.

---

## Role: Startup

### Onboarding
Step-by-step: what fields are collected, what happens on submit (profile creation, verification status, stage assignment).

### Projects
- Creating a project (required fields, how `is_active` works)
- Project detail page — what's shown, how to edit

### Finding investors (AI matching)
- What triggers Gemini scoring
- What `project_match_scores` stores
- How scores are displayed (fit score colour tiers: excellent ≥80, strong ≥65, moderate ≥50)

### Requesting an intro
- The "Request Intro" button flow
- What `POST /api/matches/request-intro` does (canonical pair ordering, requester auto-accept, `ignoreDuplicates`)
- Resulting match status

### Match pipeline (`/matches`)
- What a startup sees: their project score cards + their match list
- Inline accept / decline on pending matches
- What each match status means (pending → approved → accepted → introduced)

### Deal board
- What it is and when it's relevant (if implemented)

---

## Role: Investor

### Onboarding
Same structure as startup section — note any investor-specific fields (thesis, ticket size, geography).

### Browsing projects (`/projects`)
- Investor sees all active startup projects
- "Score this project" — triggers Gemini, stores in `project_match_scores`

### Expressing interest
- "Express Interest" button on a project
- How it calls `request-intro` from the investor side (investor auto-accepted, startup gets pending)

### Match pipeline (`/matches`)
- What an investor sees: their scored project cards + their match list
- Accepting / declining intros from startups

---

## Role: Ecosystem Partner

### What an ecosystem partner is
One paragraph: they are accelerators, incubators, or network organisations that manage a portfolio of startups and help connect them to investors.

### Onboarding
Note that ecosystem partners are provisioned via script (`scripts/create-ecosystem-partner.mjs`) or the standard member onboarding with `member_role = ecosystem_partner`.

### Portfolio Command Center (`/ecosystem`)

#### Portfolio Overview
- Stat grid: Portfolio Companies, Active Projects, Total Intros, Active Matches, Pending, Stale Alerts
- Company feed: lists each portfolio startup with projects count, best fit, pending/active match counts
- Click-through to individual company deep-dive

#### Company deep-dive
- Projects panel (name, sector, stage, best fit score, investor score count)
- Match timeline (counterpart, status, last activity, stale flag)

#### Co-Pilot Kanban
- Three columns: Discover (pending), Intro Sent (approved), Active (accepted/introduced)
- Stale card highlighting (rose border, 7-day threshold)
- "Intervene" button — calls `POST /api/ecosystem/intervene`, touches `updated_at` to reset the stale clock
- Company filter dropdown

#### Nominate Startup
- Modal with email + optional message
- Calls `POST /api/ecosystem/nominate` → creates `portfolio_nominations` record with 14-day expiry token
- Note: nomination acceptance flow (startup clicking the invite link to be added to `portfolio_companies`) is not yet implemented — portfolio links can be seeded via script

### Dashboard widget
- Replaced the project pipeline card with a **Partner Portfolio card** showing quick links to Portfolio Overview and Co-Pilot Kanban

### Sidebar nav
- Dashboard, Portfolio, Events, Community (no Projects or Deal board — partners don't pitch)

---

## Role: Advisor / Admin

### Dashboard
- System Pulse header with urgency count
- Metric cards: Total companies, Need matching, Pending pairs, Approved pairs
- Urgency queue: companies with zero matches
- Matching funnel panel: companies with matches and their statuses
- Sector pie chart

### Manual match (`/advisor/manual-match`)
- Select any two verified members, set a summary and fit score
- Calls `POST /api/matching/manual`

### Match review queue (`/advisor/match-queue`)
Describe what's shown if the page exists, otherwise note it as provisioned but not yet fully implemented.

### Member management (`/advisor/members`)
Describe if implemented.

### Network graph (`/advisor/network-graph`)
Describe if implemented.

### Document review (`/advisor/documents`)
Describe if implemented.

---

## The two matching systems

Explain both systems clearly:

### System 1 — Member-to-member matches (`matches` table)
- Created by: advisor manual match, or via "Request Intro" / "Express Interest"
- Statuses: `pending` → `approved` → `accepted` → `introduced`
- Both parties must accept for the match to be active
- `member_a_id` / `member_b_id` follow canonical UUID ordering (a < b)

### System 2 — Project-to-investor AI scoring (`project_match_scores` table)
- Created by: startup clicking "Find investors" or investor clicking "Score this project"
- Powered by Gemini (describe the model and instruction file used)
- Stores: `fit_score` (0–100), `summary`, `generated_at`
- Does not create a match on its own — the "Request Intro" / "Express Interest" action bridges System 2 → System 1

### The bridge
Describe how `POST /api/matches/request-intro` connects the two systems.

---

## Notifications

Describe the notifications system if `src/app/api/notifications/route.ts` exists — what triggers a notification, what the bell icon shows.

---

## Key database tables

A brief table listing the most important tables and their purpose:

| Table | Purpose |
|---|---|
| `profiles` | Member profile data, `member_role`, `verification_status` |
| `user_roles` | RBAC role per user (`member`, `advisor`, `admin`) |
| `projects` | Startup investment projects |
| `project_match_scores` | AI fit scores between a project and an investor profile |
| `matches` | Member-to-member intro records |
| `deal_cards` | Deal pipeline cards (if implemented) |
| `portfolio_companies` | Links ecosystem partners to their portfolio startups |
| `portfolio_nominations` | Invite tokens sent by partners to prospective portfolio startups |

---

## Test accounts

List the three test accounts with their credentials and what they're used for:

| Role | Name | Email | Password |
|---|---|---|---|
| Startup | Camille Lim / PayFlow Technologies | test.startup.match@exoasia.com | MatchTest123! |
| Investor | Jonathan Reyes / Meridian Ventures | test.investor.match@exoasia.com | MatchTest123! |
| Ecosystem Partner | Maria Santos / FinTech Philippines Network | test.ecosys.partner@exoasia.com | MatchTest123! |

Note the known tested result: PayFlow scored 97/100 against Meridian Ventures, the intro was requested and accepted, match status is `accepted`.

---

## Known gaps / not yet implemented

List anything that is scaffolded but incomplete, based on what you find in the code:
- Nomination acceptance flow (startup clicking invite link)
- Any advisor pages that exist as routes but have minimal content
- Anything else you observe

---

## Writing instructions

- Write in plain English, not technical jargon — this document is for product, design, and new engineers
- Use present tense ("the startup clicks...", "the system creates...")
- For each feature, describe: what the user does → what the system does → what the user sees next
- Do not paste code snippets
- Keep each section tight — bullet points over paragraphs where possible
- If a file you try to read doesn't exist, skip that section rather than guessing

After writing the file, confirm how many sections were completed and list any skipped sections with the reason.
