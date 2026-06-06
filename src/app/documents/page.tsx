"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPlaceholderDocument, fetchDocuments } from "@/lib/app-data";
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

  const load = async () => {
    if (!user?.id) return;
    const next = (await fetchDocuments(supabase, user.id)) as MemberDocument[];
    setDocs(next);
  };

  useEffect(() => {
    void load();
  }, [user?.id]);

  const submitPlaceholder = async (documentType: string) => {
    if (!user?.id) return;
    const { error } = await createPlaceholderDocument(
      supabase,
      user.id,
      documentType,
    );
    if (error) {
      window.alert(error);
      return;
    }
    await load();
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
                  onClick={() => submitPlaceholder(type)}
                  className="mt-4 gn-btn-primary"
                >
                  Submit {type}
                </button>
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
                  {doc.file_path}
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
