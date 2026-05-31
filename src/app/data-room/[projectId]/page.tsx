"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";

type DataRoomFile = {
  id: string;
  name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  stage: string | null;
  sector: string | null;
};

type PreviewState = {
  file: DataRoomFile;
  url: string | null;
  loading: boolean;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(0, idx) : filename;
}

function isImage(mimeType: string | null): boolean {
  return !!mimeType?.startsWith("image/");
}

function isPDF(mimeType: string | null): boolean {
  return mimeType === "application/pdf";
}

function fileIcon(mimeType: string | null): string {
  if (isPDF(mimeType)) return "ri-file-pdf-2-line";
  if (isImage(mimeType)) return "ri-image-line";
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv"))
    return "ri-file-excel-2-line";
  if (mimeType?.includes("word") || mimeType?.includes("document"))
    return "ri-file-word-2-line";
  if (mimeType?.includes("presentation") || mimeType?.includes("powerpoint"))
    return "ri-file-ppt-2-line";
  return "ri-file-3-line";
}

export default function ProjectDataRoomPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<DataRoomFile[]>([]);
  const [loading, setLoading] = useState(true);

  // rename prompt
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingName, setPendingName] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // preview
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/data-room/projects/${projectId}`).then((r) => r.json()),
    ]).then(([projectData, filesData]) => {
      if (projectData.project) setProject(projectData.project as Project);
      setFiles((filesData as { files?: DataRoomFile[] }).files ?? []);
      setLoading(false);
    });
  }, [projectId]);

  // Focus name input when rename prompt appears
  useEffect(() => {
    if (pendingFile) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [pendingFile]);

  // Close preview on Escape
  useEffect(() => {
    if (!preview) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [preview]);

  // ── Rename / upload ──────────────────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    setPendingName(stripExtension(file.name));
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const dismissPending = () => {
    setPendingFile(null);
    setPendingName("");
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;
    const trimmed = pendingName.trim();
    if (!trimmed) {
      setUploadError("File name cannot be empty.");
      return;
    }
    const ext = getExtension(pendingFile.name);
    const finalName = trimmed + ext;
    const renamedFile = new File([pendingFile], finalName, {
      type: pendingFile.type,
    });
    setUploading(true);
    setUploadError("");
    setPendingFile(null);
    const fd = new FormData();
    fd.append("file", renamedFile);
    try {
      const res = await fetch(`/api/data-room/projects/${projectId}/upload`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { file?: DataRoomFile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      if (data.file) setFiles((prev) => [data.file!, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Remove this file from the data room?")) return;
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/data-room/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        if (preview?.file.id === fileId) setPreview(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloadingId(fileId);
    try {
      const res = await fetch(`/api/data-room/files/${fileId}/download`);
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Preview ──────────────────────────────────────────────────────────────────

  const handlePreview = async (file: DataRoomFile) => {
    setPreview({ file, url: null, loading: true });
    try {
      // /preview returns an inline (non-download) signed URL
      const res = await fetch(`/api/data-room/files/${file.id}/preview`);
      const data = (await res.json()) as { url?: string };
      setPreview((prev) =>
        prev?.file.id === file.id
          ? { ...prev, url: data.url ?? null, loading: false }
          : prev,
      );
    } catch {
      setPreview((prev) =>
        prev?.file.id === file.id ? { ...prev, loading: false } : prev,
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-canvas)">
        <p className="text-sm text-(--color-muted)">Project not found.</p>
      </div>
    );
  }

  const pendingExt = pendingFile ? getExtension(pendingFile.name) : "";

  return (
    <>
      {/* ── Preview modal ── */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setPreview(null)}
        >
          {/* Header */}
          <div
            className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-3">
              <i
                className={`${fileIcon(preview.file.mime_type)} text-xl text-white/60`}
              />
              <p className="truncate text-sm font-medium text-white">
                {preview.file.name}
              </p>
              <span className="hidden shrink-0 text-xs text-white/40 sm:block">
                {formatSize(preview.file.file_size)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={downloadingId === preview.file.id}
                onClick={() =>
                  void handleDownload(preview.file.id, preview.file.name)
                }
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {downloadingId === preview.file.id ? "…" : "Download"}
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex flex-1 items-center justify-center overflow-hidden p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.loading ? (
              <p className="text-sm text-white/60">Loading preview…</p>
            ) : !preview.url ? (
              <p className="text-sm text-white/40">Failed to load preview.</p>
            ) : isPDF(preview.file.mime_type) ? (
              <iframe
                src={preview.url}
                className="h-full w-full rounded-xl bg-white"
                title={preview.file.name}
              />
            ) : isImage(preview.file.mime_type) ? (
              <img
                src={preview.url}
                alt={preview.file.name}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <i
                  className={`${fileIcon(preview.file.mime_type)} text-6xl text-white/30`}
                />
                <p className="text-sm text-white/60">
                  Preview not available for this file type.
                </p>
                <button
                  type="button"
                  disabled={downloadingId === preview.file.id}
                  onClick={() =>
                    void handleDownload(preview.file.id, preview.file.name)
                  }
                  className="gn-btn-primary disabled:opacity-50"
                >
                  Download instead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-(--color-canvas)">
        {/* Header */}
        <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
          <div className="mx-auto max-w-7xl flex items-start justify-between gap-4">
            <div>
              <Link
                href="/data-room"
                className="text-sm text-(--color-primary) hover:underline"
              >
                ← Data room
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold text-(--color-ink)">
                  {project.name}
                </h1>
                {project.stage && (
                  <span className="rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-xs font-semibold text-(--color-primary)">
                    {project.stage}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-(--color-body)">
                Upload pitch decks, financials, and any other relevant documents
                for this project. Click a file to preview it.
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Upload file to data room"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <button
                type="button"
                disabled={uploading || !!pendingFile}
                onClick={() => fileInputRef.current?.click()}
                className="gn-btn-primary disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload file"}
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-[5%] py-10 space-y-6">
          {/* Rename prompt */}
          {pendingFile && (
            <div className="rounded-xl border border-(--color-primary)/30 bg-(--color-primary)/5 p-5">
              <p className="text-sm font-semibold text-(--color-ink)">
                Name this file before uploading
              </p>
              <p className="mt-0.5 text-xs text-(--color-muted)">
                Original: {pendingFile.name}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    className="gn-input w-full pr-16"
                    value={pendingName}
                    onChange={(e) => setPendingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleUploadConfirm();
                      if (e.key === "Escape") dismissPending();
                    }}
                    placeholder="File name"
                  />
                  {pendingExt && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-(--color-muted)">
                      {pendingExt}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void handleUploadConfirm()}
                  className="gn-btn-primary shrink-0 disabled:opacity-50"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={dismissPending}
                  className="shrink-0 text-sm text-(--color-muted) hover:text-(--color-ink)"
                >
                  Cancel
                </button>
              </div>
              {uploadError && (
                <p className="mt-2 text-xs text-red-600">{uploadError}</p>
              )}
            </div>
          )}

          {!pendingFile && uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}

          {/* File list */}
          <section>
            <h2 className="text-base font-semibold text-(--color-ink)">
              Files{" "}
              <span className="text-sm font-normal text-(--color-muted)">
                ({files.length})
              </span>
            </h2>

            {files.length === 0 ? (
              <div className="mt-4 rounded-xl border border-(--color-hairline) border-dashed bg-(--color-surface-soft) p-10 text-center">
                <p className="text-sm text-(--color-muted)">
                  No files uploaded yet for this project.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm font-semibold text-(--color-primary) hover:underline"
                >
                  Upload your first file →
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3 transition-colors hover:border-(--color-primary)/30 hover:bg-(--color-canvas)"
                  >
                    {/* Icon + clickable name */}
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => void handlePreview(file)}
                    >
                      <i
                        className={`${fileIcon(file.mime_type)} shrink-0 text-2xl text-(--color-primary)`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-(--color-ink) group-hover:text-(--color-primary)">
                          {file.name}
                        </p>
                        <p className="text-xs text-(--color-muted)">
                          {formatSize(file.file_size)} ·{" "}
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePreview(file)}
                        className="rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-primary) hover:border-(--color-primary) hover:text-white transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={downloadingId === file.id}
                        onClick={() => void handleDownload(file.id, file.name)}
                        className="rounded-lg border border-(--color-hairline) px-3 py-1.5 text-xs font-semibold text-(--color-ink) hover:bg-(--color-canvas) transition-colors disabled:opacity-50"
                      >
                        {downloadingId === file.id ? "…" : "Download"}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === file.id}
                        onClick={() => void handleDelete(file.id)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === file.id ? "…" : "Remove"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
