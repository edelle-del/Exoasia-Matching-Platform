// Member Stages
export type Stage = "0" | "1" | "2" | "3" | "4";
export type VerificationStatus = "unverified" | "pending" | "verified";
export type AskOfferStatus = "Open" | "In Progress" | "Resolved" | "Available" | "Matched" | "Closed";
export type MemberRole = "Explorer" | "Growth Partner" | "Community Builder" | "Growth Advisor";

// Member Profile
export interface Member {
  id: string;
  email: string;
  stage: Stage;
  verificationStatus: VerificationStatus;
  fullName: string;
  businessName: string;
  sector: string;
  role: string;
  city: string;
  shortBio: string;
  introVideoUrl?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Credit System
export interface CreditBalance {
  memberId: string;
  credits: number;
  isPremium: boolean;
  subscriptionEndDate?: Date;
}

// ASK and OFFER
export interface Ask {
  id: string;
  memberId: string;
  title: string;
  description: string;
  status: AskOfferStatus;
  createdAt: Date;
  matchedWith?: string;
}

export interface Offer {
  id: string;
  memberId: string;
  title: string;
  description: string;
  status: AskOfferStatus;
  createdAt: Date;
  matchedWith?: string;
}

// Matching
export interface Match {
  id: string;
  memberId1: string;
  memberId2: string;
  fitScore: number;
  reason: string;
  matchType: "ask-offer" | "offer-ask";
  status: "pending" | "accepted" | "declined" | "introduced";
  member1Status: "pending" | "accepted" | "declined";
  member2Status: "pending" | "accepted" | "declined";
  createdAt: Date;
}

// Deal Board
export type DealStage =
  | "Discover"
  | "Intro & Scoping"
  | "Proposal/Pilot"
  | "Negotiation/Legal"
  | "Closed-Won"
  | "Closed-Lost";

export type DealConfidence = "Low" | "Medium" | "High";

export interface Deal {
  id: string;
  dealName: string;
  matchId: string;
  member1Id: string;
  member2Id: string;
  stage: DealStage;
  fitScore: number;
  confidence: DealConfidence;
  impactProjection: string;
  lastActivity: Date;
  nextStep?: string;
  nextStepDueDate?: Date;
  isStaleFlagged: boolean;
  staleReason?: string;
  closeReasonCode?: string;
  notes?: string;
}

// Events
export type EventType = "dinner" | "pitch-night" | "masterclass" | "session";

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  date: Date;
  location: string;
  maxAttendees?: number;
  minStageRequired: Stage;
  registeredMembers: string[];
  attendedMembers: string[];
}

export interface EventRegistration {
  id: string;
  memberId: string;
  eventId: string;
  registeredAt: Date;
  attended: boolean;
  pitchCredit: number; // 0 or 1 per event
}

// Documents
export interface Document {
  id: string;
  memberId: string;
  documentType: "sec-certificate" | "dti-registration" | "other";
  fileUrl: string;
  status: "submitted" | "under-review" | "approved" | "rejected";
  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // Advisor ID
  rejectReason?: string;
}

// Payments
export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  currency: string;
  type: "membership-fee" | "credit-upgrade" | "subscription";
  status: "pending" | "completed" | "failed";
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  billingCycle: "monthly" | "yearly";
}

// Notifications
export type NotificationType = "match" | "intro-request" | "document-approved" | "credits-low" | "event-reminder" | "deal-update";

export interface Notification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedEntityId?: string;
  createdAt: Date;
}
