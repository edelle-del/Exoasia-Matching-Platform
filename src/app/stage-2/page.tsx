"use client";

const entryRequirements = [
  "Registered business name and entity details",
  "Authorized signatory and UBO disclosure",
  "Proof of address and operating headquarters",
  "PDPA-PH consent and NDA-light",
  "Non-circumvention agreement",
];

const unlocks = [
  "Verified matching engine",
  "Private dinners and pitch nights",
  "Ad Credit allocation",
  "Fireside strategy sessions",
  "Advisor insights and guidance",
  "Deal board visibility",
];

const standards = [
  "Accurate and current profile data.",
  "Timely response to advisor outreach.",
  "Respect for consent-based introductions.",
  "No mass outreach or unsolicited contact.",
];

const leadership = [
  {
    title: "Chapter Lead",
    detail: "Local standards enforcement and member support.",
  },
  {
    title: "Growth Advisor",
    detail: "Match validation and deal progression checkpoints.",
  },
  {
    title: "Verification Officer",
    detail: "KYC review and risk classification.",
  },
  {
    title: "Platform Admin",
    detail: "Access control and governance oversight.",
  },
];

import { useAuth } from "../providers";
import Link from "next/link";

export default function StageTwoPage() {
  const { role } = useAuth();
  const handleSubmitDocs = () => {
    console.log("stage-2-submit-docs");
  };

  return (
    <div className="pb-[96px]">
      <section className="relative gn-hero overflow-hidden px-[10%] py-32">
        <div className="relative z-10 mx-auto w-full max-w-[1200px]">
          <span className="gn-badge">
            <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
            Stage 02 - Match
          </span>
          <div className="mt-6 font-display text-[clamp(48px,7vw,110px)] font-black uppercase leading-[0.92]">
            <div className="text-[var(--color-text-primary)]">
              You have been in
            </div>
            <div className="text-[var(--color-accent)]">the room.</div>
            <div className="text-[var(--color-text-primary)]">
              Now prove you belong.
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-[var(--color-text-secondary)]">
            Stage 2 verifies identity, intent, and readiness. This is the
            gateway to matching cycles.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto grid w-full max-w-[1280px] gap-6 md:grid-cols-2">
          <div className="gn-card">
            <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
              Stage 1
            </h3>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              <li>Community access and sessions.</li>
              <li>Limited introductions.</li>
              <li>Initial ASK and OFFER clarity.</li>
            </ul>
          </div>
          <div className="gn-card">
            <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
              Stage 2
            </h3>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              <li>Verification and KYC completion.</li>
              <li>Full matching engine access.</li>
              <li>Advisor mediated introductions.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Entry requirements</p>
          <div className="mt-8 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8">
            <ul className="space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              {entryRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4">
              <button
                className="gn-btn-primary"
                type="button"
                onClick={handleSubmitDocs}
              >
                Submit documents -&gt;
              </button>
              {role && ["advisor", "staff", "admin"].includes(role) && (
                <Link href="/advisor/manual-match" className="gn-btn-secondary">
                  Advisor tools
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">What Stage 2 unlocks</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {unlocks.map((item) => (
              <div key={item} className="gn-card">
                <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
                  {item}
                </h3>
                <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                  Available after verification approval and advisor review.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto grid w-full max-w-[1280px] gap-6 md:grid-cols-2">
          <div className="gn-card">
            <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
              Stage 2 is for
            </h3>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              <li>Verified businesses with clear ASK and OFFER.</li>
              <li>Operators ready to engage in matching cycles.</li>
              <li>Capital providers with defined mandates.</li>
            </ul>
          </div>
          <div className="gn-card">
            <h3 className="text-[16px] font-semibold uppercase tracking-[0.05em]">
              Not for
            </h3>
            <ul className="mt-4 space-y-3 text-[15px] text-[var(--color-text-secondary)]">
              <li>Unverified entities or unclear ownership.</li>
              <li>Mass outreach or passive networking.</li>
              <li>Unstructured capital solicitation.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Stage 2 cadence</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-label)]">
                Weekly
              </p>
              <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                Match review updates and advisor check-ins.
              </p>
            </div>
            <div className="rounded-[4px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-label)]">
                Monthly
              </p>
              <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">
                Private dinner attendance and pitch alignment.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-surface)] px-4 sm:px-6 py-32">
        <div className="mx-auto w-full max-w-[900px]">
          <p className="gn-overline">Standards</p>
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
        <div className="mx-auto w-full max-w-[1280px]">
          <p className="gn-overline">Leadership structure</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {leadership.map((item) => (
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
    </div>
  );
}
