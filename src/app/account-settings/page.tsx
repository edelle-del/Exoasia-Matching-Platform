"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

export default function AccountSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  const [phone, setPhone] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [showBugModal, setShowBugModal] = useState(false);
  const [bugSubject, setBugSubject] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [bugLoading, setBugLoading] = useState(false);
  const [bugError, setBugError] = useState("");
  const [bugSuccess, setBugSuccess] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("phone_whatsapp")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.phone_whatsapp) setPhone(data.phone_whatsapp);
      });
  }, [supabase, user?.id, user?.email]);

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    setPhoneSuccess("");
    if (!phoneEdit.trim()) {
      setPhoneError("Please enter a phone number.");
      return;
    }
    setPhoneLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone_whatsapp: phoneEdit.trim() })
      .eq("id", user!.id);
    setPhoneLoading(false);
    if (error) {
      setPhoneError(error.message);
      return;
    }
    setPhone(phoneEdit.trim());
    setPhoneEdit("");
    setPhoneSuccess("Phone number updated.");
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess("Password reset email sent. Please check your inbox.");
    }
  };

  const handleBugReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBugError("");
    if (!bugSubject.trim()) { setBugError("Subject is required."); return; }
    if (!bugDescription.trim()) { setBugError("Description is required."); return; }
    setBugLoading(true);
    const res = await fetch("/api/bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: bugSubject, description: bugDescription, steps: bugSteps }),
    });
    setBugLoading(false);
    const data = await res.json();
    if (!res.ok) { setBugError(data?.error ?? "Failed to submit report."); return; }
    setBugSuccess(true);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError("");
    const res = await fetch("/api/account/delete", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setDeleteLoading(false);
      setDeleteError(data?.error ?? "Failed to delete account.");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/sign-in";
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/profile" className="text-sm text-(--color-primary) hover:underline">
            ← Back to profile
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">Account Settings</h1>
          <p className="mt-2 text-sm text-(--color-body)">Manage your login credentials and contact details.</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 py-10">

        {/* Email */}
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-(--color-ink)">Email address</h2>
          <p className="mt-3 text-sm font-medium text-(--color-ink)">{user?.email ?? "—"}</p>
          <p className="mt-1 text-xs text-(--color-muted)">To change your email address, contact support.</p>
        </section>

        {/* Phone */}
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-(--color-ink)">Phone / WhatsApp</h2>
          <p className="mt-1 text-sm text-(--color-body)">
            Current: <span className="font-medium text-(--color-ink)">{phone || "Not set"}</span>
          </p>
          <form onSubmit={handleUpdatePhone} className="mt-4 flex gap-2">
            <input
              type="tel"
              className="gn-input flex-1"
              placeholder="+63 912 345 6789"
              value={phoneEdit}
              onChange={(e) => { setPhoneEdit(e.target.value); setPhoneError(""); setPhoneSuccess(""); }}
            />
            <button
              type="submit"
              disabled={phoneLoading}
              className="gn-btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {phoneLoading ? "Saving..." : "Update"}
            </button>
          </form>
          {phoneError && <p className="mt-2 text-xs text-red-600">{phoneError}</p>}
          {phoneSuccess && <p className="mt-2 text-xs text-green-600">{phoneSuccess}</p>}
        </section>

        {/* Password */}
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-(--color-ink)">Reset password</h2>
          <p className="mt-1 text-sm text-(--color-body)">
            We will send a password reset link to your registered email address.
          </p>
          <button
            type="button"
            onClick={() => void handleSendResetEmail()}
            disabled={passwordLoading}
            className="gn-btn-primary mt-4 whitespace-nowrap disabled:opacity-50"
          >
            {passwordLoading ? "Sending..." : "Send reset email"}
          </button>
          {passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="mt-2 text-xs text-green-600">{passwordSuccess}</p>}
        </section>

        {/* Report a Bug */}
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-(--color-ink)">Report a bug</h2>
          <p className="mt-1 text-sm text-(--color-body)">
            Found something broken? Let us know and we&apos;ll look into it.
          </p>
          <button
            type="button"
            onClick={() => window.open("https://link.gamechangerfunnel.com/widget/form/cYXxZnz3Sa5PVOodN2yl", "_blank", "noopener,noreferrer")}
            className="mt-4 flex items-center gap-2 rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Report a bug
          </button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-[16px] border border-red-200 bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
          <p className="mt-1 text-sm text-(--color-body)">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(""); setDeleteError(""); }}
            className="mt-4 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete my account
          </button>
        </section>
      </div>

      {/* Bug report modal */}
      {showBugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-8 shadow-xl">
            {bugSuccess ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-(--color-ink)">Report received</h2>
                <p className="mt-2 text-sm text-(--color-body)">
                  Thanks for letting us know. We&apos;ll investigate and follow up if needed.
                </p>
                <button
                  type="button"
                  onClick={() => setShowBugModal(false)}
                  className="mt-6 w-full rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Help us improve</p>
                <h2 className="mt-3 text-xl font-semibold text-(--color-ink)">Report a bug</h2>
                <p className="mt-1 text-sm text-(--color-body)">
                  Describe what went wrong and we&apos;ll look into it.
                </p>
                <form onSubmit={handleBugReport} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="bug-subject" className="mb-1.5 block text-sm font-semibold text-(--color-ink)">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="bug-subject"
                      type="text"
                      className="gn-input"
                      placeholder="e.g. Profile page crashes on save"
                      value={bugSubject}
                      onChange={(e) => { setBugSubject(e.target.value); setBugError(""); }}
                    />
                  </div>
                  <div>
                    <label htmlFor="bug-description" className="mb-1.5 block text-sm font-semibold text-(--color-ink)">
                      What happened? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="bug-description"
                      className="gn-input h-24"
                      placeholder="Describe the issue clearly — what you saw, what you expected."
                      value={bugDescription}
                      onChange={(e) => { setBugDescription(e.target.value); setBugError(""); }}
                    />
                  </div>
                  <div>
                    <label htmlFor="bug-steps" className="mb-1.5 block text-sm font-semibold text-(--color-ink)">
                      Steps to reproduce{" "}
                      <span className="font-normal text-(--color-muted)">(optional)</span>
                    </label>
                    <textarea
                      id="bug-steps"
                      className="gn-input h-20"
                      placeholder="1. Go to…&#10;2. Click…&#10;3. See error"
                      value={bugSteps}
                      onChange={(e) => setBugSteps(e.target.value)}
                    />
                  </div>
                  {bugError && <p className="text-xs text-red-600">{bugError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBugModal(false)}
                      className="flex-1 rounded-xl border border-(--color-hairline) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bugLoading}
                      className="flex-1 rounded-xl bg-(--color-primary) py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {bugLoading ? "Sending…" : "Send report"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-8 shadow-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">Permanent action</p>
            <h2 className="mt-3 text-xl font-semibold text-(--color-ink)">Delete your account</h2>
            <p className="mt-2 text-sm text-(--color-body)">
              This will permanently delete your account, profile, projects, and all data. You cannot undo this.
            </p>
            <p className="mt-4 text-sm font-medium text-(--color-ink)">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              className="gn-input mt-2"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(""); }}
            />
            {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-(--color-hairline) py-2.5 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deleteLoading ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
