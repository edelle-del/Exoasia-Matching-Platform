"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";
import { getClientContext } from "@/lib/client-context";

type CofounderInvite = {
  id: string;
  token: string;
  uid_type: "email" | "phone";
  uid_value: string;
  status: string;
  created_at: string;
  expires_at: string;
  project_id: string | null;
};

type Project = {
  id: string;
  name: string;
};

type CofounderLink = {
  id: string;
  cofounder_profile_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    business_name: string | null;
    email: string | null;
  } | null;
};

// ─── Matching profile renderer ────────────────────────────────────────────────

type V2Investor = {
  _v: 2;
  investor_type?: string;
  entity_class?: string[];
  investment_interests?: string[];
  target_regions?: string[];
  target_industries?: string[];
  target_stages?: string[];
  lp_check_min?: string;
  lp_check_max?: string;
  direct_check_min?: string;
  direct_check_max?: string;
};

type V2Startup = {
  _v: 2;
  target_regions?: string[];
  target_industries?: string[];
  fundraising_stage?: string;
  target_raise_min?: string;
  target_raise_max?: string;
};

type V2EcosystemPartner = {
  _v: 2;
  support_types?: string[]; // stores organization_type selections
  target_industries?: string[];
  target_regions?: string[];
  target_stages?: string[];
};

function parseV2(
  raw: string | null | undefined,
): V2Investor | V2Startup | null {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (parsed?._v === 2) return parsed;
  } catch {
    /* legacy */
  }
  return null;
}

function ProfileTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-(--color-primary)/10 px-2.5 py-0.5 text-xs font-medium text-(--color-primary)">
      {children}
    </span>
  );
}

function ProfileRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
        {label}
      </p>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-(--color-muted)">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <ProfileTag key={item}>{item}</ProfileTag>
      ))}
    </div>
  );
}

function CheckRange({ min, max }: { min?: string; max?: string }) {
  if (!min && !max) return <p className="text-sm text-(--color-muted)">—</p>;
  return (
    <p className="text-sm font-medium text-(--color-ink)">
      ${min || "—"} – ${max || "—"}
    </p>
  );
}

function InvestorMatchingProfile({ data }: { data: V2Investor }) {
  const hasLp = !!(data.lp_check_min || data.lp_check_max);
  return (
    <div className="space-y-5">
      {data.investor_type && (
        <ProfileRow label="Investor Type">
          <ProfileTag>{data.investor_type}</ProfileTag>
        </ProfileRow>
      )}
      {!!data.entity_class?.length && (
        <ProfileRow label="Entity Class">
          <TagList items={data.entity_class} />
        </ProfileRow>
      )}
      {!!data.investment_interests?.length && (
        <ProfileRow label="Investment Interests">
          <TagList items={data.investment_interests} />
        </ProfileRow>
      )}
      {!!data.target_regions?.length && (
        <ProfileRow label="Target Regions">
          <TagList items={data.target_regions} />
        </ProfileRow>
      )}
      {!!data.target_industries?.length && (
        <ProfileRow label="Target Industries">
          <TagList items={data.target_industries} />
        </ProfileRow>
      )}
      {!!data.target_stages?.length && (
        <ProfileRow label="Target Stage">
          <TagList items={data.target_stages} />
        </ProfileRow>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {hasLp && (
          <ProfileRow label="LP Investment Check Size">
            <CheckRange min={data.lp_check_min} max={data.lp_check_max} />
          </ProfileRow>
        )}
        <ProfileRow label="Direct Startup Check Size">
          <CheckRange min={data.direct_check_min} max={data.direct_check_max} />
        </ProfileRow>
      </div>
    </div>
  );
}

function StartupMatchingProfile({ data }: { data: V2Startup }) {
  return (
    <div className="space-y-5">
      {!!data.target_regions?.length && (
        <ProfileRow label="Target Regions">
          <TagList items={data.target_regions} />
        </ProfileRow>
      )}
      {!!data.target_industries?.length && (
        <ProfileRow label="Industries">
          <TagList items={data.target_industries} />
        </ProfileRow>
      )}
      {data.fundraising_stage && (
        <ProfileRow label="Fundraising Stage">
          <ProfileTag>{data.fundraising_stage}</ProfileTag>
        </ProfileRow>
      )}
      <ProfileRow label="Target Raise Amount">
        <CheckRange min={data.target_raise_min} max={data.target_raise_max} />
      </ProfileRow>
    </div>
  );
}

function EcosystemPartnerMatchingProfile({
  data,
}: {
  data: V2EcosystemPartner;
}) {
  return (
    <div className="space-y-5">
      {!!data.support_types?.length && (
        <ProfileRow label="Organization Type">
          <TagList items={data.support_types} />
        </ProfileRow>
      )}
      {!!data.target_industries?.length && (
        <ProfileRow label="Sector Focus">
          <TagList items={data.target_industries} />
        </ProfileRow>
      )}
      {!!data.target_regions?.length && (
        <ProfileRow label="Target Regions">
          <TagList items={data.target_regions} />
        </ProfileRow>
      )}
      {!!data.target_stages?.length && (
        <ProfileRow label="Stage Preference">
          <TagList items={data.target_stages} />
        </ProfileRow>
      )}
    </div>
  );
}
export default function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [invites, setInvites] = useState<CofounderInvite[]>([]);
  const [cofounders, setCofounders] = useState<CofounderLink[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [inviteUidType, setInviteUidType] = useState<"email" | "phone">(
    "email",
  );
  const [inviteUidValue, setInviteUidValue] = useState("");
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportDragging, setReportDragging] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportUploading, setReportUploading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const handleReportFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setReportError("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReportError("File must be under 10 MB.");
      return;
    }
    setReportFile(file);
    setReportError("");
    setReportSuccess(false);
  };

  const handleReportUpload = async () => {
    if (!reportFile) return;
    setReportUploading(true);
    setReportError("");
    setReportSuccess(false);
    try {
      const form = new FormData();
      form.append("file", reportFile);
      const res = await fetch("/api/venture-readiness/parse", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setReportError(json?.error ?? "Upload failed. Please try again.");
        return;
      }
      const primaryProject = projects[0];
      if (!primaryProject) {
        setReportError(
          "Create a project first so the report can be attached to it.",
        );
        return;
      }

      const { error: saveError } = await supabase
        .from("projects")
        .update({ venture_readiness_report: json.data })
        .eq("id", primaryProject.id);
      if (saveError) {
        setReportError("Parsed but failed to save. Please try again.");
        return;
      }
      setReportSuccess(true);
      setReportFile(null);
      void loadProfile();
    } catch {
      setReportError("Network error. Please try again.");
    } finally {
      setReportUploading(false);
    }
  };

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
  }, [supabase, user?.id]);

  const loadCofounders = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch("/api/cofounders");
    if (res.ok) {
      const data = await res.json();
      setInvites(data.invites ?? []);
      setCofounders(data.cofounders ?? []);
    }
  }, [user?.id]);

  const loadProjects = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(
        (data.projects ?? []).map((p: any) => ({ id: p.id, name: p.name })),
      );
    }
  }, [user?.id]);

  const copyInviteLink = (token: string) => {
    const siteUrl = window.location.origin;
    navigator.clipboard
      .writeText(`${siteUrl}/accept-invite?token=${token}`)
      .then(() => {
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      });
  };

  const handleInviteCofounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    if (!inviteUidValue.trim()) {
      setInviteError("Please enter an email or phone number.");
      return;
    }
    setInviteLoading(true);
    const ctx = await getClientContext();
    const res = await fetch("/api/cofounders/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid_type: inviteUidType,
        uid_value: inviteUidValue.trim(),
        project_id: inviteProjectId || null,
        client_context: ctx,
      }),
    });
    setInviteLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setInviteError(data?.error ?? "Failed to send invite.");
      return;
    }
    setInviteSuccess(`Invite sent to ${inviteUidValue.trim()}.`);
    setInviteUidValue("");
    void loadCofounders();
  };

  const handleCancelInvite = async (inviteId: string) => {
    const res = await fetch("/api/cofounders/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (res.ok) void loadCofounders();
  };

  useEffect(() => {
    void loadProfile();
    void loadCofounders();
    void loadProjects();
  }, [loadProfile, loadCofounders, loadProjects]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          void loadProfile();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadProfile, supabase, user?.id]);

  return (
    <div className="min-h-screen bg-(--color-canvas)">
      <section className="px-4 sm:px-6 pt-16 pb-0">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Founders Arena</p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight text-(--color-ink)">
                Profile
              </h1>
              <p className="mt-1 text-sm text-(--color-muted)">
                {profile?.full_name || "Member profile"} · Stage{" "}
                {profile?.stage || "0"}
              </p>
              {profile?.business_name && (
                <p className="mt-1 text-sm text-(--color-muted)">
                  {profile.business_name}
                </p>
              )}
            </div>
            <Link
              href="/account-settings"
              className="mt-1 shrink-0 whitespace-nowrap rounded-xl border border-(--color-hairline) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
            >
              Account Settings
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 pt-6 pb-10">
        <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
          <h2 className="text-lg font-semibold text-(--color-ink)">
            Business summary
          </h2>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.business_name || "Business name pending"}
          </p>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.short_bio || "No bio yet"}
          </p>
          <p className="mt-2 text-sm text-(--color-body)">
            {profile?.sector
              ? profile.sector.split(",").filter(Boolean).join(", ")
              : "Sector pending"}{" "}
            · {profile?.city || "City pending"}
          </p>
        </section>

        {(() => {
          const v2 = parseV2(profile?.asks_summary);
          const roleLabel =
            profile?.member_role === "investor"
              ? "Investor"
              : profile?.member_role === "startup"
                ? "Founder"
                : profile?.member_role === "ecosystem_partner"
                  ? "Ecosystem Partner"
                  : "Member";

          if (!v2) return null;

          return (
            <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                Structured matching profile
              </p>
              <h2 className="mt-1 text-lg font-semibold text-(--color-ink)">
                {roleLabel} matching preferences
              </h2>
              <div className="mt-4">
                {profile?.member_role === "investor" && (
                  <InvestorMatchingProfile data={v2 as V2Investor} />
                )}
                {profile?.member_role === "startup" && (
                  <StartupMatchingProfile data={v2 as V2Startup} />
                )}
                {profile?.member_role === "ecosystem_partner" && (
                  <p className="text-sm text-(--color-muted)">
                    No structured matching profile is available yet.
                  </p>
                )}
              </div>
            </section>
          );
        })()}

        {profile?.member_role === "startup" && (
          <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                  Venture Confidence Assessment
                </p>
                <h2 className="mt-1 text-lg font-semibold text-(--color-ink)">
                  Project-centered startup setup
                </h2>
                <p className="mt-1 text-sm text-(--color-body)">
                  Create your startup/project profile first. The Venture
                  Confidence Assessment belongs on the project record, so the
                  report stays tied to the actual venture entity.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/projects/new"
                className="gn-btn-primary whitespace-nowrap"
              >
                Register a project
              </Link>
              <Link
                href="/matches"
                className="inline-flex h-[46px] items-center justify-center whitespace-nowrap rounded-xl border border-(--color-hairline) px-4 text-sm font-semibold text-(--color-ink) hover:bg-(--color-surface-soft) transition-colors"
              >
                View projects
              </Link>
            </div>
            <p className="mt-4 text-xs text-(--color-muted)">
              Reports are AI-generated by Exoasia Intelligence and are not
              investment endorsements.
            </p>
          </section>
        )}

        {profile?.member_role === "startup" && (
          <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
                  Data Room
                </p>
                <h2 className="mt-1 text-lg font-semibold text-(--color-ink)">
                  Your data room
                </h2>
                <p className="mt-1 text-sm text-(--color-body)">
                  Upload pitch decks, financials, and other documents for
                  investors. They must request access before viewing your files.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <Link
                href="/data-room"
                className="gn-btn-primary whitespace-nowrap"
              >
                Manage data room →
              </Link>
            </div>
          </section>
        )}

        {profile?.member_role === "startup" && (
          <section className="rounded-[16px] border border-(--color-hairline) bg-(--color-canvas) p-6">
            <h2 className="text-lg font-semibold text-(--color-ink)">
              My Team / Cofounders
            </h2>
            <p className="mt-1 text-sm text-(--color-body)">
              Invite cofounders by email or phone number. They&apos;ll receive a
              link to join your team.
            </p>

            {cofounders.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
                  Linked Cofounders
                </p>
                {cofounders.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-(--color-hairline) px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-(--color-ink)">
                        {c.profile?.full_name ||
                          c.profile?.email ||
                          "Team member"}
                      </p>
                      {c.profile?.business_name && (
                        <p className="text-xs text-(--color-muted)">
                          {c.profile.business_name}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}

            {invites.filter((i) => i.status === "pending").length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted)">
                  Pending Invites
                </p>
                {invites
                  .filter((i) => i.status === "pending")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-(--color-hairline) px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-(--color-ink)">
                            {inv.uid_value}
                          </p>
                          <p className="text-xs text-(--color-muted)">
                            via {inv.uid_type} · expires{" "}
                            {new Date(inv.expires_at).toLocaleDateString()}
                            {inv.project_id &&
                              projects.find((p) => p.id === inv.project_id) && (
                                <>
                                  {" "}
                                  ·{" "}
                                  {
                                    projects.find(
                                      (p) => p.id === inv.project_id,
                                    )!.name
                                  }
                                </>
                              )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(inv.id)}
                          className="whitespace-nowrap text-xs text-red-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                      {inv.uid_type === "email" && (
                        <button
                          type="button"
                          onClick={() => copyInviteLink(inv.token)}
                          className="mt-2 whitespace-nowrap text-xs text-(--color-primary) hover:underline"
                        >
                          {copiedToken === inv.token
                            ? "Copied!"
                            : "Copy invite link"}
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <form onSubmit={handleInviteCofounder} className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-(--color-ink)">
                Invite a cofounder
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteUidType("email")}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    inviteUidType === "email"
                      ? "border-(--color-primary) bg-(--color-primary) text-white"
                      : "border-(--color-hairline) text-(--color-body) hover:border-(--color-primary) hover:text-(--color-primary)"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setInviteUidType("phone")}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                    inviteUidType === "phone"
                      ? "border-(--color-primary) bg-(--color-primary) text-white"
                      : "border-(--color-hairline) text-(--color-body) hover:border-(--color-primary) hover:text-(--color-primary)"
                  }`}
                >
                  Phone
                </button>
              </div>
              {projects.length > 0 && (
                <select
                  aria-label="Select project for invite"
                  className="gn-input w-full"
                  value={inviteProjectId}
                  onChange={(e) => setInviteProjectId(e.target.value)}
                >
                  <option value="">Select project (optional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <input
                  type={inviteUidType === "email" ? "email" : "tel"}
                  className="gn-input flex-1"
                  value={inviteUidValue}
                  onChange={(e) => {
                    setInviteUidValue(e.target.value);
                    setInviteError("");
                  }}
                  placeholder={
                    inviteUidType === "email"
                      ? "cofounder@email.com"
                      : "+63 912 345 6789"
                  }
                />
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="gn-btn-primary whitespace-nowrap disabled:opacity-50"
                >
                  {inviteLoading ? "Sending..." : "Send invite"}
                </button>
              </div>
              {inviteUidType === "email" && (
                <p className="text-xs text-(--color-muted)">
                  An invite email will be sent. You can also copy the link from
                  the pending invites list to share manually.
                </p>
              )}
              {inviteError && (
                <p className="text-xs text-red-600">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-xs text-green-600">{inviteSuccess}</p>
              )}
            </form>
          </section>
        )}

        <section className="flex items-center justify-between gap-4">
          <Link
            href="/onboarding"
            className="whitespace-nowrap text-sm text-(--color-primary) hover:underline"
          >
            Update your profile
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center whitespace-nowrap rounded-[10px] bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white hover:bg-(--color-primary-active)"
          >
            Purchase credits
          </Link>
        </section>
      </div>
    </div>
  );
}
