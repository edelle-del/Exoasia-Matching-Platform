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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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
  }, [supabase, user?.id]);

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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    const res = await fetch("/api/account/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, password: newPassword }),
    });
    setPasswordLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setPasswordError(data?.error ?? "Failed to update password.");
      return;
    }
    setPasswordSuccess("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/profile" className="text-sm text-(--color-primary) hover:underline">
            ← Back to profile
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">Account Settings</h1>
          <p className="mt-2 text-sm text-(--color-body)">Manage your login credentials and contact details.</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-6 px-[5%] py-10">

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
          <h2 className="text-base font-semibold text-(--color-ink)">Change password</h2>
          <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3">
            <input
              type="password"
              className="gn-input"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
            />
            <input
              type="password"
              className="gn-input"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
            />
            <input
              type="password"
              className="gn-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); setPasswordSuccess(""); }}
            />
            <button
              type="submit"
              disabled={passwordLoading}
              className="gn-btn-primary disabled:opacity-50"
            >
              {passwordLoading ? "Updating..." : "Update password"}
            </button>
          </form>
          {passwordError && <p className="mt-2 text-xs text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="mt-2 text-xs text-green-600">{passwordSuccess}</p>}
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
