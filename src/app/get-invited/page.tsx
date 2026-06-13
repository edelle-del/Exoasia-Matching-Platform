import Link from "next/link";
const inviteSteps = [
  {
    title: "Create your account",
    detail:
      "Sign up directly on the platform with your email address or Google account.",
  },
  {
    title: "Complete Onboarding",
    detail:
      "Fill in your profile details depending on your role (Startup, Investor, or Ecosystem Partner).",
  },
  {
    title: "Accept agreements and consents",
    detail:
      "Review and accept PDPA-PH data privacy consent, NDA-light, and non-circumvention agreements.",
  },
  {
    title: "Explore the platform",
    detail:
      "Access matches, project deal flow, data rooms, and start connecting with matching partners.",
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
            Get Started on Founders Arena
          </h1>
          <p className="mt-2 text-[var(--color-body)]">
            Registration is open to everyone. Sign up now to create your account.
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

          <div className="rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6 text-center">
            <p className="text-sm text-[var(--color-body)]">
              Ready to join Founders Arena? Anyone can sign up directly.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/sign-in" className="gn-btn-secondary">
                Sign In
              </Link>
              <Link href="/sign-up" className="gn-btn-primary">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
