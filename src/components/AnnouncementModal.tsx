"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, ChevronDown, ChevronUp } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_featured: boolean;
  announcement_likes?: { user_id: string }[];
};

function AnnouncementItem({
  announcement,
  userId,
  isMain = false,
  onSelect,
}: {
  announcement: Announcement;
  userId: string | null;
  isMain?: boolean;
  onSelect?: (a: Announcement) => void;
}) {
  const postLikes = announcement.announcement_likes || [];
  const [likes, setLikes] = useState(postLikes.length);
  const [liked, setLiked] = useState(
    userId ? postLikes.some((like: any) => like.user_id === userId) : false
  );
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || !userId || liked) return;
    setIsLiking(true);

    const initialLikes = likes;

    // Optimistic UI update
    setLiked(true);
    setLikes((prev) => prev + 1);

    try {
      const res = await fetch(`/api/announcements/${announcement.id}/like`, {
        method: "POST",
      });

      if (!res.ok) {
        setLiked(false);
        setLikes(initialLikes);
      }
    } catch (err) {
      console.error(err);
      setLiked(false);
      setLikes(initialLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleClick = () => {
    if (!isMain && onSelect) {
      onSelect(announcement);
    }
  };

  return (
    <div className={`border-b border-(--color-hairline) last:border-0 ${isMain ? 'h-full flex flex-col' : ''}`}>
      <button
        onClick={handleClick}
        className={`w-full py-4 text-left flex items-start justify-between gap-4 ${!isMain ? 'group' : 'cursor-default'}`}
      >
        <div className="flex-1">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-start gap-2">
              {announcement.is_featured && isMain && (
                <span className="shrink-0 inline-block rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-(--color-primary) mt-1">
                  Featured
                </span>
              )}
              <h4 className={`${isMain ? 'text-2xl font-black tracking-tight' : 'text-xs font-bold leading-tight'} text-(--color-ink) whitespace-normal ${!isMain && 'group-hover:text-(--color-primary)'} transition-colors text-left`}>
                {announcement.title}
              </h4>
            </div>
            <p className={`text-[10px] text-(--color-muted) shrink-0 whitespace-nowrap ${!isMain && 'font-medium'}`}>
              {new Date(announcement.created_at).toLocaleDateString(undefined, isMain ? {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              } : {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </button>

      {isMain && (
        <div className="pb-5 pt-1 flex flex-col flex-1">
          <div className="text-base text-(--color-body) whitespace-pre-wrap leading-relaxed flex-1">
            {announcement.content}
          </div>
          {announcement.title.toLowerCase().includes("upcoming event") && (
            <div className="mt-4">
              <a href="/events" className="inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity">
                View in Events Page
              </a>
            </div>
          )}
          <div className="mt-4 flex justify-end border-t border-(--color-hairline) pt-4">
            <button
              onClick={handleLike}
              disabled={isLiking || !userId || liked}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                liked
                  ? "bg-(--color-primary)/10 text-(--color-primary) cursor-default"
                  : "text-(--color-muted) bg-(--color-surface-soft) hover:bg-(--color-hairline) hover:text-(--color-ink)"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
              <span>
                {liked
                  ? `Acknowledged by ${likes} user${likes !== 1 ? "s" : ""}`
                  : likes > 0
                  ? `Acknowledge (${likes})`
                  : "Acknowledge"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnnouncementModal() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchRecentAnnouncements = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const { data } = await supabase
        .from("announcements")
        .select("*, announcement_likes(user_id)")
        .gte("created_at", twoWeeksAgo.toISOString())
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const dismissed = localStorage.getItem("dismissed_announcements");
        let dismissedIds: string[] = [];
        if (dismissed) {
          try {
            dismissedIds = JSON.parse(dismissed);
          } catch {
            // ignore parse error
          }
        }

        const hasNew = data.some((a) => !dismissedIds.includes(a.id));

        if (hasNew) {
          setAnnouncements(data);
          setIsOpen(true);
        }
      }
    };

    fetchRecentAnnouncements();
  }, []);

  if (!isOpen || announcements.length === 0) return null;

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

    // Add all current announcements to dismissed list
    announcements.forEach((a) => {
      if (!dismissedIds.includes(a.id)) {
        dismissedIds.push(a.id);
      }
    });

    localStorage.setItem("dismissed_announcements", JSON.stringify(dismissedIds));
    setIsOpen(false);
  };

  const featuredAnnouncement = announcements.find((a) => a.is_featured);
  const mainAnnouncement = featuredAnnouncement || announcements[0];
  const otherAnnouncements = announcements.filter((a) => a.id !== mainAnnouncement?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-(--color-canvas) shadow-xl max-h-[85vh] flex flex-col relative">
        <div className="p-6 shrink-0 border-b border-(--color-hairline) flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-(--color-ink)">
              Announcements
            </h3>
            <p className="text-[10px] uppercase tracking-wider text-(--color-muted)">
              As of{" "}
              {new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-xl bg-(--color-ink) px-5 py-2.5 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity hidden sm:block"
          >
            Got it
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {mainAnnouncement && (
              <div className="lg:col-span-2 rounded-2xl border border-(--color-primary)/20 bg-(--color-surface-soft) p-6">
                <AnnouncementItem
                  announcement={mainAnnouncement}
                  userId={userId}
                  isMain={true}
                />
              </div>
            )}
            
            <div className="lg:col-span-1 space-y-1">
              <h3 className="font-semibold text-xs uppercase tracking-widest text-(--color-muted) mb-2">Previous Updates</h3>
              {otherAnnouncements.length === 0 ? (
                <p className="text-xs text-(--color-muted)">No other announcements.</p>
              ) : (
                otherAnnouncements.map((announcement) => (
                  <AnnouncementItem
                    key={announcement.id}
                    announcement={announcement}
                    userId={userId}
                    onSelect={setSelectedAnnouncement}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-(--color-hairline) bg-(--color-surface-soft) px-6 py-4 flex justify-end sm:hidden">
          <button
            onClick={handleDismiss}
            className="rounded-xl bg-(--color-ink) px-5 py-2.5 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
        
        {/* Nested Modal for Selected Announcement */}
        {selectedAnnouncement && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-10">
            <div className="w-full max-w-2xl bg-(--color-canvas) rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden border border-(--color-hairline)">
              <div className="p-6 overflow-y-auto flex-1">
                <AnnouncementItem
                  announcement={selectedAnnouncement}
                  userId={userId}
                  isMain={true}
                />
              </div>
              <div className="p-4 border-t border-(--color-hairline) bg-(--color-surface-soft) flex justify-end">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="rounded-xl bg-(--color-ink) px-5 py-2.5 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
