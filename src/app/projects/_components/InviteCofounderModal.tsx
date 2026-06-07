"use client";

import { useRef, useState } from "react";

type Option = "choose" | "existing" | "new";

type MemberResult = {
  id: string;
  name: string;
  sector: string | null;
};

type Props = {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function InviteCofounderModal({ projectId, onClose, onSuccess }: Props) {
  const [option, setOption] = useState<Option>("choose");
  const backdropRef = useRef<HTMLDivElement>(null);

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
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B8BA7]">Team</p>
            <h2 className="mt-0.5 text-lg font-bold text-[#F4F4FF]">Invite Cofounder</h2>
            <p className="mt-1 text-xs text-[#8B8BA7]">
              {option === "choose"
                ? "Is this person already on the platform?"
                : option === "existing"
                  ? "Search for a member already on the platform."
                  : "Send an invite link to someone not yet on the platform."}
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

        {option === "choose" && (
          <ChooseStep onSelect={setOption} onClose={onClose} />
        )}
        {option === "existing" && (
          <ExistingMemberStep
            projectId={projectId}
            onBack={() => setOption("choose")}
            onSuccess={() => { onSuccess(); onClose(); }}
          />
        )}
        {option === "new" && (
          <NewMemberStep
            projectId={projectId}
            onBack={() => setOption("choose")}
            onSuccess={() => { onSuccess(); onClose(); }}
          />
        )}
      </div>
    </div>
  );
}

function ChooseStep({ onSelect, onClose }: { onSelect: (o: "existing" | "new") => void; onClose: () => void }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelect("existing")}
        className="w-full flex items-center gap-4 rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-4 py-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#F4F4FF]">Already on the platform</p>
          <p className="mt-0.5 text-xs text-[#8B8BA7]">Search and add an existing member as cofounder.</p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect("new")}
        className="w-full flex items-center gap-4 rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-4 py-4 text-left transition hover:border-violet-500/50 hover:bg-violet-500/5"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#F4F4FF]">Not yet on the platform</p>
          <p className="mt-0.5 text-xs text-[#8B8BA7]">Send an invite link to anyone by email.</p>
        </div>
      </button>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
      >
        Cancel
      </button>
    </div>
  );
}

function ExistingMemberStep({
  projectId,
  onBack,
  onSuccess,
}: {
  projectId: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MemberResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setSelected(null);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/ecosystem/search-startups?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { startups?: MemberResult[] };
      setResults(data.startups ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/cofounders/add-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cofounder_id: selected.id, project_id: projectId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to add cofounder."); setAdding(false); return; }
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch {
      setError("Network error. Please try again.");
      setAdding(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#F4F4FF]">Invite sent!</p>
        <p className="text-xs text-[#8B8BA7]">{selected?.name} will receive an invite to join as co-founder.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => void handleSearch(e.target.value)}
          placeholder="Search by name or business name…"
          className="w-full rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-sm text-[#F4F4FF] placeholder-[#4A4A6A] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
        />
        {searching && <p className="mt-1 text-xs text-[#8B8BA7]">Searching…</p>}
      </div>

      {results.length > 0 && !selected && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-[#2A2A3E] divide-y divide-[#2A2A3E]">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setSelected(r); setResults([]); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#1A1A26] transition"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2A2A3E] text-xs font-bold text-[#F4F4FF]">
                {r.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-[#F4F4FF]">{r.name}</p>
                {r.sector && <p className="text-xs text-[#8B8BA7]">{r.sector}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/5 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-300">
            {selected.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F4F4FF] truncate">{selected.name}</p>
            {selected.sector && <p className="text-xs text-[#8B8BA7]">{selected.sector}</p>}
          </div>
          <button type="button" aria-label="Clear selection" onClick={() => setSelected(null)} className="text-[#8B8BA7] hover:text-[#F4F4FF]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!selected || adding}
          onClick={() => void handleAdd()}
          className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add cofounder"}
        </button>
      </div>
    </div>
  );
}

function NewMemberStep({
  projectId,
  onBack,
  onSuccess,
}: {
  projectId: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cofounders/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid_type: "email",
          uid_value: email.trim().toLowerCase(),
          project_id: projectId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError((json as { error?: string }).error ?? "Failed to send invite. Please try again."); setBusy(false); return; }
      setSent(true);
      setTimeout(() => { onSuccess(); }, 1800);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#F4F4FF]">Invite sent!</p>
        <p className="text-xs text-[#8B8BA7]">{email} will receive an invite link to join as cofounder.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="cofounder-email" className="block text-xs font-semibold text-[#F4F4FF]">
          Email address <span className="text-rose-400">*</span>
        </label>
        <input
          id="cofounder-email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="mt-1.5 w-full rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-sm text-[#F4F4FF] placeholder-[#4A4A6A] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
        />
      </div>
      <div>
        <label htmlFor="cofounder-message" className="block text-xs font-semibold text-[#F4F4FF]">
          Personal message <span className="text-[#8B8BA7] font-normal">(optional)</span>
        </label>
        <textarea
          id="cofounder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell them about the project and why you'd like them as a cofounder…"
          rows={3}
          className="mt-1.5 w-full resize-none rounded-xl border border-[#2A2A3E] bg-[#1A1A26] px-3 py-2.5 text-sm text-[#F4F4FF] placeholder-[#4A4A6A] outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-[#2A2A3E] px-4 py-2.5 text-sm font-semibold text-[#8B8BA7] transition hover:bg-[#1A1A26] hover:text-[#F4F4FF]"
        >
          Back
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
  );
}
