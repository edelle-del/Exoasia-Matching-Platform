"use client";

const painPoints = [
  "Unqualified introductions waste weeks.",
  "Social networks reward volume over alignment.",
  "Deal momentum dies without structure.",
];

const archetypes = [
  {
    title: "SME Owner",
    detail: "Operators scaling real businesses who need verified counterparts.",
  },
  {
    title: "Capital Allocator",
    detail: "Investors seeking disciplined, consent-based deal flow.",
  },
  {
    title: "Strategic Operator",
    detail:
      "Execution leaders with distribution, procurement, or systems leverage.",
  },
];

const steps = [
  "Apply and complete your intake call.",
  "Attend weekly sessions to build context.",
  "Join monthly dinners for trust building.",
  "Submit ASK and OFFER for alignment mapping.",
  "Earn verification for Stage 2 entry.",
];

const differentiators = [
  "Advisor gatekeeping over automated matches.",
  "Consent required before any introduction.",
  "Verification standards at every stage.",
  "Offline conversion with curated events.",
  "Deal board accountability and follow-through.",
];

const experiences = [
  {
    title: "Weekly Session",
    detail: "Deal execution briefings and member updates.",
    cadence: "Every week",
  },
  {
    title: "Monthly Dinner",
    detail: "Small, curated tables for verified members.",
    cadence: "Once per month",
  },
  {
    title: "Pitch Night",
    detail: "Structured evaluation for qualified opportunities.",
    cadence: "Quarterly",
  },
];

const roles = [
  {
    title: "Explorer",
    detail: "Stage 0 candidate gathering context.",
  },
  {
    title: "Ignite Member",
    detail: "Stage 1 member participating in sessions and events.",
  },
  {
    title: "Verified Operator",
    detail: "Stage 2 member cleared for matching cycles.",
  },
  {
    title: "Growth Advisor",
    detail: "Human gatekeeper ensuring alignment and standards.",
  },
];

const benefits = [
  "Access to weekly operating sessions.",
  "Invitation to private dinners and pitch nights.",
  "Clear pathway into verification.",
  "Structured intake to define ASK and OFFER.",
];

import { useAuth } from "../providers";
import Link from "next/link";

export default function StageOnePage() {
  const { role } = useAuth();
  const handleActivate = () => {
    console.log("stage-1-activate");
  };

  const handleRsvp = (eventName: string) => {
    console.log("stage-1-rsvp", eventName);
  };

  return (
    <div className="pb-[96px]">
      <section className="relative gn-hero overflow-hidden px-[10%] py-32">
        <div className="relative z-10 mx-auto w-full max-w-[1200px]">
          <span className="gn-badge">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Stage 01 - Ignite
          </span>
          <div className="mt-6 font-display text-[clamp(48px,8vw,120px)] font-black uppercase leading-[0.92]">
            <div className="text-[var(--color-text-primary)]">
              This is where
            </div>
            <div className="text-[var(--color-accent)]">real business</div>
            <div className="text-[var(--color-text-primary)]">gets done</div>
          </div>
          <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-[var(--color-text-secondary)]">
            Stage 1 is a controlled environment for serious operators. The goal
            is clarity, context, and standards before matching begins.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              className="gn-btn-primary"
              type="button"
              onClick={handleActivate}
            >
              Activate Stage 01 -&gt;
            </button>
            {role && ["advisor", "staff", "admin"].includes(role) && (
              <Link href="/advisor/manual-match" className="gn-btn-secondary">
                Advisor tools
              </Link>
            )}
            <button className="gn-btn-secondary" type="button">
              View events
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">You do not need more contacts</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {painPoints.map((item) => (
              <div key={item} className="gn-card">
                <p className="text-[15px] text-[var(--color-text-secondary)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Who belongs here</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {archetypes.map((item) => (
              <div key={item.title} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">How the network works</p>
          <div className="mt-10 space-y-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-label)]">
                  Step {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">What makes this different</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {differentiators.map((item) => (
              <div key={item} className="gn-card">
                <p className="text-[15px] text-[var(--color-text-secondary)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">The experience</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {experiences.map((item) => (
              <div key={item.title} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
                <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  {item.cadence}
                </p>
                <button
                  className="mt-6 gn-btn-secondary"
                  type="button"
                  onClick={() => handleRsvp(item.title)}
                >
                  RSVP
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Your role</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((item) => (
              <div key={item.title} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Stage 1 benefits</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8">
            <ul className="space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button
              className="mt-8 gn-btn-primary"
              type="button"
              onClick={handleActivate}
            >
              Join Stage 01 -&gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
