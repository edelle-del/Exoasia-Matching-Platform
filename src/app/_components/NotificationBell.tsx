"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type Notification = {
  id: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell({ currentUserId }: { currentUserId: string | null }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const instanceId = React.useId();

  useEffect(() => {
    if (!currentUserId) return;

    async function loadNotifications() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);

      if (count !== null) {
        setUnreadCount(count);
      }
    }

    void loadNotifications();

    // Set up realtime subscription with a unique channel name per instance
    const channelName = `notifications_${currentUserId}_${instanceId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        () => {
          setUnreadCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, instanceId]);

  if (!currentUserId) return null;

  return (
    <Link
      href="/notifications"
      className="relative flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-black/5 text-(--color-muted) hover:text-(--color-ink)"
    >
      <i className="ri-notification-3-line text-lg" />
      {unreadCount > 0 && (
        <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-(--color-danger)"></span>
      )}
    </Link>
  );
}
