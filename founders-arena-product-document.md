# Founders Arena
### by Exoasia
#### Product Documentation — Platform Overview

---

**Tagline:** *Where Southeast Asia's best early-stage startups meet the right investors.*

**Executive Summary**

Founders Arena is a private, invite-only B2B matching platform built by Exoasia to connect verified early-stage startups with investors and ecosystem partners across the Philippines and Southeast Asia. Unlike open directories or marketplaces, every member is curated before gaining access — ensuring that every introduction carries weight. The platform combines AI-powered fit scoring, a structured two-sided introduction pipeline, co-founder collaboration tools, a secure project data room, and a credit-based economy into a single workspace for founders, investors, and ecosystem builders. This document provides a comprehensive reference for product managers, new team members, investors, and onboarding stakeholders.

---

# Table of Contents

1. Platform Overview
2. Role System & Navigation
3. Credits & Payments
4. Role: Startup
5. Role: Investor
6. Role: Ecosystem Partner
7. Role: Advisor / Admin
8. Co-Founder Access
9. Requests Inbox
10. Data Room
11. How Matching Works
12. Notifications
13. Database Reference
14. Test Accounts
15. Current Limitations

---

# 1. Platform Overview

Founders Arena is a closed, curated network. Members cannot self-register as active participants — every account goes through a verification process managed by a platform advisor before the member gains access to matching features.

The platform operates a **two-sided pipeline**:

- **Startups** list investment projects and use AI scoring to discover compatible investors
- **Investors** browse live startup projects and generate AI fit scores to identify opportunities
- **Both sides** can initiate introduction requests, which require mutual acceptance before a formal introduction is made by an advisor

A third role — the **Ecosystem Partner** — does not participate in deals directly. Instead, partners (accelerators, incubators, network organisations) manage a curated portfolio of startups and monitor their matching activity through a dedicated command center.

All of this is governed by a **credit economy**: members earn credits on signup, through events, and via subscription plans, and spend them on premium platform actions.

---

# 2. Role System & Navigation

## 2.1 Role Layers

There are two independent role layers that work together to control what a member can see and do.

**RBAC Role** — controls route-level access and admin tooling:

| RBAC Role | Who It Applies To |
|---|---|
| `member` | All regular members (startups, investors, ecosystem partners) |
| `advisor` | Platform operators who manage matches and members |
| `admin` | Full platform access |

**Member Role** — controls the in-app experience (stored in `profiles.member_role`):

| Member Role | Description |
|---|---|
| `startup` | Companies seeking investment |
| `investor` | Funds or angel investors deploying capital |
| `ecosystem_partner` | Accelerators, incubators, or network organisations managing startup portfolios |

## 2.2 Sidebar Navigation by Role

| Navigation Item | Startup | Investor | Ecosystem Partner | Advisor / Admin |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Projects | ✓ | ✓ | — | — |
| Deal Board | ✓ | ✓ | — | — |
| Requests (Inbox) | ✓ | ✓ | ✓ | — |
| Events | ✓ | ✓ | ✓ | — |
| Community | ✓ | ✓ | ✓ | — |
| Portfolio (`/ecosystem`) | — | — | ✓ | — |
| Introductions | — | — | — | ✓ |
| Member Management | — | — | — | ✓ |
| Match Review Queue | — | — | — | ✓ |
| Document Review | — | — | — | ✓ |
| Manual Match | — | — | — | ✓ |
| Network Graph | — | — | — | ✓ |

---

# 3. Credits & Payments

Founders Arena uses a **credit-based economy** to manage access to premium platform actions. Every member has a credit balance, tracked in real time and displayed as a metric card on their dashboard.

## 3.1 How Credits Work

Credits are stored in a transaction ledger called `ad_credit_ledger`. Every time a member earns or spends credits, a new record is written to their ledger with:

- The amount changed (positive for earned, negative for spent)
- A human-readable reason (e.g. *"Welcome bonus — account created"*)
- The date and time of the transaction
- An optional expiry date for time-limited credits

The member's **current credit balance** is the running sum of all their ledger entries.

## 3.2 Earning Credits

| Source | Credits Earned | When It Happens |
|---|---|---|
| Welcome Bonus | +10 | Automatically granted when a member completes onboarding |
| Event Attendance | Variable | Tracked via the `pitch_credit` field on event registrations |
| Starter Plan | +20 / month | Active Starter subscription |
| Professional Plan | +60 / month | Active Professional subscription |
| Premium Plan | +120 / month | Active Premium subscription |
| Small Credit Package | +20 | One-time purchase via the Payments page |
| Medium Credit Package | +75 | One-time purchase via the Payments page |
| Large Credit Package | +200 | One-time purchase via the Payments page |

## 3.3 Spending Credits

| Action | Cost |
|---|---|
| Match acceptance | 1 credit |
| Investor match report (premium AI score) | Variable |
| Profile unlock (full counterpart profile) | Variable |
| Premium introduction request | Variable |

## 3.4 Subscription Plans

Members can upgrade to a monthly subscription plan to receive a regular credit top-up. Plans are managed from the **Payments** page at `/payments`.

| Plan | Monthly Credits | Intended For |
|---|---|---|
| Free Tier | 5 | Default for all new members |
| Starter | 20 | Members beginning to use matching features |
| Professional | 60 | Active members with regular deal flow |
| Premium | 120 | Power users with high-volume activity |

## 3.5 One-Time Credit Packages

Members who need an immediate top-up without a subscription can purchase credit packages at any time:

| Package | Credits |
|---|---|
| Small | 20 credits |
| Medium | 75 credits |
| Large | 200 credits |

---

# 4. Role: Startup

## 4.1 Onboarding

When a startup completes onboarding, the platform collects the following information:

- Full name and business name
- Role title, sector, and city
- Short bio and WhatsApp number
- Ask categories (what they are looking for)
- Offer categories (what they can provide)
- Free-text summaries of asks and offers

On submission:

1. The member's profile is created with `verification_status: pending` and `stage: 1`
2. **10 welcome credits are automatically added to the member's credit ledger**
3. A platform advisor is notified to review and verify the new account

The startup cannot access matching features until an advisor advances their stage.

## 4.2 Dashboard

| Element | Description |
|---|---|
| Portal label | "Startup Profile" |
| Pending matches | Count of intro requests awaiting response |
| Active deals | Count of deals in progress |
| Credits | Current credit balance |
| Peer benchmark | Chart comparing profile strength against peers |
| Profile strength ring | Percentage of profile fields completed, with a "next step" tip |
| Pipeline summary card | Active projects count, investor match count, best fit score — links to `/matches` |

## 4.3 Projects

Startups create investment projects at `/projects`. Each project contains:

- Project name and description
- Fundraising stage (e.g. Pre-Seed, Seed, Pre-Series A)
- Sector
- Details covering traction, technology, raise amount, and use of funds
- An `is_active` flag — only active projects are visible to investors and eligible for AI scoring

The projects page shows the startup's own projects **and** any projects they have been added to as a co-founder. Each project card displays:

- Project name, stage, and sector
- A score badge (colour-coded) if AI scoring has been run
- A **"Find Investors"** button

**Score colour tiers:**

| Colour | Score Range | Meaning |
|---|---|---|
| Emerald | ≥ 80 | Excellent match |
| Indigo | ≥ 65 | Strong match |
| Amber | ≥ 50 | Moderate match |
| Dimmed | < 50 | Low match |

## 4.4 Finding Investors (AI Scoring)

When a startup clicks **"Find Investors"** on a project:

1. The platform sends the project description and all investor profiles to the Gemini AI model
2. Gemini scores the fit between the project and each investor (0–100) and generates a one-line explanation
3. Scores are stored and the startup sees a ranked list of investors with fit percentages

## 4.5 Requesting an Introduction

From the pipeline page (`/matches`), a startup can click **"Request Intro"** next to a scored investor:

1. The platform creates an introduction record with the startup's side set to *Accepted* and the investor's side set to *Pending*
2. The button becomes "Requested ✓" and cannot be clicked again
3. The investor sees the request in their pipeline and can accept or decline

## 4.6 Match Pipeline (`/matches`)

The pipeline page has two sections:

- **Project score cards** — all investors AI-scored against the startup's projects, with fit percentage and a "Request Intro" button
- **Match list** — all active introduction records, with inline **Accept** and **Decline** buttons for pending matches

**Match status definitions:**

| Status | Meaning |
|---|---|
| Pending | One party has initiated; the other has not yet responded |
| Approved | A platform advisor has reviewed and approved the introduction |
| Accepted | Both parties have accepted |
| Introduced | The advisor has formally introduced both parties |
| Declined | One party declined the introduction |

---

# 5. Role: Investor

## 5.1 Onboarding

Investors follow the same onboarding flow as startups, with additional fields:

- Investment thesis
- Ticket size range
- Target geography

**10 welcome credits are automatically added to the credit ledger on completion.**

## 5.2 Dashboard

| Element | Description |
|---|---|
| Portal label | "Investor Profile" |
| Pending matches | Count of intro requests awaiting response |
| Active deals | Count of deals in progress |
| Credits | Current credit balance |
| Peer benchmark | Profile strength comparison chart |
| Profile strength ring | Profile completion percentage |
| Pipeline summary card | Opportunities (distinct startups scored), Score cards (total scores generated), Best fit score — links to `/matches` |

## 5.3 Browsing Projects

Investors see **all active startup projects** on the platform at `/projects` — not just projects belonging to their connections. Each card shows the startup name, sector, stage, and a score badge if the investor has already scored that project.

## 5.4 Scoring a Project

When an investor clicks **"Score this project"**:

1. The platform sends the investor's profile and thesis alongside the project description to the Gemini AI model
2. A fit score (0–100) and one-line summary are generated and saved
3. The score badge appears on the project card

## 5.5 Expressing Interest

On any project without an existing match, an investor can click **"Express Interest"**:

1. A match record is created with the investor's side set to *Accepted* and the startup's side set to *Pending*
2. The button becomes "Sent"
3. The startup sees the request in their Requests Inbox and pipeline

This is the reverse direction of the startup-initiated intro — the investor initiates, the startup responds.

## 5.6 Match Pipeline (`/matches`)

The investor's pipeline shows:

- **Scored project cards** — startup projects they have scored, with fit percentage and an "Express Interest" button if no match exists yet
- **Match list** — all introduction records with inline Accept / Decline buttons for pending matches

---

# 6. Role: Ecosystem Partner

## 6.1 What Is an Ecosystem Partner?

An ecosystem partner is an accelerator, incubator, or network organisation that sponsors and monitors a curated portfolio of startups on the platform. Partners do not pitch their own projects or participate in startup-investor deals — their role is to:

- Add startups to their managed portfolio
- Monitor each portfolio company's matching pipeline
- Intervene when matches go stale
- Facilitate introductions between their portfolio companies and investors

## 6.2 Account Setup

Ecosystem partner accounts are provisioned via an admin script that sets the member's role to `ecosystem_partner`. Standard self-serve onboarding with role selection will be the eventual path.

## 6.3 Dashboard

| Element | Description |
|---|---|
| Portal label | "Partner Profile" |
| Metric cards | Pending matches, Active deals, Credits, Peer benchmark (same as other members) |
| Profile strength ring | Profile completion percentage |
| Partner Portfolio card | Two quick-link tiles — "Portfolio Overview" and "Co-Pilot Kanban" — both linking to `/ecosystem` |

## 6.4 Portfolio Command Center (`/ecosystem`)

The partner's main workspace, with two views accessible via tabs.

### Tab 1: Portfolio Overview

**Summary metrics:**

| Metric | Definition |
|---|---|
| Portfolio Companies | Number of startups in the partner's active portfolio |
| Active Projects | Total active investment projects across all portfolio startups |
| Total Intros | Cumulative introduction records across all portfolio startups |
| Active Matches | Matches with status *Accepted* or *Introduced* |
| Pending | Matches awaiting a response from one party |
| Stale Alerts | Matches with no activity in 7 or more days |

**Company feed:** Lists each portfolio startup with name, verification badge, stale alert indicator, sector, stage, project count, best fit score, and pending/active match counts. Each entry links to a detailed company panel.

**Company deep-dive panel:** Clicking a company opens a full view showing the company header, all active projects with scoring data, and a complete match timeline with status, fit score, last activity date, and stale flag.

### Tab 2: Co-Pilot Kanban

A multi-company kanban board showing all portfolio match cards sorted into three stages:

| Column | Statuses Shown |
|---|---|
| Discover | Pending |
| Intro Sent | Approved |
| Active | Accepted, Introduced |

Each card shows the portfolio company name, investor counterpart, fit score, and last activity date.

**Stale matches** (7+ days inactive) are highlighted with a rose border and an **"Intervene"** button. Clicking Intervene resets the stale clock and signals that the partner has nudged the parties.

A **company filter dropdown** lets the partner narrow the kanban to a single portfolio company.

### Nominating a Startup

The **"Nominate Startup"** button (in the page header and company feed) opens a modal:

1. Partner enters the startup's email address and an optional personal message
2. An invite token is generated (valid for 14 days) and sent to the startup
3. Upon acceptance, the startup is linked to the partner's portfolio

> The startup-side acceptance flow for nominations is not yet fully implemented. Portfolio links can currently be created via a seed script.

---

# 7. Role: Advisor / Admin

## 7.1 Dashboard

Advisors see a system-level control panel:

| Element | Description |
|---|---|
| System Pulse header | Advisor name, role badge, and urgency count (companies with zero matches) |
| Metric cards | Total platform companies, companies needing matching, pending match pairs, approved/accepted/introduced pairs |
| Urgency Queue | All verified companies that have no matches — the primary daily action queue |
| Matching Funnel | Companies that have matches, grouped by match status |
| Sector Pie Chart | Platform companies broken down by sector |

## 7.2 Manual Match (`/advisor/manual-match`)

Advisors can create a match between any two verified members:

1. Select Member A and Member B from dropdowns
2. Optionally enter a summary and fit score
3. Submit to create the match record

Used when the advisor identifies a fit that the AI has not surfaced, or to fast-track a known introduction.

## 7.3 Match Review Queue (`/advisor/match-queue`)

All AI-generated and member-requested matches begin in *Pending* status. Advisors review each match and either approve it (surfacing it to members) or decline it. No match reaches members without advisor review.

## 7.4 Member Management (`/advisor/members`)

Advisors can view all platform members, update verification status, and manually advance members through stages 1 through 4 as they complete verification milestones.

## 7.5 Network Graph (`/advisor/network-graph`)

A visual graph of connections between platform members based on existing matches. Used to identify clusters, spot gaps in the network, and find highly-connected members.

## 7.6 Document Review (`/advisor/documents`)

Advisors review documents (such as pitch decks) submitted by members as part of the verification process before a member is approved.

---

# 8. Co-Founder Access

## 8.1 Overview

A startup project can be co-owned by multiple founders. The lead founder (project owner) can invite additional co-founders to any of their projects. Co-founders receive the same level of access to the project as the owner.

## 8.2 What Co-Founders Can Access

Once a co-founder invitation is accepted, the co-founder gains full access to:

| Area | Access Level |
|---|---|
| Project tabs and settings | Full owner-equivalent access |
| Data room files | Full read access to all uploaded files |
| Investor match scores | View AI scores for the project |
| Deal cards | View and manage deal cards linked to the project |

The co-founder's **Projects** page will show both their own projects and all projects they co-found.

## 8.3 Inviting a Co-Founder

1. From a project page, the owner clicks **"Invite Co-founder"**
2. They enter the co-founder's email address or phone number
3. The platform generates a unique invite token (valid for 14 days)
4. The invite is sent to the co-founder

## 8.4 Acceptance Paths

There are two paths depending on whether the co-founder already has a platform account:

### Existing Platform Members

1. The invite appears in the co-founder's **Requests Inbox** under "Co-founder Invites"
2. The co-founder reviews the invite (project name, inviter, sector, tagline) and clicks **Accept** or **Decline** — no need to leave the platform
3. On acceptance, a `cofounder_links` record is created immediately

### New Users (Not Yet on the Platform)

1. The co-founder receives an email with a signup link pre-loaded with the invite token
2. They complete the standard registration flow
3. Acceptance is handled automatically on signup completion
4. A `cofounder_links` record is created and the co-founder is added to the project

## 8.5 Invite Rules

- Invite tokens expire after 14 days
- Duplicate link attempts are silently ignored — the system is idempotent
- The owner can also add an existing platform member directly without sending an email invite

---

# 9. Requests Inbox (`/requests`)

## 9.1 Overview

All members — startups, investors, and ecosystem partners — have access to a **unified Requests Inbox** at `/requests`. This single screen consolidates every type of inbound invitation or connection request the member has received.

The **Requests** item in the sidebar navigation shows a live badge with the total number of pending items. The badge updates automatically every 30 seconds.

## 9.2 Pending Tab

The Pending tab shows all requests that require the member's response, grouped into four categories:

| Category | Where It Comes From | Available Actions |
|---|---|---|
| Co-founder Invites | Another founder has invited this member to co-own a project | Accept / Decline |
| Data Room Requests | An investor or member is requesting access to a project's data room | Approve / Deny |
| Ecosystem Collaboration Invites | An ecosystem partner has nominated this startup for their portfolio | Accept / Decline |
| Connection Requests | Another member has initiated a match or introduction request | Accept / Decline |

Each pending item displays:
- Avatar (initials-based)
- Name, role title, sector, city, and stage metadata
- A short description of the request
- Timestamp of when the request was created
- Action buttons

## 9.3 Accepted Tab

The Accepted tab shows a historical record of all requests the member has previously accepted. It is grouped by the same four categories:

| Category | What Is Shown |
|---|---|
| Accepted Co-founder Invites | Projects the member joined as co-founder, with inviter name, project name, sector, and a link to view the project |
| Accepted Ecosystem Collaborations | Active partnership records with partner details, ask/offer categories, and LinkedIn link if available |
| Accepted Connections | Members the user is now connected to, with name, role, fit score, and a link to the matches page |
| Approved Data Room Access | Data room access requests the member granted, showing requester details, their message, and the approval timestamp |

Each accepted item displays:
- Avatar with initials
- Name, role title, and metadata tags
- An "Accepted ✓" or "You are now connected" status badge
- Timestamp of when the request was resolved

---

# 10. Data Room

## 10.1 Overview

Each startup project can have a **Data Room** — a secure, access-controlled file repository for sensitive documents such as pitch decks, financial models, cap tables, and due diligence materials. The data room is gated by an approval workflow so that project owners control exactly who can see their documents.

## 10.2 Uploading Files

Project **owners** and **co-founders** can upload files to the project's data room at any time. Files are stored in a dedicated, secured storage bucket with row-level security policies enforced at the database level.

## 10.3 Requesting Access

Any investor or verified member can request access to a project's data room:

1. The member navigates to the project and clicks **"Request Access"**
2. They may include an optional message explaining why they need access
3. The request is submitted and appears immediately in the project owner's **Requests Inbox** under "Data Room Requests"

## 10.4 Approving or Denying a Request

The project owner reviews the request in their Requests Inbox:

1. Owner sees the requester's name, role, sector, and their message
2. Owner clicks **Approve** or **Deny**
3. If approved, the requester immediately gains read access to all files in the data room
4. The approval appears in the requester's **Accepted Tab** under "Approved Data Room Access"

## 10.5 Access Control Matrix

| Who | Access Level |
|---|---|
| Project owner | Full read and write |
| Co-founders | Full read access (same as owner) |
| Approved requesters | Read-only after owner approval |
| Advisors and Admins | Full read access |
| All other members | No access |

---

# 11. How Matching Works

Founders Arena runs two parallel matching systems that operate independently but are connected through a single bridging action.

## 11.1 System 1 — Member-to-Member Introductions

This system tracks the formal relationship between two members — specifically, whether they have agreed to be introduced to each other.

**A match record is created when:**
- An advisor manually creates a match between two members
- A startup clicks "Request Intro" from their pipeline
- An investor clicks "Express Interest" on a project

**The introduction lifecycle:**

| Stage | What It Means |
|---|---|
| Pending | One party has initiated; the other has not responded |
| Approved | A platform advisor has reviewed and approved the introduction |
| Accepted | Both parties have accepted |
| Introduced | The advisor has formally made the introduction |
| Declined | One party declined |

**Key rules:**
- Pair records are stored in canonical order (by member ID) to prevent duplicate pairs
- When a member initiates, their own side is auto-set to *Accepted* — only the counterpart's response is needed
- Clicking "Request Intro" twice has no effect — the system is idempotent

## 11.2 System 2 — AI Project Scoring

This system uses Google Gemini to score the compatibility between a startup project and an investor profile. It is a read-only signal — it does not create a formal match.

**A score is created when:**
- A startup clicks "Find Investors" on one of their projects
- An investor clicks "Score this project" on any active startup project

**Each score record stores:**
- The startup project
- The investor profile
- A fit score from 0 to 100
- A one-line AI-generated explanation
- The timestamp of when the score was generated

**Scoring colour tiers:**

| Colour | Score Range | Signal |
|---|---|---|
| Emerald | ≥ 80 | Excellent match |
| Indigo | ≥ 65 | Strong match |
| Amber | ≥ 50 | Moderate match |
| Dimmed | < 50 | Low match |

## 11.3 The Bridge: Turning a Score into an Introduction

When a startup or investor decides to act on a score, they click **"Request Intro"** or **"Express Interest"**. This single action bridges the two systems:

1. The platform looks up the existing fit score and summary for the project-investor pair
2. It creates a formal introduction record (System 1) using that score data
3. The initiating party's side is set to *Accepted*; the counterpart's side is set to *Pending*
4. The counterpart sees the request in their pipeline and Requests Inbox
5. Both parties must accept before the introduction advances to the advisor review stage

This is the moment a scored opportunity becomes an active introduction request.

---

# 12. Notifications

Members receive in-app notifications accessible via a bell icon in the dashboard header. The bell displays an unread count badge that is refreshed on each dashboard load.

**Notification types include:**

- New match or introduction requests from another member
- Co-founder invitations received
- Data room access requests (for project owners)
- Portfolio nomination invites (for ecosystem partners)
- Match status updates (approved, introduced, declined)

---

# 13. Database Reference

| Table | Purpose |
|---|---|
| `profiles` | All member profile data: `member_role`, `verification_status`, `stage`, bio, asks, offers, subscription fields |
| `user_roles` | RBAC role per user: `member`, `advisor`, `admin`, `staff` |
| `projects` | Startup investment projects with description, sector, stage, and `is_active` flag |
| `project_match_scores` | AI fit scores linking a startup project to an investor profile |
| `matches` | Member-to-member introduction records with dual-status fields (`member_a_status`, `member_b_status`) |
| `deal_cards` | Deal pipeline cards tracking active deals through stages |
| `portfolio_companies` | Links ecosystem partners to their active portfolio startups; also used for collaboration invites |
| `portfolio_nominations` | Invite tokens (14-day expiry) sent by ecosystem partners to prospective portfolio startups |
| `cofounder_invites` | Pending and accepted co-founder invitations with token, email/phone, project reference, status, and expiry |
| `cofounder_links` | Accepted co-founder relationships linking a co-founder profile to a specific project |
| `ad_credit_ledger` | Credit transaction log — every debit and credit for every member, with reason and optional expiry date |
| `data_room_files` | Files uploaded to project data rooms, stored in Supabase Storage with RLS enforcement |
| `data_room_access_requests` | Requests by members to access a project's data room (status: pending / approved / denied) |

---

# 14. Test Accounts

The following test accounts are available for QA, demos, and onboarding walkthroughs:

| Role | Name | Organisation | Email | Password |
|---|---|---|---|---|
| Startup | Camille Lim | PayFlow Technologies | test.startup.match@exoasia.com | MatchTest123! |
| Investor | Jonathan Reyes | Meridian Ventures | test.investor.match@exoasia.com | MatchTest123! |
| Ecosystem Partner | Maria Santos | FinTech Philippines Network | test.ecosys.partner@exoasia.com | MatchTest123! |

**Validated pipeline result:** PayFlow Technologies scored **97 out of 100** against Meridian Ventures. An introduction was requested by the startup and accepted by the investor. The match status is *Accepted* on both sides. This pair validates the complete startup-to-investor matching pipeline end-to-end.

---

# 15. Current Limitations

The following features are defined and partially built but not yet fully implemented as of this document version.

| Area | Current State |
|---|---|
| **Nomination acceptance flow** | When an ecosystem partner nominates a startup via email, the startup cannot yet click through to accept and be added to the partner's portfolio. Portfolio links must currently be created via a seed script. |
| **Stage advancement UI** | Startups advance through stages 1–4 as part of verification, but the self-serve stage progression interface and its full unlock system are not yet complete. Advisors can advance stages manually via the Member Management panel. |
| **Deal board** | The deal board route exists and appears in the sidebar, but the full deal card lifecycle interface may not be fully implemented. |
| **Events page** | The events route exists in the sidebar navigation but the full events management feature is partial. |
| **Co-founder onboarding path** | Co-founders invited via email who are not yet platform members must sign up through the invite link. A dedicated co-founder signup flow optimised for this path is not yet complete. |
| **Credit spending enforcement** | Credit cost rules (1 credit per match acceptance, premium report unlocks, etc.) are defined in `CREDIT_CONFIG` but may not be fully enforced across all gated actions yet. |

---

*Document prepared by Exoasia. For platform access or partnership enquiries, contact the Founders Arena team.*
