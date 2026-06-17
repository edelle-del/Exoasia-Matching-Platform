"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type AnnouncementProps = {
  announcement: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_featured: boolean;
  };
  currentUserId: string;
  canDelete: boolean;
  initialLikes: number;
  initialLiked: boolean;
  isMain?: boolean;
  defaultExpanded?: boolean;
};

export function AnnouncementCard({
  announcement,
  currentUserId,
  canDelete,
  initialLikes,
  initialLiked,
  isMain = false,
  defaultExpanded = false,
}: AnnouncementProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isMain);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async () => {
    if (isLiking || liked) return;
    setIsLiking(true);

    // Optimistic UI update
    setLiked(true);
    setLikes((prev) => prev + 1);

    try {
      const res = await fetch(`/api/announcements/${announcement.id}/like`, {
        method: "POST",
      });

      if (!res.ok) {
        // Revert on failure
        setLiked(false);
        setLikes(initialLikes);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setLiked(false);
      setLikes(initialLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete announcement.");
        setIsDeleting(false);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
      setIsDeleting(false);
    }
  };

  return (
    <div className={`rounded-2xl border ${isMain ? 'border-(--color-primary)/20 bg-(--color-surface-soft) p-6' : 'border-(--color-hairline) bg-(--color-canvas) p-3 sm:p-4'} h-fit`}>
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={() => !isMain && setIsExpanded(!isExpanded)}
          className={`flex-1 text-left flex items-start gap-4 ${!isMain ? 'group' : 'cursor-default'}`}
        >
          <div className="flex-1">
            <div className="flex flex-col items-start gap-1 sm:gap-1.5">
              <div className="flex items-start gap-2">
                {announcement.is_featured && isMain && (
                  <span className="shrink-0 inline-block rounded-full bg-(--color-primary)/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-(--color-primary) mt-1">
                    Featured
                  </span>
                )}
                <h2 className={`${isMain ? 'text-2xl font-black tracking-tight' : 'text-sm font-bold leading-tight'} text-(--color-ink) whitespace-normal ${!isMain && 'group-hover:text-(--color-primary)'} transition-colors text-left`}>
                  {announcement.title}
                </h2>
              </div>
              <p className={`text-xs text-(--color-muted) shrink-0 whitespace-nowrap ${!isMain && 'font-medium'}`}>
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

        <div className="flex items-center gap-2 shrink-0">
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-(--color-muted) hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 disabled:opacity-50"
              title="Delete Announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => !isMain && setIsExpanded(!isExpanded)}
            className={`text-(--color-muted) p-2 hover:bg-(--color-surface-soft) rounded-full transition-colors ${isMain ? 'invisible' : ''}`}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="mt-6 text-sm text-(--color-body) whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </div>

          <div className="mt-6 flex items-center justify-end border-t border-(--color-hairline) pt-4">
            <button
              onClick={handleLike}
              disabled={isLiking || liked}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                liked
                  ? "bg-(--color-primary)/10 text-(--color-primary) cursor-default"
                  : "text-(--color-muted) hover:bg-(--color-surface-soft) hover:text-(--color-ink)"
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
              <span>
                {liked 
                  ? `Acknowledged by ${likes} user${likes !== 1 ? 's' : ''}` 
                  : (likes > 0 ? `Acknowledge (${likes})` : "Acknowledge")}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
