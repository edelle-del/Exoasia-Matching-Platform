"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_featured: boolean;
};

export default function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchLatestAnnouncement = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const dismissed = localStorage.getItem("dismissed_announcements");
        let dismissedIds: string[] = [];
        if (dismissed) {
          try {
            dismissedIds = JSON.parse(dismissed);
          } catch {
            // ignore parse error
          }
        }
        
        if (!dismissedIds.includes(data.id)) {
          setAnnouncement(data);
          setIsOpen(true);
        }
      }
    };

    fetchLatestAnnouncement();
  }, []);

  if (!isOpen || !announcement) return null;

  const handleDismiss = () => {
    const dismissed = localStorage.getItem("dismissed_announcements");
    let dismissedIds: string[] = [];
    if (dismissed) {
      try {
        dismissedIds = JSON.parse(dismissed);
      } catch {
        // ignore parse error
      }
    }
    dismissedIds.push(announcement.id);
    localStorage.setItem("dismissed_announcements", JSON.stringify(dismissedIds));
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-(--color-canvas) shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-(--color-ink)">{announcement.title}</h2>
            {announcement.is_featured && (
              <span className="inline-block rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-primary)">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-(--color-muted) mb-4">
            {new Date(announcement.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
          <div className="text-sm text-(--color-body) whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {announcement.content}
          </div>
        </div>
        <div className="border-t border-(--color-hairline) bg-(--color-surface-soft) px-6 py-4 flex justify-end">
          <button
            onClick={handleDismiss}
            className="rounded-xl bg-(--color-ink) px-4 py-2 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
