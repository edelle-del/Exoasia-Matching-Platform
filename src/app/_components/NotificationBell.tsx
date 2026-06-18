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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const pathname = usePathname();
  const instanceId = React.useId();

  useEffect(() => {
    if (!currentUserId) return;

    async function loadNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    }

    loadNotifications();

    // Set up realtime subscription with a unique channel name per instance
    const channelName = `notifications_${currentUserId}_${instanceId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close when pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", currentUserId).eq("is_read", false);
  };

  if (!currentUserId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-black/5 text-(--color-muted) hover:text-(--color-ink)"
      >
        <i className="ri-notification-3-line text-lg" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-(--color-danger)"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-(--color-hairline) bg-(--color-surface) shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-(--color-hairline) px-4 py-3 bg-(--color-canvas)">
            <h3 className="font-semibold text-(--color-ink) text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-(--color-primary) hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-(--color-muted)">
                No notifications yet.
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || "#"}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                    }}
                    className={`block border-b border-(--color-hairline) px-4 py-3 hover:bg-(--color-canvas) transition-colors ${
                      !n.is_read ? "bg-black/[0.02]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-semibold ${!n.is_read ? "text-(--color-ink)" : "text-(--color-muted)"}`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-(--color-primary) mt-1 shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs leading-snug ${!n.is_read ? "text-(--color-ink)" : "text-(--color-muted)"}`}>
                      {n.message}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
