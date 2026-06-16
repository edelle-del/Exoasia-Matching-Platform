"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateAnnouncementForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, is_featured: isFeatured }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert("Failed to create announcement: " + data.error);
      } else {
        setIsOpen(false);
        setTitle("");
        setContent("");
        setIsFeatured(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="gn-btn-primary shrink-0"
      >
        + New Announcement
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-(--color-ink) mb-4">Create Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-(--color-ink) mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                  placeholder="Announcement Title"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-(--color-ink) mb-1">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-(--color-hairline) bg-(--color-surface-soft) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                  placeholder="Write the announcement details..."
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-(--color-hairline) text-(--color-primary) focus:ring-(--color-primary)"
                  disabled={isSubmitting}
                />
                <label htmlFor="isFeatured" className="text-sm text-(--color-ink)">
                  Mark as Featured
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-(--color-muted) hover:text-(--color-ink) transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gn-btn-primary"
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                >
                  {isSubmitting ? "Publishing..." : "Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
