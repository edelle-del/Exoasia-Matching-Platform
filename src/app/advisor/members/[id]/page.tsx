"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../../providers";
import {
  fetchAdvisorMemberDetail,
  type AdvisorMemberDetailRecord,
} from "@/lib/app-data";
import { STAGE_CONFIG, DOCUMENT_TYPES } from "@/types/constants";

const STAGE_COLORS: Record<string, string> = {
  "0": "bg-slate-100 text-slate-600",
  "1": "bg-blue-100 text-blue-700",
  "2": "bg-amber-100 text-amber-700",
  "3": "bg-purple-100 text-purple-700",
  "4": "bg-green-100 text-green-700",
};

const VERIFICATION_COLORS: Record<string, string> = {
  unverified: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-red-100 text-red-700",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-slate-100 text-slate-600",
  introduced: "bg-blue-100 text-blue-700",
};

const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700",
  "under-review": "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined | boolean;
}) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : String(value);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
        {label}
      </p>
      <p className="mt-1 text-sm text-(--color-ink)">{display}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-(--color-hairline) bg-(--color-canvas) p-6">
      <h2 className="text-base font-semibold text-(--color-ink)">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function AdvisorMemberDetailPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const params = useParams();
  const memberId = params.id as string;

  const [data, setData] = useState<{
    profile: AdvisorMemberDetailRecord | null;
    asks: Array<{ id: string; title: string; description: string; status: string }>;
    offers: Array<{ id: string; title: string; description: string; status: string }>;
    matches: Array<{
      id: string;
      fit_score: number | null;
      summary: string | null;
      status: string;
      created_at: string;
      counterpart_name: string;
    }>;
    documents: Array<{
      id: string;
      document_type: string;
      status: string;
      file_path: string;
      uploaded_at: string;
      reject_reason: string | null;
    }>;
    creditBalance: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Edit state
  const [editStage, setEditStage] = useState("");
  const [editVerification, setEditVerification] = useState("");
  const [editAccountStatus, setEditAccountStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  useEffect(() => {
    if (!memberId) return;
    const load = async () => {
      setIsLoading(true);
      const result = await fetchAdvisorMemberDetail(supabase, memberId);
      setData(result);
      if (result.profile) {
        setEditStage(result.profile.stage);
        setEditVerification(result.profile.verification_status);
        setEditAccountStatus(result.profile.account_status);
      }
      setIsLoading(false);
    };
    void load();
  }, [supabase, memberId]);

  if (role !== "advisor" && role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <p className="text-sm text-(--color-body)">Not authorized.</p>
        <Link href="/dashboard" className="text-(--color-primary) hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    if (!memberId) return;
    setSaving(true);
    setSaveMessage(null);

    const body: Record<string, string> = {};
    if (editStage !== data?.profile?.stage) body.stage = editStage;
    if (editVerification !== data?.profile?.verification_status)
      body.verification_status = editVerification;
    if (editAccountStatus !== data?.profile?.account_status)
      body.account_status = editAccountStatus;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setSaveMessage({ text: "No changes to save.", ok: false });
      return;
    }

    const res = await fetch(`/api/advisor/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await res.json();
    setSaving(false);

    if (!res.ok) {
      setSaveMessage({ text: payload.error ?? "Save failed.", ok: false });
      return;
    }

    // Optimistically update local data
    if (data?.profile) {
      setData({
        ...data,
        profile: {
          ...data.profile,
          stage: editStage,
          verification_status: editVerification,
          account_status: editAccountStatus,
        },
      });
    }
    setSaveMessage({ text: "Changes saved.", ok: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/advisor/members"
            className="text-sm text-(--color-muted) transition hover:text-(--color-ink)"
          >
            ← Member management
          </Link>
          <p className="mt-8 text-sm text-(--color-muted)">Loading member...</p>
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/advisor/members"
            className="text-sm text-(--color-muted) transition hover:text-(--color-ink)"
          >
            ← Member management
          </Link>
          <p className="mt-8 text-sm text-(--color-body)">Member not found.</p>
        </div>
      </div>
    );
  }

  const { profile, asks, offers, matches, documents, creditBalance } = data;
  const stageLabel =
    STAGE_CONFIG[profile.stage as keyof typeof STAGE_CONFIG]?.label ??
    profile.stage;

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Back */}
        <Link
          href="/advisor/members"
          className="text-sm text-(--color-muted) transition hover:text-(--color-ink)"
        >
          ← Member management
        </Link>

        {/* Identity card */}
        <div className="rounded-[20px] border border-(--color-hairline) bg-(--color-surface-soft) p-8">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-xl font-semibold text-white">
              {(profile.full_name || profile.business_name || "?")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-(--color-ink)">
                  {profile.full_name || "—"}
                </h1>
                <Badge
                  label={`Stage ${profile.stage} · ${stageLabel}`}
                  colorClass={
                    STAGE_COLORS[profile.stage] ?? "bg-slate-100 text-slate-600"
                  }
                />
                <Badge
                  label={profile.verification_status}
                  colorClass={
                    VERIFICATION_COLORS[profile.verification_status] ??
                    "bg-slate-100 text-slate-600"
                  }
                />
                {profile.account_status !== "active" && (
                  <Badge
                    label={profile.account_status}
                    colorClass={
                      STATUS_COLORS[profile.account_status] ??
                      "bg-slate-100 text-slate-600"
                    }
                  />
                )}
              </div>
              <p className="mt-1 text-sm text-(--color-body)">
                {[profile.role_title, profile.business_name]
                  .filter(Boolean)
                  .join(" at ")}
              </p>
              <p className="mt-0.5 text-xs text-(--color-muted)">
                {[profile.sector, profile.city].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="rounded-[12px] border border-(--color-hairline) bg-(--color-canvas) px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.1em] text-(--color-muted)">
                Credits
              </p>
              <p className="mt-1 text-2xl font-semibold text-(--color-primary)">
                {creditBalance}
              </p>
            </div>
          </div>
          {profile.short_bio && (
            <p className="mt-4 text-sm text-(--color-body)">{profile.short_bio}</p>
          )}
        </div>

        {/* Profile details */}
        <SectionCard title="Profile details">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            <DetailField label="Email" value={profile.email} />
            <DetailField label="Phone / WhatsApp" value={profile.phone_whatsapp} />
            <DetailField label="City" value={profile.city} />
            <DetailField label="Sector" value={profile.sector} />
            <DetailField label="Member role" value={profile.member_role} />
            <DetailField label="Role / Title" value={profile.role_title} />
            <DetailField label="Years in operation" value={profile.years_in_operation} />
            <DetailField label="Employee band" value={profile.employee_band} />
            <DetailField label="Annual revenue estimate" value={profile.annual_revenue_estimate} />
            <DetailField label="How heard about" value={profile.how_heard_about} />
            <DetailField label="Referred by" value={profile.referred_by} />
            <DetailField
              label="PDPA consent"
              value={profile.pdpa_matching_consent}
            />
            <DetailField
              label="Member since"
              value={new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            />
          </div>
          {profile.additional_notes && (
            <div className="mt-5 border-t border-(--color-hairline) pt-5">
              <DetailField
                label="Additional notes"
                value={profile.additional_notes}
              />
            </div>
          )}
        </SectionCard>

        {/* Matching signals */}
        <SectionCard title="Matching signals">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                Ask categories
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(profile.ask_categories ?? []).length > 0 ? (
                  profile.ask_categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    >
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-(--color-muted)">None set</span>
                )}
              </div>
              {profile.asks_summary && (
                <p className="mt-3 text-sm text-(--color-body)">
                  {profile.asks_summary}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                Offer categories
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(profile.offer_categories ?? []).length > 0 ? (
                  profile.offer_categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {cat}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-(--color-muted)">None set</span>
                )}
              </div>
              {profile.offers_summary && (
                <p className="mt-3 text-sm text-(--color-body)">
                  {profile.offers_summary}
                </p>
              )}
            </div>
          </div>

          {/* ASKs & OFFERs from member_asks_offers table */}
          {(asks.length > 0 || offers.length > 0) && (
            <div className="mt-6 grid gap-6 border-t border-(--color-hairline) pt-6 sm:grid-cols-2">
              {asks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                    ASKs ({asks.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {asks.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-(--color-ink)">
                            {a.title}
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {a.status}
                          </span>
                        </div>
                        {a.description && (
                          <p className="mt-1 text-xs text-(--color-body)">
                            {a.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {offers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                    OFFERs ({offers.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {offers.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-(--color-ink)">
                            {o.title}
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {o.status}
                          </span>
                        </div>
                        {o.description && (
                          <p className="mt-1 text-xs text-(--color-body)">
                            {o.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Match history */}
        <SectionCard title={`Match history (${matches.length})`}>
          {matches.length === 0 ? (
            <p className="text-sm text-(--color-muted)">No matches yet.</p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {m.counterpart_name}
                    </p>
                    {m.summary && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-(--color-body)">
                        {m.summary}
                      </p>
                    )}
                  </div>
                  {typeof m.fit_score === "number" && (
                    <span className="text-xs font-semibold text-(--color-muted)">
                      {m.fit_score}/100
                    </span>
                  )}
                  <Badge
                    label={m.status}
                    colorClass={
                      MATCH_STATUS_COLORS[m.status] ??
                      "bg-slate-100 text-slate-600"
                    }
                  />
                  <p className="hidden text-xs text-(--color-muted) sm:block">
                    {new Date(m.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Documents */}
        <SectionCard title={`Documents (${documents.length})`}>
          {documents.length === 0 ? (
            <p className="text-sm text-(--color-muted)">
              No documents submitted.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-(--color-ink)">
                      {DOCUMENT_TYPES[
                        doc.document_type as keyof typeof DOCUMENT_TYPES
                      ] ?? doc.document_type}
                    </p>
                    {doc.reject_reason && (
                      <p className="mt-0.5 text-xs text-red-600">
                        Rejected: {doc.reject_reason}
                      </p>
                    )}
                  </div>
                  <Badge
                    label={doc.status}
                    colorClass={
                      DOCUMENT_STATUS_COLORS[doc.status] ??
                      "bg-slate-100 text-slate-600"
                    }
                  />
                  <p className="hidden text-xs text-(--color-muted) sm:block">
                    {new Date(doc.uploaded_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Advisor actions */}
        <div className="rounded-[20px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-base font-semibold text-(--color-ink)">
            Advisor actions
          </h2>
          <p className="mt-1 text-sm text-(--color-body)">
            Update stage, verification status, or account standing.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="edit-stage" className="block text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                Stage
              </label>
              <select
                id="edit-stage"
                className="gn-input mt-2"
                value={editStage}
                onChange={(e) => setEditStage(e.target.value)}
              >
                {(["0", "1", "2", "3", "4"] as const).map((s) => (
                  <option key={s} value={s}>
                    Stage {s} — {STAGE_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-verification" className="block text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                Verification
              </label>
              <select
                id="edit-verification"
                className="gn-input mt-2"
                value={editVerification}
                onChange={(e) => setEditVerification(e.target.value)}
              >
                <option value="unverified">Unverified</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-account-status" className="block text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
                Account status
              </label>
              <select
                id="edit-account-status"
                className="gn-input mt-2"
                value={editAccountStatus}
                onChange={(e) => setEditAccountStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              className="gn-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saveMessage && (
              <p
                className={`text-sm ${
                  saveMessage.ok ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {saveMessage.text}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
