"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers";
import { getHomePathForRole } from "@/lib/auth/access";

type InviteInfo = {
  id: string;
  uid_type: string;
  uid_value: string;
  status: string;
  expires_at: string;
  project: { id: string; name: string; stage: string | null } | null;
  inviter: { full_name: string | null; business_name: string | null } | null;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { user, signedIn, isInvitedAccount, signInWithPassword, completeInviteClaim, signOut, role } =
    useAuth();

  // Sign out any currently logged-in user when arriving with an invite token,
  // so the invitee can set up their own account without interference.
  useEffect(() => {
    if (token && signedIn) signOut();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Invite info from token ────────────────────────────────────────────────────
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteLoadError, setInviteLoadError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/cofounders/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setInviteInfo(data.invite ?? null);
        if (!data.invite) setInviteLoadError(data.error ?? "Invalid invite link.");
        setInviteLoading(false);
      })
      .catch(() => { setInviteLoadError("Failed to load invite details."); setInviteLoading(false); });
  }, [token]);

  // ── Shared form state ─────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
    pdpaConsent: false,
    ndaLight: false,
    nonCircumvention: false,
  });

  // Pre-fill name from Supabase user metadata (magic-link path)
  useEffect(() => {
    if (!signedIn) return;
    const metadataName = user?.user_metadata?.full_name;
    if (typeof metadataName === "string" && metadataName.trim()) {
      setFormData((prev) => prev.fullName.trim() ? prev : { ...prev, fullName: metadataName.trim() });
    }
  }, [signedIn, user?.user_metadata?.full_name]);

  const canSubmitSetup = useMemo(
    () =>
      !!formData.fullName.trim() &&
      formData.password.length >= 8 &&
      formData.password === formData.confirmPassword &&
      formData.pdpaConsent &&
      formData.ndaLight &&
      formData.nonCircumvention,
    [formData],
  );

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // ── Toggle for existing-account sign-in path ──────────────────────────────────
  const [showSignIn, setShowSignIn] = useState(false);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // ── Path A: unauthenticated + token → claim via API then sign in ──────────────
  // Used when the user arrives from the copied invite link (no Supabase OTP hash).
  const handleSetupAndClaim = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!token) return;
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/cofounders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: formData.fullName.trim(), password: formData.password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data?.error ?? "Failed to set up account."); setSubmitting(false); return; }

    // Sign in with the newly set password
    const { error: signInError } = await signInWithPassword(data.email, formData.password);
    if (signInError) { setError(signInError); setSubmitting(false); return; }

    setAccepted(true);
    setTimeout(() => router.push("/projects"), 2000);
  };

  // ── Path B: signed in via Supabase magic link (isInvitedAccount) + token ──────
  const handleClaimAndAccept = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!signedIn) { setError("Please sign in first."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");

    const { error: claimError } = await completeInviteClaim({
      name: formData.fullName.trim(),
      password: formData.password,
    });
    if (claimError) { setError(claimError); setSubmitting(false); return; }

    if (token) {
      await fetch("/api/cofounders/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    }

    setAccepted(true);
    setTimeout(() => router.push("/projects"), 2000);
  };

  // ── Path C: legacy admin-provisioned account (no token) ──────────────────────
  const handleAdminClaim = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!signedIn || !isInvitedAccount) { setError("No pending invite to claim."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");
    const { error: claimError } = await completeInviteClaim({
      name: formData.fullName.trim(),
      password: formData.password,
    });
    setSubmitting(false);
    if (claimError) { setError(claimError); return; }
    router.push(getHomePathForRole(role));
  };

  // ── Path D: existing active member with token → one-click accept ──────────────
  const handleAccept = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/cofounders/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data?.error ?? "Failed to accept invite."); return; }
    setAccepted(true);
    setTimeout(() => router.push("/projects"), 2000);
  };

  // ── Sign in (for existing users who aren't signed in yet) ────────────────────
  const handleSignIn = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const email = authData.email.trim().toLowerCase();
    if (!email || !authData.password) { setError("Enter your email and password."); return; }
    setAuthSubmitting(true);
    setError("");
    const { error: signInError } = await signInWithPassword(email, authData.password);
    setAuthSubmitting(false);
    if (signInError) setError(signInError);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const inviterLabel = inviteInfo?.inviter?.full_name || inviteInfo?.inviter?.business_name || "A founder";
  const projectLabel = inviteInfo?.project?.name;
  const isExpired = inviteInfo ? new Date(inviteInfo.expires_at) < new Date() : false;

  function SetupForm({ onSubmit }: { onSubmit: (e: { preventDefault(): void }) => void }) {
    return (
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="full-name" className="block text-sm font-600 text-(--color-ink)">Full name</label>
          <input
            id="full-name"
            value={formData.fullName}
            onChange={(e) => { setError(""); setFormData((p) => ({ ...p, fullName: e.target.value })); }}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) px-4 py-3"
            placeholder="Your full name"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="new-password" className="block text-sm font-600 text-(--color-ink)">Password</label>
            <input
              id="new-password"
              type="password"
              value={formData.password}
              onChange={(e) => { setError(""); setFormData((p) => ({ ...p, password: e.target.value })); }}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) px-4 py-3"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-600 text-(--color-ink)">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => { setError(""); setFormData((p) => ({ ...p, confirmPassword: e.target.value })); }}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) px-4 py-3"
              placeholder="Repeat password"
            />
          </div>
        </div>
        <div className="space-y-2 rounded-lg bg-(--color-surface-soft) p-4 text-sm text-(--color-body)">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={formData.pdpaConsent}
              onChange={(e) => setFormData((p) => ({ ...p, pdpaConsent: e.target.checked }))} className="mt-1" />
            <span>I consent to PDPA-PH data handling terms.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={formData.ndaLight}
              onChange={(e) => setFormData((p) => ({ ...p, ndaLight: e.target.checked }))} className="mt-1" />
            <span>I accept the NDA-light agreement.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={formData.nonCircumvention}
              onChange={(e) => setFormData((p) => ({ ...p, nonCircumvention: e.target.checked }))} className="mt-1" />
            <span>I accept the non-circumvention agreement.</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={!canSubmitSetup || submitting}
          className="w-full rounded-lg bg-(--color-primary) py-3 font-600 text-white disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account & accept invitation"}
        </button>
      </form>
    );
  }

  // ── Early returns ─────────────────────────────────────────────────────────────
  if (inviteLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading invite…</p>
      </div>
    );
  }

  if (token && inviteLoadError) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
        <div className="mx-auto max-w-[600px] rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-8 text-center">
          <h1 className="text-2xl font-700 text-(--color-ink)">Invalid invite link</h1>
          <p className="mt-2 text-sm text-(--color-body)">{inviteLoadError}</p>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
        <div className="mx-auto max-w-[600px] rounded-lg border border-(--color-hairline) bg-(--color-canvas) p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-700 text-(--color-ink)">Account created — welcome to FOUNDERS ARENA</h1>
          <p className="mt-2 text-sm text-(--color-body)">
            {projectLabel
              ? `You've been added to ${projectLabel}. Complete your profile to get the most out of the platform.`
              : "Your invitation has been accepted. Complete your profile to get the most out of the platform."}
          </p>
          <p className="mt-3 text-xs text-(--color-muted)">Redirecting you now…</p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-(--color-canvas) px-[5%] py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">

        {/* ── Left: account creation form ── */}
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-8">
          <p className="text-xs font-600 uppercase tracking-[0.14em] text-(--color-muted)">
            Platform Invitation — FOUNDERS ARENA
          </p>
          <h1 className="mt-3 text-3xl font-700 text-(--color-ink)">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-(--color-body)">
            You&apos;ve been invited to join FOUNDERS ARENA. Set up your account below to accept.
          </p>
          {user?.email && (
            <p className="mt-1 text-sm text-(--color-muted)">Signed in as {user.email}</p>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* ── Not signed in + token: show setup form (primary path for new users) ── */}
          {!signedIn && token && !showSignIn && (
            <>
              {SetupForm({ onSubmit: handleSetupAndClaim })}
              <p className="mt-4 text-center text-xs text-(--color-muted)">
                Already have a FOUNDERS ARENA account?{" "}
                <button type="button" onClick={() => setShowSignIn(true)} className="text-(--color-primary) hover:underline">
                  Sign in to accept
                </button>
              </p>
            </>
          )}

          {/* ── Not signed in + token + showSignIn: sign-in form ── */}
          {!signedIn && token && showSignIn && (
            <>
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="gn-input"
                    type="email"
                    value={authData.email}
                    onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, email: e.target.value })); }}
                    placeholder="Email address"
                    required
                  />
                  <input
                    className="gn-input"
                    type="password"
                    value={authData.password}
                    onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, password: e.target.value })); }}
                    placeholder="Password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full rounded-lg bg-(--color-primary) py-3 font-600 text-white disabled:opacity-50"
                >
                  {authSubmitting ? "Signing in…" : "Sign in to continue"}
                </button>
              </form>
              <p className="mt-4 text-center text-xs text-(--color-muted)">
                New to FOUNDERS ARENA?{" "}
                <button type="button" onClick={() => setShowSignIn(false)} className="text-(--color-primary) hover:underline">
                  Set up your account
                </button>
              </p>
            </>
          )}

          {/* ── Not signed in, no token: old admin-provisioned sign-in flow ── */}
          {!signedIn && !token && (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="gn-input"
                  type="email"
                  value={authData.email}
                  onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, email: e.target.value })); }}
                  placeholder="Your email address"
                  required
                />
                <input
                  className="gn-input"
                  type="password"
                  value={authData.password}
                  onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, password: e.target.value })); }}
                  placeholder="Password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-lg bg-(--color-primary) py-3 font-600 text-white disabled:opacity-50"
              >
                {authSubmitting ? "Signing in…" : "Sign in to continue"}
              </button>
            </form>
          )}

          {/* ── Signed in via magic link (isInvitedAccount) ── */}
          {signedIn && isInvitedAccount && (
            SetupForm({ onSubmit: token ? handleClaimAndAccept : handleAdminClaim })
          )}

          {/* ── Signed in, existing active member ── */}
          {signedIn && !isInvitedAccount && token && (
            <button
              type="button"
              onClick={handleAccept}
              disabled={submitting || !inviteInfo || inviteInfo.status !== "pending" || isExpired}
              className="mt-6 w-full rounded-lg bg-(--color-primary) py-3 font-600 text-white disabled:opacity-50"
            >
              {submitting ? "Accepting…" : projectLabel ? `Accept invitation & join ${projectLabel}` : "Accept invitation"}
            </button>
          )}
        </div>

        {/* ── Right: context side card ── */}
        <div className="space-y-4">
          {/* Invite details */}
          <div className="rounded-2xl border border-(--color-primary)/20 bg-(--color-primary)/5 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-primary)">
              Your invitation
            </p>
            {inviteInfo ? (
              <>
                <p className="mt-3 text-sm font-semibold text-(--color-ink)">{inviterLabel}</p>
                <p className="text-xs text-(--color-muted)">invited you to FOUNDERS ARENA</p>
                {projectLabel && (
                  <div className="mt-3 rounded-lg border border-(--color-primary)/20 bg-[#1A1A26] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Project</p>
                    <p className="mt-0.5 text-sm font-semibold text-(--color-ink)">{projectLabel}</p>
                  </div>
                )}
                {isExpired && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    This invite has expired. Ask {inviterLabel} to resend.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-(--color-body)">
                You&apos;ve been granted access to FOUNDERS ARENA by an advisor.
              </p>
            )}
          </div>

          {/* Why you were invited */}
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
              Why am I receiving this?
            </p>
            <p className="mt-3 text-sm text-(--color-body)">
              You&apos;ve been invited to join <span className="font-semibold text-(--color-ink)">FOUNDERS ARENA</span> — an advisor-gated platform connecting verified Philippine startups, investors, and ecosystem partners.
            </p>
            <p className="mt-3 text-sm text-(--color-body)">
              You may have been added as a:
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                { role: "Co-founder", desc: "joining a startup team on the platform" },
                { role: "Investor", desc: "being onboarded by a FOUNDERS ARENA advisor" },
                { role: "Ecosystem Partner", desc: "supporting startups as a mentor, advisor, or partner" },
              ].map(({ role, desc }) => (
                <li key={role} className="flex items-start gap-2 text-xs text-(--color-body)">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-primary)" />
                  <span><span className="font-semibold text-(--color-ink)">{role}</span> — {desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-(--color-muted)">
              Either way, your account setup is the same. You&apos;ll complete your full profile after signing in.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
