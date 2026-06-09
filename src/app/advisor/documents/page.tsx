"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../providers";
import {
  fetchAdvisorDocumentQueue,
  type AdvisorDocumentQueueRecord,
} from "@/lib/app-data";
import { DOCUMENT_TYPES, STAGE_CONFIG } from "@/types/constants";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700",
  "under-review": "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const STAGE_COLORS: Record<string, string> = {
  "0": "bg-slate-100 text-slate-600",
  "1": "bg-blue-100 text-blue-700",
  "2": "bg-amber-100 text-amber-700",
  "3": "bg-purple-100 text-purple-700",
  "4": "bg-green-100 text-green-700",
};

function getInitials(name: string | null, business: string | null) {
  const source = name || business || "?";
  return source
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
}

type QueueData = {
  pending: AdvisorDocumentQueueRecord[];
  processed: AdvisorDocumentQueueRecord[];
};

export default function AdvisorDocumentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [queueData, setQueueData] = useState<QueueData>({
    pending: [],
    processed: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");

  // Per-card action state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    id: string;
    text: string;
    ok: boolean;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await fetchAdvisorDocumentQueue(supabase);
      setQueueData(data);
      setIsLoading(false);
    };
    void load();
  }, [supabase]);

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

  const handleAction = async (
    doc: AdvisorDocumentQueueRecord,
    action: "approve" | "reject" | "under-review",
    reason?: string,
  ) => {
    setBusyId(doc.id);
    setActionMessage(null);

    const res = await fetch(`/api/advisor/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reject_reason: reason }),
    });

    const payload = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setActionMessage({ id: doc.id, text: payload.error ?? "Action failed.", ok: false });
      return;
    }

    // Optimistic update: move card between lists
    const updatedDoc: AdvisorDocumentQueueRecord = {
      ...doc,
      status: action === "under-review" ? "under-review" : action === "approve" ? "approved" : "rejected",
      reject_reason: action === "reject" ? (reason ?? null) : null,
      reviewed_at: new Date().toISOString(),
      // If approved, reflect the stage progression
      member: doc.member
        ? {
            ...doc.member,
            stage:
              action === "approve" && ["0", "1"].includes(doc.member.stage)
                ? "2"
                : doc.member.stage,
            verification_status:
              action === "approve" ? "verified" : doc.member.verification_status,
          }
        : null,
    };

    if (action === "under-review") {
      setQueueData((prev) => ({
        ...prev,
        pending: prev.pending.map((d) => (d.id === doc.id ? updatedDoc : d)),
      }));
    } else {
      setQueueData((prev) => ({
        pending: prev.pending.filter((d) => d.id !== doc.id),
        processed: [updatedDoc, ...prev.processed],
      }));
    }

    setRejectingId(null);
    setRejectReason("");
  };

  const pendingCount = queueData.pending.length;
  const approvedCount = queueData.processed.filter(
    (d) => d.status === "approved",
  ).length;
  const rejectedCount = queueData.processed.filter(
    (d) => d.status === "rejected",
  ).length;

  return (
    <div className="min-h-screen bg-(--color-canvas) px-4 sm:px-6 pt-16 pb-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">

        {/* Header */}
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Advisor Portal</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">
            Document review
          </h1>
          <p className="mt-1 text-sm text-(--color-muted)">
            Approve or reject Stage 2 KYC submissions. Approval automatically advances the member to Stage 2.
          </p>
        </div>

        {/* Metrics */}
        <section className="grid grid-cols-3 gap-4">
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              In queue
            </p>
            <p className="mt-2 text-3xl font-semibold text-(--color-primary)">
              {isLoading ? "—" : pendingCount}
            </p>
          </div>
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              Approved
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">
              {isLoading ? "—" : approvedCount}
            </p>
          </div>
          <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--color-muted)">
              Rejected
            </p>
            <p className="mt-2 text-3xl font-semibold text-red-500">
              {isLoading ? "—" : rejectedCount}
            </p>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) p-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition ${
              activeTab === "queue"
                ? "bg-(--color-canvas) text-(--color-ink) shadow-sm"
                : "text-(--color-muted) hover:text-(--color-body)"
            }`}
          >
            Queue
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--color-primary) text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-(--color-canvas) text-(--color-ink) shadow-sm"
                : "text-(--color-muted) hover:text-(--color-body)"
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-(--color-muted)">
            Loading documents...
          </div>
        ) : activeTab === "queue" ? (
          <QueueTab
            documents={queueData.pending}
            busyId={busyId}
            rejectingId={rejectingId}
            rejectReason={rejectReason}
            actionMessage={actionMessage}
            onApprove={(doc) => handleAction(doc, "approve")}
            onUnderReview={(doc) => handleAction(doc, "under-review")}
            onRejectOpen={(id) => {
              setRejectingId(id);
              setRejectReason("");
              setActionMessage(null);
            }}
            onRejectCancel={() => {
              setRejectingId(null);
              setRejectReason("");
            }}
            onRejectConfirm={(doc) => handleAction(doc, "reject", rejectReason)}
            onRejectReasonChange={setRejectReason}
          />
        ) : (
          <HistoryTab documents={queueData.processed} />
        )}
      </div>
    </div>
  );
}

function QueueTab({
  documents,
  busyId,
  rejectingId,
  rejectReason,
  actionMessage,
  onApprove,
  onUnderReview,
  onRejectOpen,
  onRejectCancel,
  onRejectConfirm,
  onRejectReasonChange,
}: {
  documents: AdvisorDocumentQueueRecord[];
  busyId: string | null;
  rejectingId: string | null;
  rejectReason: string;
  actionMessage: { id: string; text: string; ok: boolean } | null;
  onApprove: (doc: AdvisorDocumentQueueRecord) => void;
  onUnderReview: (doc: AdvisorDocumentQueueRecord) => void;
  onRejectOpen: (id: string) => void;
  onRejectCancel: () => void;
  onRejectConfirm: (doc: AdvisorDocumentQueueRecord) => void;
  onRejectReasonChange: (v: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-(--color-hairline) bg-(--color-surface-soft) py-16 text-center">
        <p className="text-sm font-semibold text-(--color-ink)">
          Queue is clear
        </p>
        <p className="mt-1 text-sm text-(--color-muted)">
          No documents awaiting review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const isBusy = busyId === doc.id;
        const isRejecting = rejectingId === doc.id;
        const msg = actionMessage?.id === doc.id ? actionMessage : null;
        const docLabel =
          DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] ??
          doc.document_type;
        const isPlaceholder = doc.file_path.startsWith("pending://");
        const stageLabel =
          STAGE_CONFIG[
            (doc.member?.stage ?? "0") as keyof typeof STAGE_CONFIG
          ]?.label ?? doc.member?.stage;

        return (
          <div
            key={doc.id}
            className="rounded-[20px] border border-(--color-hairline) bg-(--color-canvas) p-6"
          >
            {/* Member info row */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-primary) text-sm font-semibold text-white">
                {getInitials(
                  doc.member?.full_name ?? null,
                  doc.member?.business_name ?? null,
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-(--color-ink)">
                  {doc.member?.full_name || "Unknown member"}
                </p>
                <p className="text-xs text-(--color-muted)">
                  {doc.member?.business_name || "No business name"}
                  {doc.member?.sector ? ` · ${doc.member.sector}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {doc.member?.stage && (
                  <Badge
                    label={`Stage ${doc.member.stage} · ${stageLabel}`}
                    colorClass={
                      STAGE_COLORS[doc.member.stage] ??
                      "bg-slate-100 text-slate-600"
                    }
                  />
                )}
                <Badge
                  label={doc.status}
                  colorClass={
                    STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600"
                  }
                />
              </div>
            </div>

            {/* Document info */}
            <div className="mt-4 rounded-[12px] border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-(--color-ink)">
                    {docLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-(--color-muted)">
                    Submitted{" "}
                    {new Date(doc.uploaded_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {isPlaceholder ? (
                  <span className="text-xs text-(--color-muted)">
                    No file uploaded yet
                  </span>
                ) : (
                  <a
                    href={doc.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View file →
                  </a>
                )}
              </div>
            </div>

            {/* Action error */}
            {msg && !msg.ok && (
              <p className="mt-3 text-sm text-red-600">{msg.text}</p>
            )}

            {/* Reject reason panel */}
            {isRejecting && (
              <div className="mt-4 rounded-[12px] border border-red-100 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">
                  Rejection reason
                </p>
                <textarea
                  className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-(--color-ink) placeholder:text-(--color-muted) focus:border-red-400 focus:outline-none"
                  rows={3}
                  placeholder="Describe why this document is being rejected..."
                  value={rejectReason}
                  onChange={(e) => onRejectReasonChange(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    disabled={isBusy || !rejectReason.trim()}
                    onClick={() => onRejectConfirm(doc)}
                  >
                    {isBusy ? "Rejecting..." : "Confirm rejection"}
                  </button>
                  <button
                    className="rounded-lg border border-(--color-hairline) px-4 py-2 text-sm text-(--color-muted) transition hover:text-(--color-ink)"
                    onClick={onRejectCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!isRejecting && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => onApprove(doc)}
                >
                  {isBusy ? "Processing..." : "Approve"}
                </button>
                {doc.status === "submitted" && (
                  <button
                    className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    disabled={isBusy}
                    onClick={() => onUnderReview(doc)}
                  >
                    Mark under review
                  </button>
                )}
                <button
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => onRejectOpen(doc.id)}
                >
                  Reject
                </button>
                <Link
                  href={`/advisor/members/${doc.member_id}`}
                  className="ml-auto rounded-lg border border-(--color-hairline) px-4 py-2 text-sm text-(--color-muted) transition hover:border-(--color-border-strong) hover:text-(--color-ink)"
                >
                  View member →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ documents }: { documents: AdvisorDocumentQueueRecord[] }) {
  if (documents.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-(--color-hairline) bg-(--color-surface-soft) py-16 text-center">
        <p className="text-sm text-(--color-muted)">
          No processed documents yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const docLabel =
          DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] ??
          doc.document_type;
        const stageLabel =
          STAGE_CONFIG[
            (doc.member?.stage ?? "0") as keyof typeof STAGE_CONFIG
          ]?.label ?? doc.member?.stage;

        return (
          <div
            key={doc.id}
            className="flex items-center gap-4 rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) px-5 py-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-surface-strong) text-xs font-semibold text-(--color-muted)">
              {getInitials(
                doc.member?.full_name ?? null,
                doc.member?.business_name ?? null,
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-(--color-ink)">
                {doc.member?.full_name || "Unknown"} —{" "}
                <span className="font-normal text-(--color-body)">
                  {docLabel}
                </span>
              </p>
              {doc.reject_reason && (
                <p className="mt-0.5 truncate text-xs text-red-600">
                  Reason: {doc.reject_reason}
                </p>
              )}
            </div>
            {doc.member?.stage && (
              <Badge
                label={`Stage ${doc.member.stage} · ${stageLabel}`}
                colorClass={
                  STAGE_COLORS[doc.member.stage] ??
                  "bg-slate-100 text-slate-600"
                }
              />
            )}
            <Badge
              label={doc.status}
              colorClass={
                STATUS_COLORS[doc.status] ?? "bg-slate-100 text-slate-600"
              }
            />
            {doc.reviewed_at && (
              <p className="hidden shrink-0 text-xs text-(--color-muted) sm:block">
                {new Date(doc.reviewed_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <Link
              href={`/advisor/members/${doc.member_id}`}
              className="shrink-0 rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) transition hover:border-(--color-border-strong)"
            >
              View →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
