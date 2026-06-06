"use client";

import { useAuth } from "../providers";
import Link from "next/link";

const howItWorks = [
  {
    title: "Exoasia Intelligence scoring",
    detail: "Compatibility scoring across sector, ASK and OFFER, and timing.",
  },
  {
    title: "Advisor review",
    detail: "Human validation before any introduction is released.",
  },
];

const pathways = [
  {
    title: "Speed to Seed Cohort",
    detail: "Structured capital pathway with milestone cadence.",
  },
  {
    title: "Advisor-Led Preparation",
    detail: "Custom guidance before entering matching cycles.",
  },
];

const actions = [
  "Review top 5 strategic matches.",
  "Request or decline introductions.",
  "Track deal board progress in real time.",
];

const standards = [
  "Keep ASK and OFFER updated every cycle.",
  "Respond to advisor outreach within 72 hours.",
  "Respect confidentiality and consent protocols.",
];

const faq = [
  {
    q: "How are matches scored?",
    a: "Scores reflect structural alignment, not category overlap.",
  },
  {
    q: "Can I request new matches?",
    a: "Yes, through the advisor review queue.",
  },
  {
    q: "What if I decline a match?",
    a: "Declined matches do not persist in future cycles.",
  },
  {
    q: "Do advisors see my full profile?",
    a: "Only authorized advisors can access verification data.",
  },
  {
    q: "How often are cycles run?",
    a: "Every 2 to 4 weeks depending on member volume.",
  },
  {
    q: "Is matching guaranteed?",
    a: "No. The platform facilitates alignment, not outcomes.",
  },
];

export default function StageThreePage() {
  const { role } = useAuth();
  const handlePathway = (name: string) => {
    console.log("stage-3-pathway", name);
  };

  const handleApplication = () => {
    console.log("stage-3-apply");
  };

  return (
    <div className="pb-[96px]">
      <section className="relative gn-hero overflow-hidden px-[10%] py-32">
        <div className="relative z-10 mx-auto w-full max-w-[1200px]">
          <span className="gn-badge">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Stage 03 - Commit
          </span>
          <div className="mt-6 font-display text-[clamp(48px,7vw,110px)] font-black uppercase leading-[0.92]">
            <div className="text-[var(--color-text-primary)]">
              Stage 3 activates
            </div>
            <div className="text-[var(--color-accent)]">
              structured alignment
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-[var(--color-text-secondary)]">
            Matching is now live. Exoasia Intelligence signals surface candidates, advisors
            decide, and consent controls every introduction.
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

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">How it works</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {howItWorks.map((item) => (
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

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Activation pathways</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {pathways.map((item) => (
              <div key={item.title} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
                <button
                  className="mt-6 gn-btn-secondary"
                  type="button"
                  onClick={() => handlePathway(item.title)}
                >
                  Select pathway
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Member dashboard actions</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8">
            <ul className="space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              {actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Operating standards</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8">
            <ul className="space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              {standards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Legal positioning</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-[12px] text-[var(--color-text-secondary)]">
            FOUNDERS ARENA does not offer securities, solicit investments,
            or provide financial advice. All investment decisions and
            transactions are initiated and executed solely by participating
            members. The platform provides structured facilitation,
            infrastructure, and verified introductions only. Participation does
            not guarantee capital allocation, partnership formation, or
            transaction completion.
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">FAQ</p>
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <div
                key={item.q}
                className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
              >
                <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {item.q}
                </p>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[600px]">
          <p className="gn-overline">Speed to Seed application</p>
          <form
            className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-8"
            onSubmit={(event) => {
              event.preventDefault();
              handleApplication();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="gn-input"
                aria-label="First name"
                placeholder="First name"
              />
              <input
                className="gn-input"
                aria-label="Last name"
                placeholder="Last name"
              />
            </div>
            <div className="mt-4 space-y-4">
              <input
                className="gn-input"
                aria-label="Company"
                placeholder="Company"
              />
              <input
                className="gn-input"
                aria-label="Capital need"
                placeholder="Capital need"
              />
              <input
                className="gn-input"
                aria-label="Use of funds"
                placeholder="Use of funds"
              />
            </div>
            <button className="mt-6 w-full gn-btn-primary" type="submit">
              Submit application -&gt;
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
