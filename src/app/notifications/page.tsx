"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  kind: "match" | "invite";
  type: "match" | "accepted" | "intro" | "declined";
  title: string;
  body: string;
  href: string;
  date: string;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_STYLES: Record<
  Notification["type"],
  { dot: string; icon: string; bg: string }
> = {
  match: { dot: "bg-indigo-500", icon: "ri-magic-line", bg: "bg-indigo-50" },
  accepted: {
    dot: "bg-emerald-500",
    icon: "ri-checkbox-circle-line",
    bg: "bg-emerald-50",
  },
  intro: {
    dot: "bg-purple-500",
    icon: "ri-arrow-left-right-line",
    bg: "bg-purple-50",
  },
  declined: { dot: "bg-gray-300", icon: "ri-close-line", bg: "bg-gray-50" },
};

const KIND_LABEL: Record<Notification["kind"], string> = {
  match: "Match",
  invite: "Invite",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const grouped = notifications.reduce<Record<string, Notification[]>>(
    (acc, n) => {
      const date = new Date(n.date);
      const diff = Date.now() - date.getTime();
      const key =
        diff < 86_400_000
          ? "Today"
          : diff < 172_800_000
            ? "Yesterday"
            : diff < 604_800_000
              ? "This week"
              : date.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                });
      (acc[key] ??= []).push(n);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="border-b border-(--color-hairline) bg-(--color-surface-soft) px-[5%] py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/dashboard"
            className="text-sm text-(--color-primary) hover:underline"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-(--color-ink)">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-(--color-body)">
            Your matches, invites, and platform activity.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-[5%] py-10">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-(--color-surface-soft)"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-(--color-hairline) bg-(--color-surface-soft) px-8 py-16 text-center">
            <i
              className="ri-notification-3-line text-4xl text-(--color-primary)"
              aria-hidden="true"
            />
            <p className="mt-4 text-base font-semibold text-(--color-ink)">
              No notifications yet
            </p>
            <p className="mt-1 text-sm text-(--color-muted)">
              When you get new matches or invites, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                  {group}
                </p>
                <div className="space-y-2">
                  {items.map((n) => {
                    const { dot, icon, bg } = TYPE_STYLES[n.type];
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        className="flex items-start gap-4 rounded-2xl border border-(--color-hairline) bg-(--color-canvas) p-4 transition-shadow hover:shadow-md"
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}
                        >
                          <i
                            className={`${icon} text-sm leading-none text-white`}
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-(--color-ink)">
                              {n.title}
                            </p>
                            <span className="rounded-full border border-(--color-hairline) px-2 py-0.5 text-[10px] font-medium text-(--color-muted)">
                              {KIND_LABEL[n.kind]}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-(--color-body)">
                            {n.body}
                          </p>
                          <p className="mt-1 text-xs text-(--color-muted)">
                            {formatRelativeTime(n.date)}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-(--color-muted)">
                          →
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
