"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

const sectorOptions = [
  "Fintech",
  "SaaS",
  "Health",
  "EdTech",
  "E-commerce",
  "Other",
];

const employeeBands = ["1-10", "11-50", "51-200", "201-500", "500+"];
const revenueRanges = [
  "Under ₱1M",
  "₱1M – ₱5M",
  "₱5M – ₱20M",
  "₱20M – ₱50M",
  "₱50M – ₱100M",
  "₱100M – ₱500M",
  "₱500M+",
];
const hearAboutOptions = [
  "Masterclass",
  "Referred by a member",
  "L&D Workshop",
  "Social Media",
  "Other",
];
const yearsOptions = ["Less than 1 year", "1-3 years", "3-5 years", "5+ years"];
const askCategoryOptions = [
  "Funding / Investment capital",
  "Business partners / Co-founders",
  "Clients / Customers",
  "Suppliers / Vendors",
  "Strategic advisors",
  "Distribution / Sales channels",
  "Joint venture opportunities",
  "Industry connections",
];
const offerCategoryOptions = [
  "Capital / Funding",
  "Industry expertise",
  "Network / Connections",
  "Technology / Systems",
  "Distribution channels",
  "Operational capacity",
  "Client base / Market access",
  "Mentorship / Advisory",
];
const businessConversationOptions = ["Yes", "Not yet", "Just exploring"];
const goalOptions = [
  "Close a specific deal",
  "Find a long-term partner",
  "Access capital",
  "Expand my network",
  "Learn and grow",
];
const dinnerOptions = ["Yes", "Maybe", "No"];

function Req() {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-500">
      Required
    </span>
  );
}

function Opt() {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-400">
      Optional
    </span>
  );
}

export default function OnboardingForm() {
  const router = useRouter();
  const supabase = createClient();
  const { role } = useAuth();
  const isAdminView = ["advisor", "admin"].includes(role ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    business_name: "",
    role_title: "",
    city: "",
    short_bio: "",
    how_heard_about: "",
    referred_by: "",
    phone_whatsapp: "",
    years_in_operation: "",
    sector: "",
    employee_band: "",
    annual_revenue_estimate: "",
    ask_categories: [] as string[],
    offer_categories: [] as string[],
    open_to_new_business_conversations: "",
    primary_goal: "",
    attend_monthly_dinner: "",
    pdpa_matching_consent: false,
    additional_notes: "",
    asks_summary: "",
    offers_summary: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) return;
        const metadataFullName =
          typeof data.user?.user_metadata?.full_name === "string"
            ? data.user.user_metadata.full_name.trim()
            : "";

        // Load existing profile if present
        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "full_name,business_name,role_title,city,short_bio,how_heard_about,referred_by,phone_whatsapp,years_in_operation,sector,employee_band,annual_revenue_estimate,ask_categories,offer_categories,asks_summary,offers_summary,open_to_new_business_conversations,primary_goal,attend_monthly_dinner,pdpa_matching_consent,additional_notes",
          )
          .eq("id", userId)
          .single();

        if (profile && mounted) {
          const existingName = (profile.full_name ?? metadataFullName) || "";
          const spaceIdx = existingName.indexOf(" ");
          const loadedFirst = spaceIdx >= 0 ? existingName.slice(0, spaceIdx) : existingName;
          const loadedLast = spaceIdx >= 0 ? existingName.slice(spaceIdx + 1) : "";
          setForm((prev) => ({
            ...prev,
            first_name: loadedFirst || prev.first_name,
            last_name: loadedLast || prev.last_name,
            business_name: profile.business_name ?? prev.business_name,
            role_title: profile.role_title ?? prev.role_title,
            city: profile.city ?? prev.city,
            short_bio: profile.short_bio ?? prev.short_bio,
            how_heard_about: profile.how_heard_about ?? prev.how_heard_about,
            referred_by: profile.referred_by ?? prev.referred_by,
            phone_whatsapp: profile.phone_whatsapp ?? prev.phone_whatsapp,
            years_in_operation:
              profile.years_in_operation ?? prev.years_in_operation,
            sector: profile.sector ?? prev.sector,
            employee_band: profile.employee_band ?? prev.employee_band,
            annual_revenue_estimate:
              profile.annual_revenue_estimate ?? prev.annual_revenue_estimate,
            ask_categories: profile.ask_categories ?? prev.ask_categories,
            offer_categories: profile.offer_categories ?? prev.offer_categories,
            open_to_new_business_conversations:
              profile.open_to_new_business_conversations ??
              prev.open_to_new_business_conversations,
            primary_goal: profile.primary_goal ?? prev.primary_goal,
            attend_monthly_dinner:
              profile.attend_monthly_dinner ?? prev.attend_monthly_dinner,
            pdpa_matching_consent:
              profile.pdpa_matching_consent ?? prev.pdpa_matching_consent,
            additional_notes: profile.additional_notes ?? prev.additional_notes,
            asks_summary: profile.asks_summary ?? prev.asks_summary,
            offers_summary: profile.offers_summary ?? prev.offers_summary,
          }));
          return;
        }

        if (mounted && metadataFullName) {
          const spaceIdx = metadataFullName.indexOf(" ");
          const metaFirst = spaceIdx >= 0 ? metadataFullName.slice(0, spaceIdx) : metadataFullName;
          const metaLast = spaceIdx >= 0 ? metadataFullName.slice(spaceIdx + 1) : "";
          setForm((prev) =>
            prev.first_name.trim()
              ? prev
              : { ...prev, first_name: metaFirst, last_name: metaLast },
          );
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const toggleCategory = (
    field: "ask_categories" | "offer_categories",
    value: string,
    maxSelected = 3,
  ) => {
    setForm((prev) => {
      const selected = prev[field];
      const exists = selected.includes(value);
      if (exists) {
        return { ...prev, [field]: selected.filter((item) => item !== value) };
      }
      if (selected.length >= maxSelected) {
        return prev;
      }
      return { ...prev, [field]: [...selected, value] };
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Client-side validation
    if (!form.first_name.trim()) {
      setError("First name is required.");
      setLoading(false);
      return;
    }
    if (!form.last_name.trim()) {
      setError("Last name is required.");
      setLoading(false);
      return;
    }
    if (!form.business_name.trim()) {
      setError("Business name is required.");
      setLoading(false);
      return;
    }
    if (!form.sector) {
      setError("Please choose a sector.");
      setLoading(false);
      return;
    }
    if (!form.how_heard_about) {
      setError("Please tell us how you heard about The Growth Network.");
      setLoading(false);
      return;
    }
    if (
      form.how_heard_about === "Referred by a member" &&
      !form.referred_by.trim()
    ) {
      setError("Please add the name of the person who referred you.");
      setLoading(false);
      return;
    }
    if (!form.phone_whatsapp.trim()) {
      setError("Phone Number / WhatsApp is required.");
      setLoading(false);
      return;
    }
    if (!form.years_in_operation) {
      setError("Please select your years in operation.");
      setLoading(false);
      return;
    }
    if (!form.employee_band) {
      setError("Please select your employee band.");
      setLoading(false);
      return;
    }
    if (!form.annual_revenue_estimate) {
      setError("Please select your annual revenue range.");
      setLoading(false);
      return;
    }
    if (!isAdminView && form.ask_categories.length === 0) {
      setError("Please select at least one ASK category.");
      setLoading(false);
      return;
    }
    if (!isAdminView && form.offer_categories.length === 0) {
      setError("Please select at least one OFFER category.");
      setLoading(false);
      return;
    }
    if (!form.open_to_new_business_conversations) {
      setError("Please tell us if you're open to new business conversations.");
      setLoading(false);
      return;
    }
    if (!form.primary_goal) {
      setError("Please choose your primary goal for joining.");
      setLoading(false);
      return;
    }
    if (!form.attend_monthly_dinner) {
      setError(
        "Please tell us if you are willing to attend the monthly dinner.",
      );
      setLoading(false);
      return;
    }
    if (!form.pdpa_matching_consent) {
      setError("You must agree to the data privacy consent to continue.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        business_name: form.business_name.trim(),
        role_title: form.role_title.trim() || undefined,
        city: form.city.trim() || undefined,
        short_bio: form.short_bio.trim() || undefined,
        how_heard_about: form.how_heard_about,
        referred_by: form.referred_by.trim() || undefined,
        phone_whatsapp: form.phone_whatsapp.trim(),
        years_in_operation: form.years_in_operation,
        sector: form.sector || undefined,
        employee_band: form.employee_band,
        annual_revenue_estimate: form.annual_revenue_estimate,
        ask_categories: form.ask_categories,
        offer_categories: form.offer_categories,
        open_to_new_business_conversations:
          form.open_to_new_business_conversations,
        primary_goal: form.primary_goal,
        attend_monthly_dinner: form.attend_monthly_dinner,
        pdpa_matching_consent: form.pdpa_matching_consent,
        additional_notes: form.additional_notes.trim() || undefined,
        asks_summary: form.asks_summary.trim() || undefined,
        offers_summary: form.offers_summary.trim() || undefined,
      };

      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Save failed");
      }

      setSuccess("Profile and matching signals saved.");
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err: any) {
      setError(err?.message ?? "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
      <div className="mx-auto max-w-[900px] rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
        <h1 className="text-2xl font-700 text-[var(--color-ink)]">
          Get started â€” complete your matching profile
        </h1>
        <p className="mt-2 text-sm text-[var(--color-body)]">
          Provide the key details we use to generate curated strategic matches
          for you.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                First name <Req />
              </label>
              <input
                id="first_name"
                className="gn-input mt-1"
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="last_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Last name <Req />
              </label>
              <input
                id="last_name"
                className="gn-input mt-1"
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="business_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Business name <Req />
            </label>
            <input
              id="business_name"
              className="gn-input mt-1"
              value={form.business_name}
              onChange={(e) => handleChange("business_name", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="how_heard_about" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                How did you hear about The Growth Network? <Req />
              </label>
              <select
                id="how_heard_about"
                className="gn-input mt-1"
                value={form.how_heard_about}
                onChange={(e) =>
                  handleChange("how_heard_about", e.target.value)
                }
              >
                <option value="">Select one</option>
                {hearAboutOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="referred_by" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                If referred, who referred you?{" "}
                {form.how_heard_about === "Referred by a member" ? <Req /> : <Opt />}
              </label>
              <input
                id="referred_by"
                className="gn-input mt-1"
                value={form.referred_by}
                onChange={(e) => handleChange("referred_by", e.target.value)}
                placeholder="Referral name"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="phone_whatsapp" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Phone Number / WhatsApp <Req />
              </label>
              <input
                id="phone_whatsapp"
                className="gn-input mt-1"
                value={form.phone_whatsapp}
                onChange={(e) => handleChange("phone_whatsapp", e.target.value)}
                placeholder="+63..."
              />
            </div>
            <div>
              <label htmlFor="years_in_operation" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Years in Operation <Req />
              </label>
              <select
                id="years_in_operation"
                className="gn-input mt-1"
                value={form.years_in_operation}
                onChange={(e) =>
                  handleChange("years_in_operation", e.target.value)
                }
              >
                <option value="">Select one</option>
                {yearsOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="role_title" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Role / title <Opt />
              </label>
              <input
                id="role_title"
                className="gn-input mt-1"
                value={form.role_title}
                onChange={(e) => handleChange("role_title", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="city" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                City <Opt />
              </label>
              <input
                id="city"
                className="gn-input mt-1"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sector" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Sector <Req />
              </label>
              <select
                id="sector"
                className="gn-input mt-1"
                value={form.sector}
                onChange={(e) => handleChange("sector", e.target.value)}
              >
                <option value="">Choose sector</option>
                {sectorOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="short_bio" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Short bio (1â€“2 sentences) <Opt />
            </label>
            <textarea
              id="short_bio"
              className="gn-input mt-1 h-24"
              value={form.short_bio}
              onChange={(e) => handleChange("short_bio", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="employee_band" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Employee band <Req />
              </label>
              <select
                id="employee_band"
                className="gn-input mt-1"
                value={form.employee_band}
                onChange={(e) => handleChange("employee_band", e.target.value)}
              >
                <option value="">Choose band</option>
                {employeeBands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="annual_revenue_estimate" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Annual revenue (estimate) <Req />
              </label>
              <select
                id="annual_revenue_estimate"
                className="gn-input mt-1"
                value={form.annual_revenue_estimate}
                onChange={(e) =>
                  handleChange("annual_revenue_estimate", e.target.value)
                }
              >
                <option value="">Choose range</option>
                {revenueRanges.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isAdminView && (
            <>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  What are you currently looking for? (Pick up to 3) <Req />
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {askCategoryOptions.map((option) => {
                    const selected = form.ask_categories.includes(option);
                    return (
                      <label
                        key={option}
                        className="flex items-start gap-2 text-sm text-[var(--color-body)]"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected}
                          onChange={() => toggleCategory("ask_categories", option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  What do you bring to the table? (Pick up to 3) <Req />
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {offerCategoryOptions.map((option) => {
                    const selected = form.offer_categories.includes(option);
                    return (
                      <label
                        key={option}
                        className="flex items-start gap-2 text-sm text-[var(--color-body)]"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected}
                          onChange={() => toggleCategory("offer_categories", option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="asks_summary" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  ASKS summary <Opt />
                </label>
                <p className="text-xs text-[var(--color-muted)]">
                  Describe in 1-2 sentences what you are currently looking for.
                </p>
                <textarea
                  id="asks_summary"
                  className="gn-input mt-2 h-28"
                  value={form.asks_summary}
                  onChange={(e) => handleChange("asks_summary", e.target.value)}
                  placeholder="For example: We are looking for strategic advisors and a distribution partner..."
                />
              </div>

              <div>
                <label htmlFor="offers_summary" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  OFFERS summary <Opt />
                </label>
                <p className="text-xs text-[var(--color-muted)]">
                  Describe in 1-2 sentences what you bring to the table.
                </p>
                <textarea
                  id="offers_summary"
                  className="gn-input mt-2 h-28"
                  value={form.offers_summary}
                  onChange={(e) => handleChange("offers_summary", e.target.value)}
                  placeholder="For example: We bring enterprise clients, operational expertise, and a strong partner network..."
                />
              </div>
            </>
          )}

          <div>
            <h3 className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Are you currently open to new business conversations? <Req />
            </h3>
            <div className="mt-3 flex flex-wrap gap-4">
              {businessConversationOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 text-sm text-[var(--color-body)]"
                >
                  <input
                    type="radio"
                    name="open_to_new_business_conversations"
                    checked={form.open_to_new_business_conversations === option}
                    onChange={() =>
                      handleChange("open_to_new_business_conversations", option)
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="primary_goal" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                What is your primary goal for joining? <Req />
              </label>
              <select
                id="primary_goal"
                className="gn-input mt-1"
                value={form.primary_goal}
                onChange={(e) => handleChange("primary_goal", e.target.value)}
              >
                <option value="">Select one</option>
                {goalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Are you willing to attend a monthly in-person dinner event? <Req />
              </label>
              <div className="mt-3 flex flex-wrap gap-4">
                {dinnerOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm text-[var(--color-body)]"
                  >
                    <input
                      type="radio"
                      name="attend_monthly_dinner"
                      checked={form.attend_monthly_dinner === option}
                      onChange={() =>
                        handleChange("attend_monthly_dinner", option)
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-body)]">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={form.pdpa_matching_consent}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pdpa_matching_consent: event.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                I agree to have my professional data used for the purpose of
                business matching in compliance with the Data Privacy Act of the
                Philippines (PDPA).
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="additional_notes" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Anything else you&apos;d like us to know? <Opt />
            </label>
            <textarea
              id="additional_notes"
              className="gn-input mt-1 h-28"
              value={form.additional_notes}
              onChange={(e) => handleChange("additional_notes", e.target.value)}
              placeholder="Optional details that may help with matching"
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="gn-btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save and continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

