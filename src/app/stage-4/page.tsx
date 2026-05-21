"use client";

import { useAuth } from "../providers";
import Link from "next/link";

const unlocks = [
  {
    title: "Due diligence framework",
    detail: "Structured documentation and verification workflows.",
  },
  {
    title: "Advisor-facilitated structuring",
    detail: "Deal terms, milestones, and execution checkpoints.",
  },
];

const standards = [
  "Active deal card required to access execution workflows.",
  "Weekly updates on milestones and blockers.",
  "Written consent before any deal is recorded.",
];

const portalActions = [
  "Download due diligence package",
  "Book deal structuring session",
  "Review execution protocol",
];

export default function StageFourPage() {
  const { role } = useAuth();
  const handleGate = (route: string) => {
    console.log("stage-4-gate", route);
  };

  const handlePortal = (action: string) => {
    console.log("stage-4-portal", action);
  };

  return (
    <div className="pb-[96px]">
      <section className="relative gn-hero overflow-hidden px-[10%] py-32">
        <div className="relative z-10 mx-auto w-full max-w-[1200px]">
          <span className="gn-badge">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Stage 04 - Guide
          </span>
          <div className="mt-6 font-display text-[clamp(48px,7vw,110px)] font-black uppercase leading-[0.92]">
            <div className="text-[var(--color-text-primary)]">
              This is where
            </div>
            <div className="text-[var(--color-accent)]">deals close</div>
          </div>
          <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-[var(--color-text-secondary)]">
            Execution is gated. Only active, advisor-approved deals progress
            into Stage 4 workflows.
          </p>
          {role && ["advisor", "staff", "admin"].includes(role) && (
            <div className="mt-8">
              <Link href="/advisor/manual-match" className="gn-btn-secondary">
                Advisor tools
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-[5%] py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">What you unlock</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {unlocks.map((item) => (
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

      <section className="bg-[var(--color-bg-surface)] px-[5%] py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Execution standards</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8">
            <ul className="space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              {standards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-[5%] py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Gate check</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="gn-card">
              <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                Active deal in motion
              </h3>
              <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                Proceed to execution workflows and advisor sessions.
              </p>
              <button
                className="mt-6 gn-btn-secondary"
                type="button"
                onClick={() => handleGate("active")}
              >
                Enter execution
              </button>
            </div>
            <div className="gn-card">
              <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                No active deal
              </h3>
              <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                Return to Stage 3 to request new matches.
              </p>
              <button
                className="mt-6 gn-btn-secondary"
                type="button"
                onClick={() => handleGate("return")}
              >
                Back to Stage 3
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-[5%] py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Gated portal</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {portalActions.map((item) => (
              <div key={item} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item}
                </h3>
                <button
                  className="mt-6 gn-btn-secondary"
                  type="button"
                  onClick={() => handlePortal(item)}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[5%] py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Legal positioning</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-[12px] text-[var(--color-text-secondary)]">
            Founder's Arena does not offer securities, solicit investments,
            or provide financial advice. All investment decisions and
            transactions are initiated and executed solely by participating
            members. The platform provides structured facilitation,
            infrastructure, and verified introductions only. Participation does
            not guarantee capital allocation, partnership formation, or
            transaction completion.
          </div>
        </div>
      </section>
    </div>
  );
}
