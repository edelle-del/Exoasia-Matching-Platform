import type { DocSection, MemberRole } from "./types";
import { sectionVisible } from "./types";

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    blocks: [
      {
        type: "p",
        text: "FOUNDERS ARENA is a private, invite-only matching platform for verified startups, investors, and ecosystem partners across the Philippines and Southeast Asia. Here's how to get started in four steps.",
      },
      { type: "h3", text: "1. Create Your Account" },
      {
        type: "p",
        text: "Self-registration is open to everyone. You can sign up directly using your email address or Google account.",
      },
      {
        type: "list",
        items: [
          "Go to Sign Up (/sign-up) to register a new account",
          "If you already have an account, go to Sign In (/sign-in)",
        ],
      },
      { type: "screenshot", src: "/docs/screenshots/sign-in.png", alt: "Sign-in page", caption: "Sign-in page" },
      { type: "h3", text: "2. Accept Your Invite & Consents" },
      {
        type: "steps",
        items: [
          "Open Accept Invite (/accept-invite)",
          "Review and accept PDPA-PH data privacy consent",
          "Accept NDA-light and non-circumvention agreements",
          "Confirm your account — access activates once claim is complete",
        ],
      },
      { type: "h3", text: "3. Complete Onboarding" },
      {
        type: "p",
        text: "New members are guided through onboarding (/onboarding) to build a verified profile. What you fill in depends on your role:",
      },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "list",
              items: [
                "Full name, role title, city, country, sector, bio, WhatsApp",
                "Top ASKs and OFFERs — what you seek and what you provide",
                "Business name, employee band, revenue range",
                "Product stage (Working Prototype, MVP, or Traction)",
                "Fundraising stage and growth thesis",
              ],
            },
          ],
          investor: [
            {
              type: "list",
              items: [
                "Full name, role title, city, country, sector, bio, WhatsApp",
                "Top ASKs and OFFERs — deal flow needs and what you offer founders",
                "Organization name and investor type",
                "Investment thesis, ticket size, target regions, stage preferences",
                "Three verifiable references",
              ],
            },
          ],
          ecosystem_partner: [
            {
              type: "list",
              items: [
                "Full name, role title, city, country, bio, WhatsApp",
                "Organization type (TBI, accelerator, VC firm, angel network, etc.)",
                "Sector focus, target regions, and stage preference",
                "Top ASKs and OFFERs for portfolio support",
                "Three verifiable references",
              ],
            },
          ],
        },
      },
      { type: "screenshot", alt: "Onboarding form", caption: "Onboarding — profile basics" },
      {
        type: "p",
        text: "On submit, your profile is created with pending verification. You receive 10 welcome credits automatically. A Growth Advisor reviews your account before matching features unlock.",
      },
      {
        type: "tip",
        text: "The more complete your profile — especially ASKs, OFFERs, and thesis fields — the better AI fit scores will be. Include specifics: stage, sector, ticket size, and geography.",
      },
      { type: "h3", text: "4. Explore Your Dashboard" },
      {
        type: "p",
        text: "Once verified, land on your Dashboard (/dashboard). Your sidebar and pipeline summary depend on role:",
      },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "list",
              items: [
                "Portal label: Startup Profile",
                "Sidebar: Deal Board, Matches, Requests, Data Room, Events, Community",
                "Pipeline card: active projects, investor match count, best fit score",
              ],
            },
          ],
          investor: [
            {
              type: "list",
              items: [
                "Portal label: Investor Profile",
                "Sidebar: Deal Board, Matches, Requests, Data Room, Events, Community",
                "Pipeline card: opportunities scored, total score cards, best fit score",
              ],
            },
          ],
          ecosystem_partner: [
            {
              type: "list",
              items: [
                "Portal label: Partner Profile",
                "Sidebar: Portfolio, Events, Community, Requests",
                "Partner Portfolio card: quick links to Portfolio Overview and Co-Pilot Kanban",
                "No Deal Board or project creation — you monitor portfolio companies instead",
              ],
            },
          ],
        },
      },
      { type: "screenshot", alt: "Dashboard", caption: "Member dashboard" },
    ],
  },
  {
    id: "profile-dashboard",
    title: "Your Profile & Dashboard",
    blocks: [
      {
        type: "p",
        text: "Your profile is the foundation for every match, score, and introduction on the platform.",
      },
      { type: "h3", text: "Editing Your Profile" },
      {
        type: "p",
        text: "Access your profile from the sidebar footer (/profile). You can update:",
      },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "list",
              items: [
                "Contact info — name, bio, WhatsApp, city",
                "Business details — sector, stage, employee band, revenue",
                "ASK/OFFER framework — top categories and free-text summaries",
              ],
            },
          ],
          investor: [
            {
              type: "list",
              items: [
                "Contact info — name, bio, WhatsApp, city",
                "Investment mandate — thesis, ticket size, regions, stage preferences",
                "ASK/OFFER framework — deal flow needs and what you offer",
              ],
            },
          ],
          ecosystem_partner: [
            {
              type: "list",
              items: [
                "Organization info — type, sector focus, target regions",
                "Contact info — name, bio, WhatsApp, city",
                "ASK/OFFER framework — portfolio support categories",
              ],
            },
          ],
        },
      },
      {
        type: "p",
        text: "Changes to ASKs and OFFERs affect future AI scoring cycles. Keep them current before each matching cycle.",
      },
      { type: "h3", text: "Profile Strength" },
      {
        type: "p",
        text: "The dashboard profile strength ring shows how complete your profile is and suggests the next field to fill. Stronger profiles rank higher in advisor review queues and produce more accurate AI fit scores.",
      },
      { type: "h3", text: "Account Settings" },
      {
        type: "p",
        text: "Manage security and contact preferences at Account Settings (/account-settings): update phone, send password reset link, report a bug, or request account deletion.",
      },
      {
        type: "note",
        text: "Accounts created via Google Sign-In do not have a platform password. Use your Google account to sign in.",
      },
      { type: "screenshot", src: "/docs/screenshots/account-settings.png", alt: "Account settings", caption: "Account settings" },
    ],
  },
  // ── Startup + Investor matching ─────────────────────────────
  {
    id: "ai-matching",
    title: "AI Matching & Fit Scores",
    roles: ["startup", "investor"],
    blocks: [
      {
        type: "p",
        text: "FOUNDERS ARENA uses Exoasia Intelligence (powered by Google Gemini) to score structural compatibility between startup projects and investor profiles. Scores are signals — they do not create introductions on their own.",
      },
      { type: "h3", text: "How Scoring Works" },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "steps",
              items: [
                "Create an active project (via your dashboard pipeline or matches flow)",
                "Click Find Investors on a project card",
                "AI scores your project against eligible investor profiles (0–100)",
                "Results appear on Matches (/matches) ranked by fit",
              ],
            },
          ],
          investor: [
            {
              type: "steps",
              items: [
                "Browse active startup projects on your Matches pipeline",
                "Click Score this project on any project card",
                "AI generates a fit score and one-line summary",
                "The score badge appears on the project card",
              ],
            },
          ],
        },
      },
      { type: "screenshot", alt: "Matches pipeline", caption: "Matches page — AI score cards" },
      { type: "h3", text: "Fit Score Tiers" },
      {
        type: "table",
        headers: ["Score", "Badge", "Meaning"],
        rows: [
          ["80–100", "Emerald", "Excellent match — strong structural alignment"],
          ["65–79", "Indigo", "Strong match — worth pursuing"],
          ["50–64", "Amber", "Moderate match — review rationale before acting"],
          ["Below 50", "Dimmed", "Low match — alignment gaps likely"],
        ],
      },
      { type: "h3", text: "What the AI Considers" },
      {
        type: "table",
        headers: ["Dimension", "Weight"],
        rows: [
          ["Sector focus and vertical alignment", "High"],
          ["Business / fundraising stage", "High"],
          ["ASK/OFFER strategic fit", "High"],
          ["Capital requirement / allocation mandate", "Medium"],
          ["Growth thesis compatibility", "Medium"],
        ],
      },
      {
        type: "tip",
        text: "Run scoring after updating your profile or project description. Stale scores do not auto-refresh — re-score when your thesis or project details change materially.",
      },
    ],
  },
  {
    id: "requesting-introductions",
    title: "Requesting Introductions",
    roles: ["startup", "investor"],
    blocks: [
      {
        type: "p",
        text: "Scoring tells you who might align. Introductions are how you act on that signal — always with advisor oversight and bilateral consent.",
      },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            { type: "h3", text: "Request Intro" },
            {
              type: "steps",
              items: [
                "Open Matches (/matches)",
                "Find a scored investor with a strong fit",
                "Click Request Intro",
                "Your side is marked Accepted; the investor receives Pending",
                "The button changes to Requested ✓ — you cannot request twice",
              ],
            },
            {
              type: "screenshot",
              alt: "Request Intro button",
              caption: "Request Intro on a scored investor",
            },
          ],
          investor: [
            { type: "h3", text: "Express Interest" },
            {
              type: "steps",
              items: [
                "Open Matches (/matches) or browse scored projects",
                "Click Express Interest on a project without an existing match",
                "Your side is marked Accepted; the startup receives Pending",
                "The button changes to Sent",
              ],
            },
            {
              type: "screenshot",
              alt: "Express interest",
              caption: "Express interest on a project",
            },
          ],
        },
      },
      { type: "h3", text: "What Happens Next" },
      {
        type: "steps",
        items: [
          "The counterpart sees the request in their Matches and Requests Inbox",
          "They accept or decline",
          "If both accept, the match immediately becomes an active connection",
          "Profile data, pitch decks, and contact info are unlocked based on your credits",
          "The deal card moves to the Deal Board for tracking",
        ],
      },
      {
        type: "important",
        text: "Unlocking full profile data, pitch decks, or requesting introductions consumes credits based on your role. The platform facilitates alignment — it does not guarantee outcomes.",
      },
    ],
  },
  {
    id: "match-pipeline",
    title: "Match Pipeline",
    roles: ["startup", "investor"],
    blocks: [
      {
        type: "p",
        text: "Your Matches page (/matches) has two sections: score cards (AI-scored pairings with action buttons) and a match list (active introduction records with Accept / Decline for pending items).",
      },
      { type: "h3", text: "Match Status Definitions" },
      {
        type: "table",
        headers: ["Status", "What it means"],
        rows: [
          ["Pending", "One party initiated; the other has not responded"],
          ["Accepted", "Both parties accepted — contact info is unlocked"],
          ["Declined", "One party declined — does not persist in future cycles"],
        ],
      },
      { type: "h3", text: "Accepting or Declining" },
      {
        type: "steps",
        items: [
          "Review the counterpart's sector, stage, and fit score",
          "Click Accept or Decline on the match card or in Requests Inbox",
          "Accepting may consume 1 credit (see Credits & Plans)",
          "Declined matches are archived — they will not reappear in the next cycle",
        ],
      },
    ],
  },
  {
    id: "deal-board",
    title: "Deal Board",
    roles: ["startup", "investor"],
    blocks: [
      {
        type: "p",
        text: "Once both parties are Accepted or Introduced, track deal progress on the Deal Board (/deal-board).",
      },
      { type: "h3", text: "Deal Board Stages" },
      {
        type: "p",
        text: "The flow starts right from the moment a connection is requested:",
      },
      {
        type: "table",
        headers: ["Stage", "Entry criteria", "Typical next step"],
        rows: [
          ["Qualified", "When one party requests a connection, it automatically appears here.", "Counterpart accepts request"],
          ["Intro & Scoping", "When both parties accept the connection.", "Draft scope / problem statement"],
          ["Proposal", "Proposal or pilot terms sent.", "Agree success metrics"],
          ["Negotiation", "MoU / term sheet in progress.", "Sign or pass"],
          ["Closed Won", "Agreement signed; kickoff confirmed.", "—"],
          ["On Hold", "Deal paused.", "Capture learnings"],
          ["Aborted", "Match was declined by either party.", "Archive or review"],
        ],
      },
      { type: "screenshot", alt: "Deal board kanban", caption: "Deal board kanban" },
      { type: "h3", text: "Working With Deal Cards" },
      {
        type: "list",
        items: [
          "Fit score — from the original AI match",
          "Confidence — Low / Medium / High",
          "Impact projection — estimated deal value or KPI impact",
          "Next action and due date",
          "Blocker flags",
        ],
      },
      {
        type: "p",
        text: "Promote an intro to a deal from accepted introductions. Update your next action at least every 7 days — stale cards are flagged. Negotiation-stage cards stale for 14+ days escalate to your Growth Advisor. On Hold requires a reason code before archiving.",
      },
    ],
  },
  {
    id: "data-room",
    title: "Data Room",
    roles: ["startup", "investor"],
    blocks: [
      {
        type: "p",
        text: "Each startup project can have a secure Data Room (/data-room) for pitch decks, financial models, cap tables, and diligence materials.",
      },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            { type: "h3", text: "Uploading Files" },
            {
              type: "p",
              text: "Project owners and co-founders can upload files at any time. Files are stored securely with access controlled per project.",
            },
            { type: "h3", text: "Approving Access Requests" },
            {
              type: "steps",
              items: [
                "Investors request access from your project or data room",
                "Review requests in Requests Inbox — see requester name, role, and message",
                "Click Approve or Deny",
                "Approved requesters get read-only access to all files",
              ],
            },
          ],
          investor: [
            { type: "h3", text: "Requesting Access" },
            {
              type: "steps",
              items: [
                "Navigate to the project or data room",
                "Click Request Access",
                "Optionally add a message explaining your interest",
                "The request appears in the project owner's Requests Inbox",
                "Once approved, you get read-only access to all files in that data room",
              ],
            },
          ],
        },
      },
      { type: "screenshot", alt: "Data room", caption: "Data room — file list and access controls" },
      { type: "h3", text: "Access Levels" },
      {
        type: "table",
        headers: ["Role", "Access"],
        rows: [
          ["Project owner", "Full read and write"],
          ["Co-founders", "Full read"],
          ["Approved requesters", "Read-only after approval"],
          ["Growth Advisors / Admins", "Full read"],
          ["Everyone else", "No access"],
        ],
      },
    ],
  },
  {
    id: "co-founders",
    title: "Co-Founders",
    roles: ["startup"],
    blocks: [
      {
        type: "p",
        text: "Startup projects can be co-owned by multiple founders. Co-founders receive owner-equivalent access to the project, data room, match scores, and deal cards.",
      },
      { type: "h3", text: "Inviting a Co-Founder" },
      {
        type: "steps",
        items: [
          "Open the project page",
          "Click Invite Co-founder",
          "Enter their email address",
          "An invite token is sent (valid 14 days)",
        ],
      },
      { type: "h3", text: "Accepting an Invite" },
      {
        type: "list",
        items: [
          "Existing members: invite appears in Requests Inbox under Co-founder Invites",
          "New users: email signup link with token — linked to the project after registration",
        ],
      },
      {
        type: "tip",
        text: "Co-founders see the project on their own Matches and Data Room views — no need to share files externally.",
      },
    ],
  },
  // ── Ecosystem partner ───────────────────────────────────────
  {
    id: "portfolio-overview",
    title: "Portfolio Command Center",
    roles: ["ecosystem_partner"],
    blocks: [
      {
        type: "p",
        text: "Open Portfolio (/ecosystem) to monitor every startup in your portfolio — their projects, match scores, and introduction pipeline.",
      },
      { type: "h3", text: "Summary Metrics" },
      {
        type: "table",
        headers: ["Metric", "Definition"],
        rows: [
          ["Portfolio Companies", "Startups in your active portfolio"],
          ["Active Projects", "Investment projects across portfolio companies"],
          ["Total Intros", "Cumulative introduction records"],
          ["Active Matches", "Accepted or Introduced matches"],
          ["Pending", "Awaiting a response from one party"],
          ["Stale Alerts", "No activity in 7+ days"],
        ],
      },
      { type: "h3", text: "Company Feed & Deep-Dive" },
      {
        type: "p",
        text: "The company feed lists each portfolio startup with sector, stage, project count, best fit score, and match counts. Click any company for a deep-dive: all projects with scoring data and a full match timeline with status, fit score, last activity, and stale flags.",
      },
      {
        type: "screenshot",
        alt: "Portfolio overview",
        caption: "Portfolio overview — company feed and metrics",
      },
    ],
  },
  {
    id: "co-pilot-kanban",
    title: "Co-Pilot Kanban",
    roles: ["ecosystem_partner"],
    blocks: [
      {
        type: "p",
        text: "The Co-Pilot Kanban tab shows all portfolio match cards across companies in three columns:",
      },
      {
        type: "table",
        headers: ["Column", "Match statuses"],
        rows: [
          ["Discover", "Pending"],
          ["Intro Sent", "Approved"],
          ["Active", "Accepted, Introduced"],
        ],
      },
      {
        type: "p",
        text: "Each card shows the portfolio company name, investor counterpart, fit score, and last activity date. Use the company filter dropdown to focus on one startup.",
      },
      { type: "h3", text: "Stale Matches & Intervene" },
      {
        type: "p",
        text: "Cards with no activity for 7+ days show a rose border and an Intervene button. Clicking Intervene resets the activity clock and signals that you have nudged the parties.",
      },
      {
        type: "screenshot",
        alt: "Co-Pilot Kanban",
        caption: "Co-Pilot Kanban — multi-company match board",
      },
    ],
  },
  {
    id: "nominate-startup",
    title: "Nominate a Startup",
    roles: ["ecosystem_partner"],
    blocks: [
      {
        type: "steps",
        items: [
          "Click Nominate Startup in the portfolio header or company feed",
          "Enter the startup's email and an optional personal message",
          "A 14-day invite token is generated and sent",
          "On acceptance, the startup joins your portfolio",
        ],
      },
      {
        type: "note",
        text: "The startup-side nomination acceptance flow is rolling out. Contact your Growth Advisor if a nominated startup cannot complete the link.",
      },
    ],
  },
  // ── Shared member sections ──────────────────────────────────
  {
    id: "requests-inbox",
    title: "Requests Inbox",
    blocks: [
      {
        type: "p",
        text: "All inbound invitations and connection requests live in Requests (/requests). The sidebar badge shows your total pending count and refreshes every 30 seconds.",
      },
      { type: "screenshot", alt: "Requests inbox", caption: "Requests inbox — pending tab" },
      { type: "h3", text: "Pending Tab" },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "table",
              headers: ["Category", "Actions"],
              rows: [
                ["Co-founder Invites", "Accept / Decline"],
                ["Data Room Requests", "Approve / Deny"],
                ["Ecosystem Collaboration", "Accept / Decline"],
                ["Connection Requests (intros from investors)", "Accept / Decline"],
              ],
            },
          ],
          investor: [
            {
              type: "table",
              headers: ["Category", "Actions"],
              rows: [
                ["Connection Requests (intros from startups)", "Accept / Decline"],
                ["Data Room Requests (if you own projects)", "Approve / Deny"],
              ],
            },
          ],
          ecosystem_partner: [
            {
              type: "table",
              headers: ["Category", "Actions"],
              rows: [
                ["Ecosystem Collaboration (portfolio invites you sent)", "Track status"],
                ["Connection Requests", "Accept / Decline"],
              ],
            },
          ],
        },
      },
      {
        type: "p",
        text: "The Accepted tab is a historical record of everything you've resolved — with links back to the relevant project or match.",
      },
    ],
  },
  {
    id: "credits-plans",
    title: "Credits & Plans",
    blocks: [
      {
        type: "p",
        text: "FOUNDERS ARENA uses a credit economy for premium platform actions. Your balance appears on the dashboard.",
      },
      { type: "h3", text: "Earning Credits" },
      {
        type: "table",
        headers: ["Source", "Credits", "When"],
        rows: [
          ["Welcome bonus", "+10", "Account created after onboarding"],
          ["Event attendance", "Variable", "Registered event with pitch credit"],
          ["Starter plan", "+20 / month", "Active subscription"],
          ["Professional plan", "+60 / month", "Active subscription"],
          ["Premium plan", "+120 / month", "Active subscription"],
          ["Credit packages", "+20 / +75 / +200", "One-time purchase"],
        ],
      },
      { type: "h3", text: "Spending Credits" },
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "table",
              headers: ["Action", "Cost"],
              rows: [
                ["Unlock investor profile", "1 credit"],
                ["Request intro to investor", "1 credit"],
                ["Request intro to founder", "1 credit"],
                ["Regenerate match report", "1 credit"],
                ["Send co-founder invite", "1 credit"],
              ],
            },
            {
              type: "p",
              text: "Manage subscriptions and purchases on Payments (/payments). Welcome credits cover your first few actions.",
            },
            { type: "screenshot", alt: "Credits and plans", caption: "Credits & subscription plans" },
          ],
          investor: [
            {
              type: "table",
              headers: ["Action", "Cost"],
              rows: [
                ["View startup pitch deck", "1 credit"],
                ["View startup financial snapshot", "1 credit"],
                ["View compatibility score", "1 credit"],
                ["Request intro to founder", "1 credit"],
                ["Export deal pipeline report", "1 credit"],
              ],
            },
            {
              type: "p",
              text: "Manage subscriptions on Payments (/payments). Credits are consumed when unlocking data or requesting intros.",
            },
            { type: "screenshot", alt: "Credits and plans", caption: "Credits & subscription plans" },
          ],
          ecosystem_partner: [
            {
              type: "table",
              headers: ["Action", "Cost"],
              rows: [
                ["Post opportunity / program call", "1 credit"],
                ["Bulk AI match startups to program", "1 credit"],
                ["Feature startup in digest", "1 credit"],
                ["Send partnership email invite", "1 credit"],
                ["View cohort analytics dashboard", "1 credit"],
              ],
            },
            {
              type: "p",
              text: "Partners receive credits on signup. Platform access for verified ecosystem partners is free — credits support premium actions.",
            },
            { type: "screenshot", alt: "Credits partner", caption: "Partner credits" },
          ],
        },
      },
    ],
  },
  {
    id: "events-community",
    title: "Events & Community",
    blocks: [
      { type: "h3", text: "Events" },
      {
        type: "p",
        text: "The Events page (/events) lists platform events — weekly sessions, monthly dinners, pitch nights, and Demo Days. Register to earn pitch credits and attendance-based Ad Credits where applicable.",
      },
      { type: "h3", text: "Community" },
      {
        type: "p",
        text: "Community (/community) is the member directory and engagement surface. Visibility is gated by verification stage and match status — you only see profiles you are permitted to view under platform consent rules.",
      },
    ],
  },
  {
    id: "account-security",
    title: "Account & Security",
    blocks: [
      { type: "h3", text: "Sign-In Options" },
      {
        type: "list",
        items: [
          "Email & password — invited email + password set during claim",
          "Google Sign-In — one-click OAuth where enabled",
        ],
      },
      { type: "h3", text: "Changing Your Password" },
      {
        type: "p",
        text: "Email/password accounts: Account Settings → enter your email → Send reset link → follow the link to /reset-password. Google accounts manage password through Google.",
      },
      { type: "h3", text: "Data & Privacy" },
      {
        type: "p",
        text: "Your profile, projects, match history, and uploaded documents are stored securely. Data is governed by PDPA-PH. KYC documents are visible only to advisors and administrators.",
      },
      { type: "h3", text: "Reporting Issues" },
      {
        type: "p",
        text: "Use Report a Bug in Account Settings to send subject, description, and reproduction steps to the platform team.",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal & Disclaimers",
    blocks: [
      {
        type: "important",
        text: "FOUNDERS ARENA and The Growth Network do not offer securities, solicit investments, or provide financial advice. All investment decisions and transactions are initiated and executed solely by participating members. The Network provides structured facilitation, infrastructure, and verified introductions only. Participation does not guarantee capital allocation, partnership formation, or transaction completion.",
      },
      { type: "h3", text: "Approved Language" },
      {
        type: "table",
        headers: ["Do not use", "Use instead"],
        rows: [
          ["Raise capital through us", "Structured introductions"],
          ["Access funding", "Alignment facilitation"],
          ["Investor pool", "Capital conversations"],
          ["Get funded fast", "Verified deal flow"],
          ["Investment guarantee", "Facilitated matching"],
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    blocks: [
      {
        type: "role-blocks",
        blocks: {
          startup: [
            {
              type: "list",
              items: [
                "How do I get an account? — Anyone can register on the platform. Go to the Sign Up page (/sign-up) to create your account.",
                "How accurate are AI fit scores? — Scores reflect structural alignment, not guarantees. Review the rationale; 80+ indicates excellent compatibility.",
                "Can I request the same intro twice? — No. The button shows Requested ✓ after the first request.",
                "Who sees my full profile? — Only you, authorized advisors, and counterparts in confirmed consent-verified matches.",
                "How do credits work? — Earn on signup and events; spend on match acceptance. Balance on dashboard, history on /payments.",
              ],
            },
          ],
          investor: [
            {
              type: "list",
              items: [
                "How do I get an account? — Anyone can register on the platform. Go to the Sign Up page (/sign-up) to create your account.",
                "How do I discover startups? — Score projects on Matches; browse all active projects on the platform.",
                "What happens when I express interest? — The startup receives a pending request in their Requests Inbox.",
                "Do scores update automatically? — No. Re-score after meaningful profile or project changes.",
                "How do credits work? — Accepting intros may cost 1 credit. Manage balance on /payments.",
              ],
            },
          ],
          ecosystem_partner: [
            {
              type: "list",
              items: [
                "How do I get a partner account? — Provisioned by admin script or advisor onboarding with ecosystem_partner role.",
                "Can partners invest through the platform? — Partners monitor portfolio deal flow; they do not list investment projects.",
                "What is Intervene on the Kanban? — Resets the stale clock on matches inactive 7+ days.",
                "How do nominations work? — Email invite with 14-day token; startup joins portfolio on acceptance.",
                "What can I see in my portfolio? — Projects, match scores, and deal activity for linked startups only.",
              ],
            },
          ],
        },
      },
      {
        type: "list",
        items: [
          "Is my data secure? — Yes. HTTPS in transit, row-level security, advisor-only KYC access.",
          "How do I delete my account? — Account Settings → Delete account → type confirmation phrase.",
        ],
      },
    ],
  },
];

export function getSectionsForRole(role: MemberRole) {
  return DOC_SECTIONS.filter((s) => sectionVisible(s, role));
}

export function getNavForRole(role: MemberRole) {
  return getSectionsForRole(role).map((s) => ({ id: s.id, title: s.title }));
}
