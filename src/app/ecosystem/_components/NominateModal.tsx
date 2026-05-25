"use client";

import { useRef, useState } from "react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export function NominateModal({ onClose, onSuccess }: Props) {
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/ecosystem/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), message: message.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Failed to send invite. Please try again.");
        setBusy(false);
        return;
      }
      setSent(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#2A2A3E] bg-[#12121A] p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Portfolio</p>
            <h2 className="mt-0.5 text-lg font-bold text-[#F4F4FF]">Nominate a Startup</h2>
            <p className="mt-1 text-xs text-[#8B8BA7]">
              They'll receive an invite link to join and be linked to your portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-0.5 shrink-0 rounded-lg p-1 text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#F4F4FF]">Invite sent!</p>
            <p className="text-xs text-[#8B8BA7]">
              {email} will receive an invite link valid for 14 days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="nominate-email" className="block text-xs font-semibold text-[#F4F4FF]">
                Startup email <span className="text-rose-400">*</span>
              </label>
              <input
                id="nominate-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@startup.com"
                className="mt-1.5 w-full rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-sm text-[#F4F4FF] placeholder-[#4A4A6A] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              />
            </div>

            <div>
              <label htmlFor="nominate-message" className="block text-xs font-semibold text-[#F4F4FF]">
                Personal message <span className="text-[#8B8BA7] font-normal">(optional)</span>
              </label>
              <textarea
                id="nominate-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell them why you're nominating them…"
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-sm text-[#F4F4FF] placeholder-[#4A4A6A] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
