import { Stage, SubscriptionPlan } from "./index";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export interface DurationPlan {
  id: string;
  label: string;
  months: number;
  upfront: number;   // USD total billed upfront
  perMonth: number;  // USD effective monthly rate
  credits: number;   // total credits delivered on payment
  savings: string | null;
  tagline: {
    startup: string;
    investor: string;
    ecosystem_partner: string;
  };
  featured: boolean;
  features: {
    startup: string[];
    investor: string[];
    ecosystem_partner: string[];
  };
}

export const DURATION_PLANS: DurationPlan[] = [
  {
    id: "1mo",
    label: "1 Month",
    months: 1,
    upfront: 29,
    perMonth: 29,
    credits: 60,
    savings: null,
    tagline: {
      startup: "For founders on a single-month active sprint.",
      investor: "For investors on a focused deal sourcing sprint.",
      ecosystem_partner: "For partners running a focused program sprint.",
    },
    featured: false,
    features: {
      startup: [
        "Investor profiles & breakdowns — free, no cr",
        "Request intros to matched investors",
        "Unlock community member profiles",
      ],
      investor: [
        "View startup pitch decks",
        "Unlock compatibility scores",
        "Request intros to founders",
      ],
      ecosystem_partner: [
        "Post opportunities to matched startups",
        "Send partnership invites via email",
        "Send community intro requests",
      ],
    },
  },
  {
    id: "3mo",
    label: "3 Months",
    months: 3,
    upfront: 60,
    perMonth: 20,
    credits: 180,
    savings: "Save 30% vs. monthly",
    tagline: {
      startup: "For founders exploring the market over a quarter.",
      investor: "For investors building a pipeline over a quarter.",
      ecosystem_partner: "For partners scouting cohort candidates over a quarter.",
    },
    featured: false,
    features: {
      startup: [
        "Everything in 1-Month",
        "Regenerate investor match reports",
        "Send community intro requests",
      ],
      investor: [
        "Everything in 1-Month",
        "Unlock startup financial snapshots",
        "Unlock community member profiles",
      ],
      ecosystem_partner: [
        "Everything in 1-Month",
        "Access cohort analytics reports",
      ],
    },
  },
  {
    id: "6mo",
    label: "6 Months",
    months: 6,
    upfront: 96,
    perMonth: 16,
    credits: 360,
    savings: "Save 45% vs. monthly",
    tagline: {
      startup: "For serious startups executing an active funding round.",
      investor: "For investors running an active deal cycle.",
      ecosystem_partner: "For partners managing an active cohort or program.",
    },
    featured: true,
    features: {
      startup: [
        "Everything in 3-Month",
        "Invite cofounders via email",
        "Run multiple active intro campaigns",
      ],
      investor: [
        "Everything in 3-Month",
        "Export deal pipeline reports",
        "Send community intro requests",
      ],
      ecosystem_partner: [
        "Everything in 3-Month",
        "Bulk AI match startups to program",
        "Feature startups in partner digest",
      ],
    },
  },
  {
    id: "12mo",
    label: "12 Months",
    months: 12,
    upfront: 144,
    perMonth: 12,
    credits: 720,
    savings: "Save 58% — deepest discount",
    tagline: {
      startup: "For high-growth companies seeking long-term backing.",
      investor: "For investors committed to a long-term deal flow strategy.",
      ecosystem_partner: "For partners building a long-term startup ecosystem.",
    },
    featured: false,
    features: {
      startup: [
        "Everything in 6-Month",
        "Full platform access · 12-month runway",
      ],
      investor: [
        "Everything in 6-Month",
        "Full deal sourcing · 12-month runway",
      ],
      ecosystem_partner: [
        "Everything in 6-Month",
        "Full program toolkit · 12-month runway",
      ],
    },
  },
];

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits-20", name: "Starter Pack", credits: 20, price: 5 },
  { id: "credits-75", name: "Growth Pack", credits: 75, price: 15 },
  { id: "credits-200", name: "Scale Pack", credits: 200, price: 35 },
];

// Stage Configuration
export const STAGE_CONFIG: Record<
  Stage,
  { label: string; title: string; description: string }
> = {
  "0": {
    label: "Discover",
    title: "Masterclass & Intake",
    description: "Introduction to the platform",
  },
  "1": {
    label: "Ignite",
    title: "Member Onboarding",
    description: "Build context and prepare for verification",
  },
  "2": {
    label: "Match",
    title: "Active Matching",
    description: "Access verified matches and deal flow",
  },
  "3": {
    label: "Commit",
    title: "Guided Growth",
    description: "Advisor-led deal structuring",
  },
  "4": {
    label: "Guide",
    title: "Strategic Advisor",
    description: "Advisor status within the network",
  },
};

// Credit Configuration
export const CREDIT_CONFIG = {
  FREE_TIER: {
    credits: 5,
  },
  WELCOME_BONUS: {
    credits: 10,
    reason: "Welcome bonus — account created",
  },
  ENTRY_COST: 1, // Each match acceptance costs 1 credit
};

// Subscription Plans — prices in USD; charged in PHP at checkout via USD_TO_PHP_RATE
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 20,
    price: 20,
    billingCycle: "monthly",
  },
  {
    id: "professional",
    name: "Professional",
    credits: 60,
    price: 50,
    billingCycle: "monthly",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 120,
    price: 100,
    billingCycle: "monthly",
  },
];

// Deal Board Stages
export const DEAL_STAGES = [
  "Discover",
  "Intro & Scoping",
  "Proposal/Pilot",
  "Negotiation/Legal",
  "Closed-Won",
  "Closed-Lost",
] as const;

export const DEAL_STAGE_DESCRIPTIONS: Record<string, string> = {
  Discover: "Initial ASK/OFFER qualified",
  "Intro & Scoping": "Curated intro complete and scope alignment in progress",
  "Proposal/Pilot": "Proposal sent or pilot design in review",
  "Negotiation/Legal": "Terms redlining, legal, and compliance checks",
  "Closed-Won": "Agreements signed and kickoff confirmed",
  "Closed-Lost": "Closed with reason code captured",
};

// Event Types
export const EVENT_TYPES = {
  dinner: { label: "Private Dinner", icon: "ri-restaurant-line" },
  "pitch-night": { label: "Pitch Night", icon: "ri-mic-line" },
  masterclass: { label: "Masterclass", icon: "ri-graduation-cap-line" },
  session: { label: "Weekly Session", icon: "ri-clipboard-line" },
};

// Document Types
export const DOCUMENT_TYPES = {
  "sec-certificate": "SEC Certificate of Registration",
  "dti-registration": "DTI Business Name Registration",
  other: "Other Documentation",
};

// Verification Requirements by Stage
export const VERIFICATION_REQUIREMENTS: Record<Stage, string[]> = {
  "0": [],
  "1": ["Email verified", "Profile complete"],
  "2": ["Intro video uploaded", "NDA signed", "Documents submitted"],
  "3": ["Full KYC approved", "Active deal activity"],
  "4": ["Advisor appointment"],
};

// Default Notifications
export const DEFAULT_NOTIFICATIONS = {
  MATCH: "New match available! Check your matches to accept or decline.",
  INTRO_REQUEST:
    "Waiting for the other party to accept your introduction request.",
  DOCUMENT_APPROVED:
    "Your documents have been approved! You're now Stage 2 verified.",
  CREDITS_LOW:
    "Your credits are running low. Upgrade your subscription to continue.",
  EVENT_REMINDER: "Upcoming event reminder. Don't forget to register!",
  DEAL_UPDATE: "Your deal has been updated. Check the deal board for details.",
};
