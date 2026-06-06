"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../../providers";

async function readResponsePayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as { error?: string; success?: boolean };
  } catch {
    return null;
  }
}

export default function ManualMatchPage() {
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [summary, setSummary] = useState("");
  const [fitScore, setFitScore] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, business_name, full_name, stage, verification_status")
        .in("verification_status", ["pending", "verified"])
        .limit(200);

      setProfiles(profileRows ?? []);
    };

    void load();
  }, [supabase]);

  if (role !== "advisor" && role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-[var(--color-body)]">
            You are not authorized to access this page.
          </p>
          <Link
            href="/dashboard"
            className="text-[var(--color-primary)] hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!a || !b || a === b) {
      setMessage("Please select two different members.");
      return;
    }
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/matching/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_a_id: a,
          member_b_id: b,
          summary: summary.trim() || "",
          fit_score: fitScore ? Number(fitScore) : 0,
        }),
      });

      const payload = await readResponsePayload(res);
      setBusy(false);
      if (!res.ok) {
        setMessage(payload?.error || "Failed to create match.");
        return;
      }
    } catch (e: any) {
      setBusy(false);
      setMessage(e.message || "Failed to create match.");
      return;
    }

    setMessage("Manual match created.");
    setA("");
    setB("");
    setSummary("");
    setFitScore("");
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
        <h1 className="text-2xl font-700 text-[var(--color-ink)]">
          Advisor — Create Manual Match
        </h1>
        <p className="mt-2 text-sm text-[var(--color-body)]">
          Select two members to create a manual match recommendation.
        </p>

        {message && (
          <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
            {message}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="member-a" className="block text-sm font-600 text-[var(--color-ink)]">
              Member A
            </label>
            <select
              id="member-a"
              className="gn-input mt-1"
              value={a}
              onChange={(e) => setA(e.target.value)}
            >
              <option value="">Choose member A</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name || p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="member-b" className="block text-sm font-600 text-[var(--color-ink)]">
              Member B
            </label>
            <select
              id="member-b"
              className="gn-input mt-1"
              value={b}
              onChange={(e) => setB(e.target.value)}
            >
              <option value="">Choose member B</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name || p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="match-summary" className="block text-sm font-600 text-[var(--color-ink)]">
              Summary (optional)
            </label>
            <input
              id="match-summary"
              className="gn-input mt-1"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief reason for this match"
            />
          </div>

          <div>
            <label htmlFor="fit-score" className="block text-sm font-600 text-[var(--color-ink)]">
              Fit score (0-100)
            </label>
            <input
              id="fit-score"
              className="gn-input mt-1"
              value={fitScore}
              onChange={(e) => setFitScore(e.target.value)}
              type="number"
              min={0}
              max={100}
              placeholder="0"
            />
          </div>

          <div className="mt-4">
            <button
              className="gn-btn-primary"
              disabled={busy}
              onClick={handleCreate}
            >
              {busy ? "Creating..." : "Create manual match"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
