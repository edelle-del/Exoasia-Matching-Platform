import { Stage, SubscriptionPlan } from "./index";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export const SECTOR_OPTIONS = [
  "Advanced Manufacturing",
  "Aerospace & Defense",
  "Agtech",
  "Animal Health",
  "Brand & Retail",
  "Crypto & Digital Assets",
  "Deeptech",
  "Energy",
  "Enterprise & AI",
  "Fintech",
  "Food & Beverage",
  "GOAL",
  "Health",
  "Insurtech",
  "Lifetech",
  "Maritime",
  "Media & Advertising",
  "Medtech",
  "Mobility & Physical AI",
  "New Materials & Packaging",
  "Real Estate & Construction",
  "Semiconductors",
  "Smart Cities",
  "Sportstech",
  "Supply Chain",
  "Sustainability",
  "Travel & Hospitality",
];


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
    id: "6mo",
    label: "6 Months",
    months: 6,
    upfront: 120,
    perMonth: 20,
    credits: 0,
    savings: null,
    tagline: {
      startup: "For serious startups executing an active funding round.",
      investor: "For investors running an active deal cycle.",
      ecosystem_partner: "For partners managing an active cohort or program.",
    },
    featured: true,
    features: {
      startup: [
        "Free investor profiles & compatibility breakdowns (Bypasses weekly limit)",
        "Free investor match report regeneration (Bypasses weekly limit)",
        "Free cofounder email invites",
        "Free community member profile unlocks (Bypasses weekly limit)",
        "Request investor intros (Free)",
      ],
      investor: [
        "Free startup pitch deck access (Bypasses weekly limit)",
        "Free financial snapshot & compatibility score views (Bypasses weekly limit)",
        "Free deal pipeline PDF exports (Unlocks feature completely)",
        "Free community member profile unlocks (Bypasses weekly limit)",
        "Request founder intros (Free)",
      ],
      ecosystem_partner: [
        "Free opportunity & program call posts (Bypasses weekly limit)",
        "Free cohort analytics dashboard access (Unlocks feature completely)",
        "Bulk AI startup-to-program matching",
        "Feature startups in partner digest",
        "Send partnership invites via email",
      ],
    },
  },
  {
    id: "12mo",
    label: "12 Months",
    months: 12,
    upfront: 204,
    perMonth: 17,
    credits: 0,
    savings: "Save 15% vs bi-annual",
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
  { id: "match-bundle", name: "Match Bundle", credits: 100, price: 99 },
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
