import { Stage, SubscriptionPlan } from "./index";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits-20", name: "Starter Pack", credits: 20, price: 199 },
  { id: "credits-75", name: "Growth Pack", credits: 75, price: 649 },
  { id: "credits-200", name: "Scale Pack", credits: 200, price: 1499 },
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
  ENTRY_COST: 1, // Each match acceptance costs 1 credit
};

// Subscription Plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 20,
    price: 149,
    billingCycle: "monthly",
  },
  {
    id: "professional",
    name: "Professional",
    credits: 60,
    price: 349,
    billingCycle: "monthly",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 120,
    price: 649,
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
