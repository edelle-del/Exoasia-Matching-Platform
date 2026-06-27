"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchEvents,
  markEventAttendance,
  registerForEvent,
} from "@/lib/app-data";
import { useAuth } from "../providers";

type UpcomingEvent = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  max_attendees: number | null;
  registered: boolean;
  attended: boolean;
};

type PastEvent = {
  id: string;
  title: string;
  type: string;
  starts_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatTimeRange(starts: string, ends: string | null) {
  if (!ends) return formatTime(starts);
  return `${formatTime(starts)} – ${formatTime(ends)}`;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  dinner:      { label: "Private Dinner",  cls: "bg-amber-500/15 text-amber-400"   },
  "pitch-night":{ label: "Pitch Night",   cls: "bg-violet-500/15 text-violet-400"  },
  masterclass: { label: "Masterclass",    cls: "bg-indigo-500/15 text-indigo-400"  },
  session:     { label: "Session",        cls: "bg-emerald-500/15 text-emerald-400" },
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, role } = useAuth();

  const [upcoming, setUpcoming]           = useState<UpcomingEvent[]>([]);
  const [past, setPast]                   = useState<PastEvent[]>([]);
  const [rsvping, setRsvping]             = useState<string | null>(null);
  const [canCreateEvent, setCanCreateEvent] = useState(false);
  const [isEcosystemPartner, setIsEcosystemPartner] = useState(false);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UpcomingEvent | null>(null);

  // Pre-filled for Philippine Blockchain Week
  const [form, setForm] = useState({
    title:       "FOUNDERS ARENA Philippine Blockchain Week",
    type:        "session",
    date:        "2026-06-20",
    start_time:  "13:00",
    end_time:    "15:00",
    location:    "SMX Convention Center Manila",
    description: "Join FOUNDERS ARENA at the Philippine Blockchain Week — connect with investors, founders, and ecosystem partners shaping the future of blockchain in Southeast Asia.",
    max_attendees: "",
    postAsAnnouncement: false,
  });

  const load = async () => {
    if (!user?.id) return;
    const next = await fetchEvents(supabase, user.id);
    setUpcoming(next.upcoming as UpcomingEvent[]);
    setPast(next.past as PastEvent[]);
  };

  useEffect(() => {
    if (!user?.id) return;
    void load();
    supabase
      .from("profiles")
      .select("stage, member_role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const isAdvisor = data?.stage === "4" || role === "advisor";
        const isPartner = data?.member_role === "ecosystem_partner";
        const isAdmin = role === "admin";
        setCanCreateEvent(isAdvisor || isPartner || isAdmin);
        setIsEcosystemPartner(isPartner && !isAdvisor && !isAdmin);
      });
  }, [user?.id]);

  const handleRSVP = async (eventId: string) => {
    if (!user?.id) return;
    setRsvping(eventId);
    try {
      const { error } = await registerForEvent(supabase, user.id, eventId);
      if (error) { window.alert(error); return; }
      await load();
    } finally {
      setRsvping(null);
    }
  };

  const handleAttendance = async (eventId: string) => {
    if (!user?.id) return;
    const { error } = await markEventAttendance(supabase, user.id, eventId);
    if (error) { window.alert(error); return; }
    await load();
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      // Build ISO strings from date + time inputs (treat as local PHT UTC+8)
      const toISO = (date: string, time: string) => {
        const [h, m] = time.split(":").map(Number);
        const d = new Date(`${date}T00:00:00+08:00`);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };

      const body = {
        title:       form.title,
        type:        form.type,
        starts_at:   toISO(form.date, form.start_time),
        ends_at:     form.end_time ? toISO(form.date, form.end_time) : undefined,
        location:    form.location || undefined,
        description: form.description || undefined,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : undefined,
        postAsAnnouncement: form.postAsAnnouncement,
      };

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { id?: string; error?: string; needed?: number; balance?: number };
      if (!res.ok) {
        if (res.status === 402) {
          setCreateError(`Insufficient credits — you need ${data.needed ?? 5} cr but have ${data.balance ?? 0} cr.`);
        } else {
          setCreateError(data.error ?? "Failed to create event.");
        }
        return;
      }
      setShowAddForm(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto w-full max-w-7xl flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">FOUNDERS ARENA</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">Events</h1>
            <p className="mt-1 text-sm text-(--color-muted)">RSVP to upcoming events and meetups</p>
          </div>
          {canCreateEvent && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Post Event
            </button>
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 sm:px-6 pt-6 pb-10">

        {/* Add Event Form (advisors only) */}
        {canCreateEvent && showAddForm && (
          <section className="rounded-2xl border border-(--color-primary)/30 bg-(--color-primary)/5 p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-(--color-primary)">New Event</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ev-title" className="block text-xs font-semibold text-(--color-muted) mb-1">Title</label>
                <input
                  id="ev-title"
                  title="Event title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div>
                <label htmlFor="ev-date" className="block text-xs font-semibold text-(--color-muted) mb-1">Date</label>
                <input
                  id="ev-date"
                  type="date"
                  title="Event date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div>
                <label htmlFor="ev-type" className="block text-xs font-semibold text-(--color-muted) mb-1">Type</label>
                <select
                  id="ev-type"
                  title="Event type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                >
                  <option value="session">Session</option>
                  <option value="pitch-night">Pitch Night</option>
                  <option value="dinner">Private Dinner</option>
                  <option value="masterclass">Masterclass</option>
                </select>
              </div>
              <div>
                <label htmlFor="ev-start" className="block text-xs font-semibold text-(--color-muted) mb-1">Start time (PHT)</label>
                <input
                  id="ev-start"
                  type="time"
                  title="Start time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div>
                <label htmlFor="ev-end" className="block text-xs font-semibold text-(--color-muted) mb-1">End time (PHT)</label>
                <input
                  id="ev-end"
                  type="time"
                  title="End time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ev-location" className="block text-xs font-semibold text-(--color-muted) mb-1">Location</label>
                <input
                  id="ev-location"
                  title="Event location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ev-desc" className="block text-xs font-semibold text-(--color-muted) mb-1">Description</label>
                <textarea
                  id="ev-desc"
                  title="Event description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary) resize-none"
                />
              </div>
              <div>
                <label htmlFor="ev-max" className="block text-xs font-semibold text-(--color-muted) mb-1">Max attendees (optional)</label>
                <input
                  id="ev-max"
                  type="number"
                  title="Maximum number of attendees"
                  value={form.max_attendees}
                  onChange={(e) => setForm((f) => ({ ...f, max_attendees: e.target.value }))}
                  className="w-full rounded-xl border border-(--color-hairline) bg-(--color-canvas) px-3 py-2 text-sm text-(--color-ink) outline-none focus:border-(--color-primary)"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 mt-2">
                <input
                  id="ev-announce"
                  type="checkbox"
                  checked={form.postAsAnnouncement}
                  onChange={(e) => setForm((f) => ({ ...f, postAsAnnouncement: e.target.checked }))}
                  className="h-4 w-4 rounded border-(--color-hairline) text-(--color-primary) focus:ring-(--color-primary)"
                />
                <label htmlFor="ev-announce" className="text-sm font-medium text-(--color-ink)">
                  Also post as an Announcement to the platform feed
                </label>
              </div>
            </div>
            {createError && <p className="text-sm text-rose-400">{createError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreate()}
                className="inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? "Creating…" : "Create Event"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl border border-(--color-hairline) px-5 py-2.5 text-sm font-semibold text-(--color-muted) hover:bg-(--color-surface-soft) transition-colors"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-(--color-muted) mb-4">Upcoming Events</h2>
          {upcoming.length === 0 ? (
            <EmptyState text="No upcoming events scheduled." />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 snap-x snap-mandatory">
            {upcoming.map((event) => {
              const badge = TYPE_BADGE[event.type] ?? { label: event.type, cls: "bg-(--color-surface-soft) text-(--color-muted)" };
              const isRsvping = rsvping === event.id;
              return (
                <article
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="rounded-2xl border border-(--color-hairline) bg-(--color-canvas) overflow-hidden shrink-0 w-[340px] snap-start flex flex-col cursor-pointer hover:border-(--color-primary)/50 transition-colors"
                >
                  {/* Top accent strip */}
                  <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {event.registered && (
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              ✓ RSVP'd
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-(--color-ink)">{event.title}</h3>
                      </div>
                    </div>

                    {/* Date / time / location */}
                    <div className="mt-3 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-(--color-body)">
                        <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(event.starts_at)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-(--color-body)">
                        <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTimeRange(event.starts_at, event.ends_at)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm text-(--color-body)">
                          <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.location}
                        </div>
                      )}
                    </div>

                    {/* Removed inline description to save space */}

                    <div className="mt-auto pt-5 flex flex-wrap gap-3">
                      {event.registered ? (
                        <>
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
                            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-semibold text-emerald-400">RSVP Confirmed</span>
                          </div>
                          {!event.attended && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); void handleAttendance(event.id); }}
                              className="rounded-xl border border-(--color-hairline) px-4 py-2.5 text-sm font-semibold text-(--color-muted) hover:bg-(--color-surface-soft) transition-colors z-10"
                            >
                              Mark as attended
                            </button>
                          )}
                          {event.attended && (
                            <span className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 text-sm font-semibold text-indigo-400">
                              Attended ✓
                            </span>
                          )}
                        </>
                      ) : (
                        <a
                          href="https://exoasia.org/foundersarena"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-2 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity z-10"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          RSVP
                        </a>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-(--color-hairline) flex items-center gap-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-(--color-muted)">Share</span>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <a
                          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent("https://exoasia.org/foundersarena")}&title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(`Join me at ${event.title} on ${formatDate(event.starts_at)}!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--color-muted) hover:text-[#0A66C2] transition-colors"
                        >
                          LinkedIn
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me at ${event.title} on ${formatDate(event.starts_at)}!`)}&url=${encodeURIComponent("https://exoasia.org/foundersarena")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--color-muted) hover:text-[#1DA1F2] transition-colors"
                        >
                          Twitter
                        </a>
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://exoasia.org/foundersarena")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-(--color-muted) hover:text-[#1877F2] transition-colors"
                        >
                          Facebook
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-(--color-muted) mb-3">Past Events</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 snap-x snap-mandatory">
            {past.map((event) => (
              <article
                key={event.id}
                className="shrink-0 w-56 snap-start flex items-center justify-between gap-3 rounded-xl border border-(--color-hairline) bg-(--color-surface-soft) px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-(--color-ink)">{event.title}</p>
                  <p className="mt-0.5 text-xs text-(--color-muted)">
                    {new Date(event.starts_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-(--color-surface-soft) border border-(--color-hairline) px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--color-muted)">
                  Past
                </span>
              </article>
            ))}
            </div>
          </section>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-2xl bg-(--color-canvas) rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-(--color-hairline)" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-(--color-hairline) flex items-start justify-between gap-4">
              <h3 className="text-xl font-bold text-(--color-ink)">{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-(--color-muted) hover:text-(--color-ink) transition-colors p-1 -m-1">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                 </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-(--color-body)">
                  <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(selectedEvent.starts_at)}
                </div>
                <div className="flex items-center gap-2 text-sm text-(--color-body)">
                  <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTimeRange(selectedEvent.starts_at, selectedEvent.ends_at)}
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-(--color-body)">
                    <svg className="h-4 w-4 shrink-0 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedEvent.location}
                  </div>
                )}
              </div>
              <div className="text-base text-(--color-body) whitespace-pre-wrap leading-relaxed">
                {selectedEvent.description || "No description provided."}
              </div>
            </div>
            <div className="p-4 border-t border-(--color-hairline) bg-(--color-surface-soft) flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-xl bg-(--color-ink) px-5 py-2.5 text-sm font-bold text-(--color-canvas) hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-(--color-hairline) border-dashed bg-(--color-surface-soft) p-10 text-center text-sm text-(--color-muted)">
      {text}
    </div>
  );
}
