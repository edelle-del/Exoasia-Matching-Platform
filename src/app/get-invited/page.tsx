import Link from "next/link";
const inviteSteps = [
  {
    title: "Receive invite",
    detail:
      "A Growth Advisor pre-defines your account and sends an invite link.",
  },
  {
    title: "Sign in with invited email",
    detail:
      "Use the invited email from your advisor. Non-invited emails cannot self-register.",
  },
  {
    title: "Accept invite and consents",
    detail:
      "Complete the claim flow with PDPA-PH, NDA-light, and non-circumvention acceptance.",
  },
  {
    title: "Activate access",
    detail:
      "After claim, your account becomes active and you can access the member portal.",
  },
];

export default function GetInvitedPage() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <section className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href="/"
            className="text-sm font-500 text-[var(--color-primary)] hover:underline"
          >
            ← Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-700 text-[var(--color-ink)]">
            Invite-only access
          </h1>
          <p className="mt-2 text-[var(--color-body)]">
            Accounts are pre-provisioned by Growth Advisors. Self-signup is
            disabled.
          </p>
        </div>
      </section>

      <div className="px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[900px] space-y-6">
          {inviteSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6"
            >
              <p className="text-xs font-600 uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Step {index + 1}
              </p>
              <h2 className="mt-2 text-xl font-600 text-[var(--color-ink)]">
                {step.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-body)]">
                {step.detail}
              </p>
            </div>
          ))}

          <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6">
            <p className="text-sm text-[var(--color-body)]">
              If you already have an invited email, go to the home page and sign
              in to continue to invite claim.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/" className="gn-btn-secondary">
                Go to Sign in
              </Link>
              <Link href="/accept-invite" className="gn-btn-primary">
                Open Invite Claim
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
