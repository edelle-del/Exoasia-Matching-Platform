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
}: {
  announcement: Announcement;
  userId: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <div className="border-b border-(--color-hairline) last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 text-left flex items-start justify-between gap-4 group"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-(--color-ink) group-hover:text-(--color-primary) transition-colors">
              {announcement.title}
            </h4>
            {announcement.is_featured && (
              <span className="shrink-0 inline-block rounded-full bg-(--color-primary)/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-(--color-primary)">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-(--color-muted)">
            ({new Date(announcement.created_at).toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })})
          </p>
        </div>
        <div className="text-(--color-muted) shrink-0 mt-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="pb-5 pt-1">
          <div className="text-sm text-(--color-body) whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </div>
          <div className="mt-4 flex justify-end">
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-(--color-canvas) shadow-xl max-h-[85vh] flex flex-col">
        <div className="p-6 shrink-0 border-b border-(--color-hairline)">
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
        </div>

        <div className="overflow-y-auto px-6 py-2">
          {announcements.map((announcement) => (
            <AnnouncementItem
              key={announcement.id}
              announcement={announcement}
              userId={userId}
            />
          ))}
        </div>

        <div className="shrink-0 border-t border-(--color-hairline) bg-(--color-surface-soft) px-6 py-4 flex justify-end">
          <button
            onClick={handleDismiss}
            className="rounded-xl bg-(--color-ink) px-5 py-2.5 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
