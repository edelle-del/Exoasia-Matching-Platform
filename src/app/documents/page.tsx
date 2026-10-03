"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchDocuments } from "@/lib/app-data";
import { useAuth } from "../providers";

const REQUIRED_TYPES = ["sec-certificate", "dti-registration"];

type MemberDocument = {
  id: string;
  document_type: string;
  status: "submitted" | "under-review" | "approved" | "rejected";
  file_path: string;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reject_reason: string | null;
};

export default function DocumentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [docs, setDocs] = useState<MemberDocument[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busyType, setBusyType] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!user?.id) return;
    const next = (await fetchDocuments(supabase, user.id)) as MemberDocument[];
    setDocs(next);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const submitDocument = async (documentType: string) => {
    if (!user?.id) return;
    const file = files[documentType];
    if (!file) { setMessage("Choose a file before submitting."); return; }
    setBusyType(documentType);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("document_type", documentType);
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not submit document.");
      await load();
      setMessage("Document submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit document.");
    } finally {
      setBusyType(null);
    }
  };

  const byType = new Map(docs.map((d) => [d.document_type, d]));

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-4 sm:px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Documents
          </h1>
          <p className="mt-2 text-sm text-(--color-body)">
            Stage 2 requires Light KYC document approval before matching unlock.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 py-10">
        {message && <p role="status" className="text-sm text-(--color-body)">{message}</p>}
        <section className="grid gap-4 md:grid-cols-2">
          {REQUIRED_TYPES.map((type) => {
            const row = byType.get(type);
            return (
              <div
                key={type}
                className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5"
              >
                <h2 className="text-base font-semibold text-(--color-ink)">
                  {type}
                </h2>
                <p className="mt-2 text-sm text-(--color-body)">
                  Status: {row?.status || "missing"}
                </p>
                <button
                  type="button"
                  disabled={!!busyType || !files[type]}
                  onClick={() => submitDocument(type)}
                  className="mt-4 gn-btn-primary disabled:opacity-50"
                >
                  {busyType === type ? "Uploading…" : `Submit ${type}`}
                </button>
                <label className="mt-4 block text-sm text-(--color-body)">
                  Document file (PDF, PNG or JPEG, up to 10 MB)
                  <input type="file" accept="application/pdf,image/png,image/jpeg" disabled={!!busyType}
                    onChange={(event) => setFiles((prev) => ({ ...prev, [type]: event.target.files?.[0] ?? null }))}
                    className="mt-2 block w-full text-sm" />
                </label>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-(--color-ink)">
            Uploaded documents
          </h2>
          {docs.length === 0 ? (
            <div className="rounded-[16px] border border-(--color-hairline) bg-(--color-surface-soft) p-6 text-sm text-(--color-body)">
              No documents uploaded yet.
            </div>
          ) : (
            docs.map((doc) => (
              <article
                key={doc.id}
                className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-5"
              >
                <p className="text-sm font-semibold text-(--color-ink)">
                  {doc.document_type}
                </p>
                <p className="mt-1 text-sm text-(--color-body)">
                  {doc.file_path.startsWith("pending://") ? "No file uploaded — please resubmit." : (
                    <a href={`/api/documents/${doc.id}/download`} className="text-(--color-primary) hover:underline">Download document</a>
                  )}
                </p>
                <p className="mt-1 text-xs text-(--color-muted)">
                  Status: {doc.status}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
