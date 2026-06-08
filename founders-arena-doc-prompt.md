You are a technical writer. Using the platform knowledge below, produce a professional, well-structured product document formatted for Microsoft Word (DOCX). Output the full document as a single markdown artifact — use proper heading levels (H1, H2, H3), tables, and bullet lists throughout. Do not add any commentary outside the document itself.

---

# PLATFORM KNOWLEDGE BASE

## What is Founders Arena?

Founders Arena (by Exoasia) is a private, invite-only B2B matching platform that connects early-stage startups with investors and ecosystem partners in the Philippines and Southeast Asia. It is not a marketplace — members are curated and verified before they can access the platform's matching features. The platform runs a two-sided pipeline: startups list investment projects, investors score those projects using AI, and both parties can initiate or accept introductions. A third role — the Ecosystem Partner — manages a portfolio of startups and monitors their live match pipeline.

---

## Role System

There are two separate role layers:

**RBAC Role** (controls route access and admin tools):
- `member` — all regular members (startups, investors, partners)
- `advisor` — platform operators who can manage matches and members
- `admin` — full platform access

**Member Role** (controls what a member sees inside the app, stored in `profiles.member_role`):
- `startup` — companies seeking investment
- `investor` — funds or angels deploying capital
- `ecosystem_partner` — accelerators, incubators, or network organisations managing startup portfolios

### Sidebar Navigation Per Role

| Nav Item | Startup | Investor | Ecosystem Partner | Advisor/Admin |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Projects | ✓ | ✓ | — | — |
| Deal Board | ✓ | ✓ | — | — |
| Requests (Inbox) | ✓ | ✓ | ✓ | — |
| Events | ✓ | ✓ | ✓ | — |
| Community | ✓ | ✓ | ✓ | — |
| Portfolio (/ecosystem) | — | — | ✓ | — |
| Introductions | — | — | — | ✓ |
| Member Management | — | — | — | ✓ |
| Match Review Queue | — | — | — | ✓ |
| Document Review | — | — | — | ✓ |
| Manual Match | — | — | — | ✓ |
| Network Graph | — | — | — | ✓ |

---

## Credits System

Founders Arena uses a credit-based economy to gate access to premium platform actions. Credits are tracked per member in the `ad_credit_ledger` table, which records every credit change as a signed transaction with a reason and optional expiry.

### How Credits Are Earned

| Source | Amount | Trigger |
|---|---|---|
| Welcome bonus | +10 credits | Automatically granted when a member completes onboarding |
| Event attendance | Variable | Attendance at pitch events tracked via `pitch_credit` on event registrations |
| Subscription plans | Monthly top-up | Starter: 20/mo · Professional: 60/mo · Premium: 120/mo |
| Credit packages (one-time) | 20 / 75 / 200 | Purchased directly via the Payments page |

### How Credits Are Spent

- **Match actions** — 1 credit per match acceptance (ENTRY_COST)
- **Investor match reports** — viewing premium AI score reports
- **Profile unlocks** — accessing full counterpart profiles
- **Intro requests** — initiating premium introductions

### Credit Ledger

Every credit change is written to the `ad_credit_ledger` table with:

| Field | Description |
|---|---|
| `member_id` | The member whose balance is affected |
| `change_amount` | Positive (earned) or negative (spent) integer |
| `reason` | Human-readable label (e.g. "Welcome bonus — account created") |
| `created_at` | Timestamp of the transaction |
| `expires_at` | Optional expiry date for time-limited credits |

The member's current credit balance is the sum of all `change_amount` values in their ledger. This is displayed as the **Credits** metric card on the dashboard for all roles.

### Subscription Plans

| Plan | Monthly Credits | Description |
|---|---|---|
| Free Tier | 5 | Default for new members before upgrading |
| Starter | 20 | Entry-level monthly plan |
| Professional | 60 | Mid-tier plan for active members |
| Premium | 120 | High-volume plan for power users |

### Credit Packages (One-Time Purchase)

Members may purchase top-up credit packages at any time via the **Payments** page at `/payments`:

| Package | Credits |
|---|---|
| Small | 20 credits |
| Medium | 75 credits |
| Large | 200 credits |

---

## Role: Startup

### Onboarding
When a startup signs up and completes onboarding, the platform collects: full name, business name, role title, sector, city, short bio, WhatsApp number, what they are looking for (ask categories), what they can offer (offer categories), and free-text summaries of asks and offers. On submit, their profile is created with `verification_status: pending` and `stage: 1`. An advisor must manually verify and advance the stage. **10 welcome credits are automatically added to the member's credit ledger at this point.**

### Dashboard
The startup dashboard shows:
- **Portal label:** "Startup Profile"
- **Metric cards:** Pending matches, Active deals, Credits, Peer benchmark chart
- **Profile strength ring:** Shows % of profile fields completed with a "next step" tip
- **Pipeline summary card:** Active projects count, investor match count, best fit score — links to `/matches`

### Projects
Startups create investment projects at `/projects`. Each project has a name, stage (e.g. Pre-Series A), sector, and a detailed description covering traction, technology, raise amount, and use of funds. Projects have an `is_active` flag — only active projects are visible to investors and included in AI scoring.

On the Projects page, startups see their own projects and projects where they have been added as a co-founder. Each project card shows:
- Project name, stage, sector
- A score badge if AI scoring has been run (colour-coded: emerald ≥80, indigo ≥65, amber ≥50)
- A "Find investors" button

### Co-Founder Access

A startup project can have multiple founders working on it. The lead founder (project owner) can invite co-founders by email or phone number. Co-founders receive full owner-like access to the project, including:
- All project tabs and settings
- Data room files and storage
- Investor match scores for the project
- Deal cards linked to the project

**Inviting a co-founder:**
1. From the project page, the owner clicks **"Invite Co-founder"**
2. They enter the co-founder's email address or phone number
3. An invite token is generated (valid for 14 days) and sent to the co-founder
4. If the recipient is already a platform member, they see the invite in their **Requests Inbox** and can accept or decline in-app
5. If the recipient is not yet a member, they receive an email with a signup link pre-loaded with the acceptance token

**Accepting a co-founder invite:**
- Existing members: Accept or decline directly from the **Requests Inbox** (`/requests`) without leaving the platform
- New users: Complete signup via the invite link — acceptance is handled automatically on registration

Once accepted, a `cofounder_links` record is created linking the co-founder to the project. The co-founder's projects list will then include both their own projects and all projects they co-found.

### Finding Investors (AI Scoring)
When a startup clicks **"Find investors"** on a project:
1. The platform calls the Gemini AI model with the project description and all investor profiles
2. Gemini scores the fit between the project and each investor (0–100) and generates a one-line summary
3. Results are stored in the `project_match_scores` table with `fit_score`, `summary`, and `generated_at`
4. The startup sees a ranked list of investors with their fit scores

Score colour tiers:
- **Emerald (≥80):** Excellent match
- **Indigo (≥65):** Strong match
- **Amber (≥50):** Moderate match
- **Dimmed:** Low match

### Requesting an Intro
From the `/matches` page (labelled "Your Pipeline"), a startup can click **"Request Intro"** next to a scored investor. This:
1. Calls `POST /api/matches/request-intro`
2. Creates a record in the `matches` table with the startup's side auto-set to `accepted` and the investor's side set to `pending`
3. The button becomes "Requested ✓" and cannot be clicked again (idempotent)

### Match Pipeline (`/matches`)
The startup's pipeline page shows two sections:
- **Project score cards** — all investors who have been AI-scored against their projects, with fit %, investor name, and a "Request Intro" button
- **Match list** — all existing intro records showing counterpart name, fit score, status badge, and inline Accept/Decline buttons for pending matches

Match statuses:
| Status | Meaning |
|---|---|
| Pending | One party has initiated; the other hasn't responded |
| Approved | An advisor has approved the intro |
| Accepted | Both parties have accepted |
| Introduced | The advisor has formally introduced both parties |
| Declined | One party declined |

### Inline Accept / Decline
On pending matches in the pipeline list, the startup sees **Accept** and **Decline** buttons inline — no need to navigate to the match detail page. Accepting moves the match status forward; declining closes the match.

---

## Role: Investor

### Onboarding
Same onboarding flow as startups. Investor-specific profile fields include investment thesis, ticket size range, and target geography. Their member role is set to `investor`. **10 welcome credits are automatically added to the credit ledger on completion.**

### Dashboard
The investor dashboard shows:
- **Portal label:** "Investor Profile"
- **Metric cards:** Pending matches, Active deals, Credits, Peer benchmark chart
- **Profile strength ring:** Profile completion percentage
- **Pipeline summary card:** Shows "Opportunities" (distinct startup projects scored), "Score cards" (total scores), and "Best fit" — links to `/matches`

### Browsing Projects (`/projects`)
Investors see **all active startup projects** on the platform (not just their own). Each project card shows the startup name, sector, stage, and a score badge if the investor has already scored it.

### Scoring a Project
When an investor clicks **"Score this project"**:
1. The platform calls the Gemini AI model with the investor's profile/thesis and the project description
2. A fit score and summary are generated and stored in `project_match_scores`
3. The score badge appears on the project card

### Expressing Interest
On any project that hasn't been matched yet, an investor can click **"Express Interest"**. This:
1. Calls `POST /api/matches/request-intro` with the investor as the requester
2. Creates a match with the investor's side auto-accepted and the startup's side set to `pending`
3. The button becomes "Sent"

This is the reverse direction of the startup-initiated intro — the investor initiates, the startup responds.

### Match Pipeline (`/matches`)
The investor's pipeline shows:
- **Scored project cards** — startup projects they've scored, with fit % and an "Express Interest" button if no match exists yet
- **Match list** — all intro records with inline Accept/Decline for pending matches

---

## Role: Ecosystem Partner

### What Is an Ecosystem Partner?
An ecosystem partner is an accelerator, incubator, or network organisation that manages a curated portfolio of startups. They do not pitch projects or receive investor intros themselves — their role is to monitor their portfolio companies' matching pipeline, facilitate introductions, and intervene when matches go stale.

### Onboarding / Account Creation
Ecosystem partner accounts are currently provisioned via an admin script (`scripts/create-ecosystem-partner.mjs`) which sets `member_role: ecosystem_partner` in the profiles table and `role: member` in the RBAC user_roles table. Standard onboarding with role selection will be the eventual path.

### Dashboard
The ecosystem partner dashboard shows:
- **Portal label:** "Partner Profile"
- **Metric cards:** Pending matches, Active deals, Credits, Peer benchmark (same as members)
- **Profile strength ring:** Profile completion percentage
- **Partner Portfolio card** (replaces the pipeline card): Two quick-link tiles — "Portfolio Overview" and "Co-Pilot Kanban" — both linking to `/ecosystem`

### Portfolio Command Center (`/ecosystem`)

The main workspace for ecosystem partners. It has two views selectable via tab navigation:

#### Tab 1: Portfolio Overview

**Stat grid (6 metrics):**
| Metric | What it means |
|---|---|
| Portfolio Companies | Number of startups in the partner's active portfolio |
| Active Projects | Total active investment projects across all portfolio startups |
| Total Intros | Cumulative match records across all portfolio startups |
| Active Matches | Matches with status `accepted` or `introduced` |
| Pending | Matches awaiting a response from one party |
| Stale Alerts | Matches with no activity in 7+ days |

**Company feed:**
Lists each portfolio startup with:
- Name, verification badge, stale alert badge (if any matches are stale)
- Sector and stage
- Projects count, best fit score, pending count, active count
- Click-through to the company deep-dive panel

#### Company Deep-Dive Panel
Clicking a company in the feed opens a full detail view showing:
- Company header with verification status and summary stats
- **Projects panel:** All active projects with best fit score and investor score count
- **Match Timeline:** All intro records for the company, showing counterpart name, status badge, fit score, last activity date, and stale flag

#### Tab 2: Co-Pilot Kanban

A multi-company kanban board showing all portfolio match cards across three columns:

| Column | Match statuses shown |
|---|---|
| Discover | `pending` |
| Intro Sent | `approved` |
| Active | `accepted`, `introduced` |

Each card shows:
- Portfolio company name and counterpart (investor) name
- Fit score and last activity date
- **Stale highlight:** Cards with 7+ days of inactivity get a rose border and a **"Intervene"** button

**Intervene action:** Clicking "Intervene" calls `POST /api/ecosystem/intervene`, which touches the match's `updated_at` timestamp to reset the stale clock and signals that the partner has nudged the parties.

**Company filter:** A dropdown lets the partner filter the kanban to a single portfolio company.

#### Nominate Startup Modal
The "Nominate Startup" button (in the page header and company feed) opens a modal with:
- Email field (required)
- Personal message field (optional)
- Submits to `POST /api/ecosystem/nominate`
- Creates a `portfolio_nominations` record with a unique token valid for 14 days
- The startup receives an invite; upon acceptance they are linked in `portfolio_companies`

> **Note:** The nomination acceptance flow (startup clicking the invite link to be added to the portfolio) is not yet implemented. Portfolio links can currently be created via the seed script `scripts/seed-ecosystem-portfolio.mjs`.

### Sidebar Navigation
Ecosystem partners see: **Dashboard · Portfolio · Requests · Events · Community**

They do not see Projects or Deal Board — they do not pitch their own projects or participate in startup-investor deals directly.

---

## Requests Inbox (`/requests`)

All members (startups, investors, and ecosystem partners) have access to a unified **Requests Inbox** at `/requests`. This is a single inbox that aggregates every type of inbound invitation or connection request the member has received. The sidebar nav item shows a live badge with the total count of unread/pending items (polled every 30 seconds).

### Pending Tab

The pending tab shows all requests awaiting the member's response, grouped into four categories:

| Category | Source | Actions |
|---|---|---|
| Co-founder Invites | `cofounder_invites` table (status: pending) | Accept / Decline |
| Data Room Requests | `data_room_access_requests` table (status: pending) | Approve / Deny |
| Ecosystem Collaboration Invites | `portfolio_companies` table (status: pending) | Accept / Decline |
| Connection Requests | `matches` table (status: pending) | Accept / Decline |

### Accepted Tab

The accepted tab shows a historical record of all requests the member has already accepted, grouped by the same four categories:

| Category | What Is Shown |
|---|---|
| Accepted Co-founder Invites | Projects the member joined as co-founder, with inviter name, project name, sector, and a link to view the project |
| Accepted Ecosystem Collaborations | Active partnership records showing partner details, ask/offer categories, and LinkedIn link if available |
| Accepted Connections | Members the user is now connected to, showing name, role, fit score, and a link to the matches page |
| Approved Data Room Access | Data room access requests the member granted, showing requester details, their message, and the approval timestamp |

Each item in both tabs displays:
- Avatar (initials-based)
- Member name, role title, and metadata tags (sector, city, stage)
- Timestamp of when the request was created or resolved
- Status badge (e.g. "Accepted ✓", "Pending", "Connected")

---

## Data Room

Each startup project can have a **Data Room** — a secure, access-controlled file repository for sensitive documents such as pitch decks, financials, and due diligence materials.

### Uploading Files
Project owners and co-founders can upload files to the project's data room. Files are stored in a dedicated Supabase Storage bucket (`data-room`) with row-level security.

### Requesting Access
Investors and other members can request access to a project's data room. The request is submitted with an optional message explaining why access is needed. The request appears in the project owner's **Requests Inbox** under "Data Room Requests."

### Access Control

| Who | Access |
|---|---|
| Project owner | Full read/write |
| Co-founders | Full read (same as owner) |
| Approved requesters | Read-only after the owner approves |
| Advisors / Admin | Full read |
| All others | No access |

### Workflow
1. Investor clicks "Request Access" on a project's data room
2. Owner receives the request in their Requests Inbox (pending)
3. Owner approves or denies from the inbox
4. If approved, the investor can view and download files
5. The approval appears in the investor's Accepted tab

---

## Role: Advisor / Admin

### Dashboard
Advisors see a system-level overview:
- **System Pulse header** with the advisor's name, role badge, and urgency count (companies with no matches)
- **Metric cards:** Total companies on platform, companies needing matching, pending match pairs, approved/accepted/introduced pairs (with a sparkline)
- **Urgency Queue panel:** Lists all verified companies that have zero matches — the primary action queue
- **Matching Funnel panel:** Lists companies that have matches, grouped by status
- **Sector Pie Chart:** Breakdown of platform companies by sector

### Manual Match (`/advisor/manual-match`)
Advisors can create a match between any two verified members:
1. Select Member A and Member B from dropdowns
2. Optionally add a summary and fit score
3. Submit to `POST /api/matching/manual`

Used when the advisor spots a fit that the AI hasn't surfaced, or to fast-track a known introduction.

### Match Review Queue (`/advisor/match-queue`)
Advisors review AI-generated and member-requested matches before they are surfaced to members. Matches start in `pending` status and can be `approved` or declined by an advisor.

### Member Management (`/advisor/members`)
Advisors can view all platform members, update verification status, and advance members through stages (Stage 1–4).

### Network Graph (`/advisor/network-graph`)
A visual graph showing connections between platform members based on existing matches. Used to identify clusters, gaps, and highly-connected members.

### Document Review (`/advisor/documents`)
Advisors review documents submitted by members (e.g. pitch decks) as part of the verification process.

---

## The Two Matching Systems

Founders Arena runs two parallel matching systems that operate independently but are bridged by a single action.

### System 1 — Member-to-Member Matches (`matches` table)

**Created by:** Advisor manual match, or member "Request Intro" / "Express Interest" action
**Participants:** Any two verified members (startup ↔ investor, or other combinations)
**Status lifecycle:** `pending` → `approved` → `accepted` → `introduced`
**Key rules:**
- `member_a_id` and `member_b_id` follow canonical UUID ordering (`a < b`) to prevent duplicate pairs
- When a member initiates an intro, their own side is auto-set to `accepted`; the counterpart gets `pending`
- Both parties must accept for the match to move forward
- The `ignoreDuplicates: true` flag on upsert makes the action idempotent — clicking "Request Intro" twice doesn't create duplicates

### System 2 — Project-to-Investor AI Scoring (`project_match_scores` table)

**Created by:** Startup clicking "Find investors" OR investor clicking "Score this project"
**What it stores:** `project_id`, `investor_profile_id`, `fit_score` (0–100), `summary` (one-line AI explanation), `generated_at`
**AI model:** Google Gemini — separate instruction files for startup-initiated (`geminiProjectMatchingInstructions.ts`) and investor-initiated (`geminiMatchingInstructions.ts`) scoring
**Key point:** A score alone does not create a match. It is a read-only signal that surfaces in the pipeline view.

### The Bridge

`POST /api/matches/request-intro` connects System 2 to System 1:
1. Looks up the fit score and summary from `project_match_scores`
2. Creates a record in `matches` using canonical pair ordering
3. Sets the requester's status to `accepted`, counterpart to `pending`
4. Returns the match object

This is the moment a scored opportunity becomes an active introduction request.

---

## Notifications

The platform has a notifications system accessible via a bell icon in the dashboard header. The bell shows an unread count badge. Notifications are fetched from `GET /api/notifications` on dashboard load.

Notification types include:
- New match or intro requests
- Co-founder invites received
- Data room access requests
- Portfolio nominations (for ecosystem partners)

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `profiles` | All member profile data including `member_role`, `verification_status`, `stage`, bio, asks, offers |
| `user_roles` | RBAC role per user (`member`, `advisor`, `admin`, `staff`) |
| `projects` | Startup investment projects with description, sector, stage, `is_active` flag |
| `project_match_scores` | AI fit scores linking a project to an investor profile |
| `matches` | Member-to-member intro records with dual-status fields (`member_a_status`, `member_b_status`) |
| `deal_cards` | Deal pipeline cards tracking active deals through stages |
| `portfolio_companies` | Links ecosystem partners to their active portfolio startups (also used for collaboration invites) |
| `portfolio_nominations` | Invite tokens (14-day expiry) sent by partners to prospective portfolio startups |
| `cofounder_invites` | Pending and accepted co-founder invitations with token, email/phone, project, and expiry |
| `cofounder_links` | Accepted co-founder relationships linking a co-founder profile to a project |
| `ad_credit_ledger` | Credit transaction log — every debit and credit for every member, with reason and optional expiry |
| `data_room_files` | Files uploaded to project data rooms, stored in Supabase Storage |
| `data_room_access_requests` | Requests by members to access a project's data room (status: pending/approved/denied) |

---

## Test Accounts

| Role | Name / Organisation | Email | Password |
|---|---|---|---|
| Startup | Camille Lim / PayFlow Technologies | test.startup.match@exoasia.com | MatchTest123! |
| Investor | Jonathan Reyes / Meridian Ventures | test.investor.match@exoasia.com | MatchTest123! |
| Ecosystem Partner | Maria Santos / FinTech Philippines Network | test.ecosys.partner@exoasia.com | MatchTest123! |

**Tested result:** PayFlow scored **97/100** against Meridian Ventures. An intro was requested by the startup, accepted by the investor, and the match status is `accepted` (both sides). This pair validates the full startup-to-investor pipeline.

---

## Known Gaps / Not Yet Implemented

- **Nomination acceptance flow:** When a partner nominates a startup via email, the startup cannot yet click through to accept and be added to `portfolio_companies`. This link must currently be seeded via script.
- **Stage advancement UI:** Startups advance through stages (1–4) as part of the verification process, but the self-serve stage progression UI and its full unlock system are not yet complete.
- **Deal board:** The deal board route exists and is shown in the sidebar, but the full deal card lifecycle UI may not be fully implemented.
- **Events page:** The events route exists in the sidebar but the full events management feature may be partial.
- **Co-founder onboarding path:** Co-founders invited via email who are not yet platform members must sign up via the invite link. A dedicated co-founder signup flow optimised for this path is not yet complete.
- **Credit spending enforcement:** The credit cost rules (1 credit per match acceptance, premium report unlocks, etc.) are defined in `CREDIT_CONFIG` but may not be fully enforced across all gated actions yet.

---

# END OF PLATFORM KNOWLEDGE BASE

---

Now write the full product document using the knowledge above. Format it as a professional Microsoft Word document with:

- A cover section with the platform name, tagline, and a one-paragraph executive summary
- Clear H1 / H2 / H3 heading hierarchy
- Role sections written in plain English for a non-technical audience (product managers, investors, new team members)
- Tables for structured comparisons (role permissions, match statuses, stat definitions, credit costs)
- Workflow steps written as numbered lists ("1. The startup clicks... 2. The system creates... 3. The user sees...")
- A "Credits & Payments" section that explains the credit economy: how credits are earned (welcome bonus, events, subscriptions, packages), how they are spent, and the subscription tiers and one-time package options
- A "Co-Founder Access" section explaining how founders can invite co-founders, the two acceptance paths (in-app for existing members, email link for new users), and what access co-founders receive
- A "Requests Inbox" section covering both the Pending tab and the Accepted tab, with the four request types listed in a table
- A "Data Room" section describing secure file storage, the access request workflow, and who can access what
- A "How Matching Works" section that explains both systems and the bridge in simple terms
- A "Current Limitations" section at the end covering the known gaps
- Page-break markers (use `---` between major sections)

Do not include the raw knowledge base in the output — only the formatted document.
