"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers";
import { getHomePathForRole } from "@/lib/auth/access";

import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type InviteInfo = {
  id: string;
  uid_type: string;
  uid_value: string;
  status: string;
  expires_at: string;
  inviter: { full_name: string | null; business_name: string | null } | null;
  project: { id: string; name: string; stage: string | null } | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signedIn, isInvitedAccount, signInWithPassword, completeInviteClaim, role } =
    useAuth();

  const token = searchParams.get("token") ?? "";
  const code = searchParams.get("code");

  // Invite context loaded from token
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!token);
  const [inviteError, setInviteError] = useState("");

  // Email derived from invite (or signed-in user)
  const [email, setEmail] = useState(user?.email ?? "");

  // Account setup form
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name ?? "",
    password: "",
    confirmPassword: "",
    pdpaConsent: false,
    ndaLight: false,
    nonCircumvention: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Existing-account sign-in toggle
  const [showSignIn, setShowSignIn] = useState(false);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Auto-load invite by token on mount
  useEffect(() => {
    // If we have an access token in the hash (Supabase auth link), force apply it 
    // This fixes the issue where clicking an invite link while logged in as an admin 
    // ignores the new invite token.
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      
      if (accessToken && refreshToken) {
        const supabase = createClient();
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ data }) => {
          window.location.hash = "";
          window.location.reload();
        });
        return;
      }
    }

    if (code) {
      const supabase = createClient();
      // Exchange code for session directly.
      supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("code");
        window.history.replaceState({}, document.title, newUrl.toString());
        window.location.reload();
      });
      return;
    }

    if (!token) {
      setInviteLoading(false);
      return;
    }
    setInviteLoading(true);
    fetch(`/api/cofounders/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.invite) {
          setInviteInfo(data.invite);
          if (data.invite.uid_value) setEmail(data.invite.uid_value);
        } else {
          setInviteError(data?.error ?? "Invalid or expired invite link.");
        }
      })
      .catch(() => setInviteError("Failed to load invite. Please try again."))
      .finally(() => setInviteLoading(false));
  }, [token, code]);

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

  // Claim account via invite link token (new user)
  const handleSetupAndClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/cofounders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name: formData.fullName.trim(),
        password: formData.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data?.error ?? "Failed to set up account."); setSubmitting(false); return; }

    const { error: signInError } = await signInWithPassword(data.email, formData.password);
    if (signInError) { setError(signInError); setSubmitting(false); return; }

    setAccepted(true);
    setTimeout(() => {
      const projectId = inviteInfo?.project?.id ? `&project=${inviteInfo.project.id}` : "";
      router.push(`/onboarding?invited=true${projectId}`);
    }, 2000);
  };

  // Legacy path: admin-provisioned invited account
  const handleAdminClaim = async (e: React.FormEvent) => {
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

  // Sign in (existing member accepting via sign-in)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = authData.email.trim().toLowerCase();
    if (!emailVal || !authData.password) { setError("Enter your email and password."); return; }
    setAuthSubmitting(true);
    setError("");
    const { error: signInError } = await signInWithPassword(emailVal, authData.password);
    if (signInError) {
      setError(signInError);
      setAuthSubmitting(false);
      return;
    }

    // Accept invite
    const res = await fetch("/api/cofounders/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error ?? "Failed to accept invite.");
      setAuthSubmitting(false);
      return;
    }

    setAccepted(true);
    setAuthSubmitting(false);
    setTimeout(() => {
      const projectId = inviteInfo?.project?.id ? `&project=${inviteInfo.project.id}` : "";
      router.push(`/onboarding?invited=true${projectId}`);
    }, 2000);
  };

  const inviterLabel = inviteInfo?.inviter?.full_name || inviteInfo?.inviter?.business_name || "A founder";
  const projectLabel = inviteInfo?.project?.name;

  function SetupForm({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
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

  // ── Success screen ────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-12">
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

  // ── Legacy: admin-provisioned signed-in invited account (no token) ─────────
  if (signedIn && isInvitedAccount && !inviteInfo) {
    return (
      <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[600px] rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-8 shadow-sm">
          <p className="text-xs font-600 uppercase tracking-[0.14em] text-(--color-muted)">
            {role === "admin" ? "Admin Invitation" : "Platform Invitation"}
          </p>
          <h1 className="mt-3 text-2xl font-700 text-(--color-ink)">Set up your account</h1>
          {role === "admin" && (
            <p className="mt-2 text-sm text-(--color-body)">
              You have been invited to join Exoasia as a <span className="font-semibold text-(--color-ink)">Platform Administrator</span>. Please set your password to activate your access.
            </p>
          )}
          {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {SetupForm({ onSubmit: handleAdminClaim })}
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">

        {/* ── Left panel ── */}
        <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-8">
          <p className="text-xs font-600 uppercase tracking-[0.14em] text-(--color-muted)">
            Platform Invitation — FOUNDERS ARENA
          </p>

          {/* Loading */}
          {inviteLoading && (
            <div className="mt-8 flex items-center gap-3 text-(--color-muted)">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading your invitation…</span>
            </div>
          )}

          {/* Invalid / missing token */}
          {!inviteLoading && (inviteError || !token) && (
            <>
              <h1 className="mt-3 text-2xl font-700 text-(--color-ink)">
                {inviteError ? "Invite link issue" : "No invite link found"}
              </h1>
              <p className="mt-2 text-sm text-(--color-body)">
                {inviteError || "Please use the invite link from your email."}
              </p>
              <p className="mt-4 text-sm text-(--color-muted)">
                Already have a FOUNDERS ARENA account?{" "}
                <button type="button" onClick={() => setShowSignIn((s) => !s)} className="text-(--color-primary) hover:underline">
                  Sign in instead
                </button>
              </p>
              {showSignIn && (
                <form onSubmit={handleSignIn} className="mt-4 space-y-4 border-t border-(--color-hairline) pt-4">
                  {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="signin-email" className="block text-sm font-600 text-(--color-ink)">Email</label>
                      <input
                        id="signin-email"
                        className="gn-input mt-1"
                        type="email"
                        value={authData.email}
                        onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, email: e.target.value })); }}
                        placeholder="Email address"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="signin-password" className="block text-sm font-600 text-(--color-ink)">Password</label>
                      <input
                        id="signin-password"
                        className="gn-input mt-1"
                        type="password"
                        value={authData.password}
                        onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, password: e.target.value })); }}
                        placeholder="Password"
                        required
                      />
                    </div>
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
            </>
          )}

          {/* Invite loaded — show setup form */}
          {!inviteLoading && !inviteError && inviteInfo && (
            <>
              <h1 className="mt-3 text-3xl font-700 text-(--color-ink)">Create your account</h1>
              <p className="mt-1 text-sm text-(--color-body)">
                {inviterLabel} invited you to FOUNDERS ARENA. Set up your account below.
              </p>
              {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              {SetupForm({ onSubmit: handleSetupAndClaim })}

              <p className="mt-4 text-center text-xs text-(--color-muted)">
                Already have a FOUNDERS ARENA account?{" "}
                <button type="button" onClick={() => setShowSignIn((s) => !s)} className="text-(--color-primary) hover:underline">
                  Sign in instead
                </button>
              </p>

              {showSignIn && (
                <form onSubmit={handleSignIn} className="mt-4 space-y-4 border-t border-(--color-hairline) pt-4">
                  {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="signin-email" className="block text-sm font-600 text-(--color-ink)">Email</label>
                      <input
                        id="signin-email"
                        className="gn-input mt-1"
                        type="email"
                        value={authData.email}
                        onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, email: e.target.value })); }}
                        placeholder="Email address"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="signin-password" className="block text-sm font-600 text-(--color-ink)">Password</label>
                      <input
                        id="signin-password"
                        className="gn-input mt-1"
                        type="password"
                        value={authData.password}
                        onChange={(e) => { setError(""); setAuthData((p) => ({ ...p, password: e.target.value })); }}
                        placeholder="Password"
                        required
                      />
                    </div>
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
            </>
          )}
        </div>

        {/* ── Right: context card ── */}
        <div className="space-y-4">
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
              </>
            ) : (
              <p className="mt-3 text-sm text-(--color-body)">
                {inviteLoading ? "Loading invitation details…" : "Use your invite link to see your invitation details."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
              Why am I receiving this?
            </p>
            <p className="mt-3 text-sm text-(--color-body)">
              You&apos;ve been invited to join <span className="font-semibold text-(--color-ink)">FOUNDERS ARENA</span> — an advisor-gated platform connecting verified Philippine startups, investors, and ecosystem partners.
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                { role: "Co-founder", desc: "joining a startup team on the platform" },
                { role: "Investor", desc: "being onboarded by a FOUNDERS ARENA advisor" },
                { role: "Ecosystem Partner", desc: "supporting startups as a TBI, accelerator, or angel" },
              ].map(({ role, desc }) => (
                <li key={role} className="flex items-start gap-2 text-xs text-(--color-body)">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-primary)" />
                  <span><span className="font-semibold text-(--color-ink)">{role}</span> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
