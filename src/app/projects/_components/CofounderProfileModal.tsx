"use client";

import { useRef } from "react";

export type CofounderProfile = {
  cofounder_profile_id: string;
  profile: {
    full_name: string | null;
    business_name: string | null;
    email: string | null;
    role_title: string | null;
    short_bio: string | null;
    sector: string | null;
    city: string | null;
    linkedin_url: string | null;
  } | null;
};

type Props = {
  cofounder: CofounderProfile;
  onClose: () => void;
};

export function CofounderProfileModal({ cofounder, onClose }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const p = cofounder.profile;

  const displayName = p?.full_name || p?.business_name || "Team member";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-6 shadow-2xl">
        {/* Close */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20 text-xl font-bold text-violet-300">
            {initials}
          </div>
          <div>
            <p className="text-base font-bold text-[#F4F4FF]">{displayName}</p>
            {p?.role_title && (
              <p className="mt-0.5 text-xs text-[#8B8BA7]">{p.role_title}</p>
            )}
            <span className="mt-1 inline-block rounded-full bg-violet-500/15 px-3 py-0.5 text-[10px] font-semibold text-violet-400">
              Co-founder
            </span>
          </div>
        </div>

        {/* Bio */}
        {p?.short_bio && (
          <p className="mt-4 text-center text-sm leading-relaxed text-[#8B8BA7]">
            {p.short_bio}
          </p>
        )}

        {/* Details grid */}
        {(p?.sector || p?.city) && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {p?.sector && (
              <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B8BA7]">Sector</p>
                <p className="mt-0.5 text-xs font-medium text-[#F4F4FF]">{p.sector}</p>
              </div>
            )}
            {p?.city && (
              <div className="rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8B8BA7]">Location</p>
                <p className="mt-0.5 text-xs font-medium text-[#F4F4FF]">{p.city}</p>
              </div>
            )}
          </div>
        )}

        {/* LinkedIn */}
        {p?.linkedin_url && (
          <a
            href={p.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-4 py-2.5 text-sm font-semibold text-[#F4F4FF] transition hover:border-violet-500/40 hover:bg-violet-500/5"
          >
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            View LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
