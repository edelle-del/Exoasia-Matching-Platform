"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

// ─── Static lists ────────────────────────────────────────────────────────────

const sectorOptions = [
  "Advanced Manufacturing", "Aerospace & Defense", "Agtech", "Animal Health",
  "Brand & Retail", "Crypto & Digital Assets", "Deeptech", "Energy",
  "Enterprise & AI", "Fintech", "Food & Beverage", "GOAL", "Health",
  "Insurtech", "Lifetech", "Maritime", "Media & Advertising", "Medtech",
  "Mobility & Physical AI", "New Materials & Packaging",
  "Real Estate & Construction", "Semiconductors", "Smart Cities", "Sportstech",
  "Supply Chain", "Sustainability", "Travel & Hospitality",
];

const employeeBands = ["1-10", "11-50", "51-200", "201-500", "500+"];
const revenueRanges = [
  "Under $20K", "$20K – $100K", "$100K – $350K", "$350K – $1M",
  "$1M – $2M", "$2M – $10M", "$10M+",
];
const hearAboutOptions = [
  "Masterclass", "Referred by a member", "L&D Workshop", "Social Media", "Other",
];
const yearsOptions = ["Less than 1 year", "1-3 years", "3-5 years", "5+ years"];

const REGIONS = [
  "Global", "United States", "Canada", "United Kingdom", "Europe",
  "Israel", "Latin America", "Middle East", "Africa", "Asia Pacific", "Other regions",
];

const INDUSTRIES = [
  "AI", "B2B SaaS", "B2C", "Fintech", "Healthcare", "Biotech", "ClimateTech",
  "Energy", "Deep Tech", "Future of Work / HRtech", "Mobility & Transportation",
  "E-com & Retail", "Cybersecurity", "AgriTech", "SpaceTech", "Blockchain / Crypto",
  "PropTech / Real Estate", "Education", "InsurTech", "Marketing / Adtech",
  "CPG", "Foodtech", "Hardware", "Tourism & Hospitality", "Sportstech",
];

const STAGES = [
  "Pre-revenue Startups", "Cash-flow Businesses", "Dividend-paying Companies",
  "Pre-seed", "Seed", "Series A", "Series B", "Series C",
  "Pre-IPO / Late-Stage", "Public Companies",
];

const PRODUCT_STAGES = ["Working Prototype", "MVP", "Traction"];

const INVESTOR_TYPES = [
  "Technology Business Incubators (TBIs)",
  "Corporate Incubators",
  "Accelerators",
  "Angel Networks",
  "Venture Capital Firms",
  "Multilateral / ASEAN Partners",
];

const SUPPORT_TYPES = [
  "Mentorship / Advisory",
  "Legal Advisory",
  "Technical Support",
  "Marketing / PR",
  "Business Development",
  "HR / Talent",
  "Finance / Accounting",
  "Industry Connections",
  "Corporate Partnerships",
  "Government Relations",
  "Academic / Research",
  "Community Building",
];

const ENTITY_CLASSES = [
  "Single Family Office", "Multi Family Office", "Limited Partner", "Fund of Funds",
  "High Net Worth Indiv. ($1M+)", "Ultra HNWI ($30M+)", "Angel", "VC Fund",
  "Private Equity Fund", "Real Estate Fund", "Accelerator", "Venture Studio",
  "Hedge Fund", "Crypto Fund", "Private Credit Fund", "Corporation / CVC",
  "Fundraising Agent",
];

const INVESTMENT_INTERESTS = [
  "Direct Investment in Startups",
  "Invest in VC Funds",
  "Invest in Real Estate Funds",
  "Invest in Private Equity Funds",
  "Invest in Venture Studios",
  "Invest in Accelerators",
  "Invest in Funds of Funds",
  "Invest in Hedge Funds",
  "Invest in Crypto Funds",
  "Invest in Private Credit Funds",
  "Invest in New Fund Managers (Fund I)",
  "Invest in Emerging Fund Managers (Fund II)",
  "Invest in Established Fund Managers (Fund III or later)",
];

// ─── UI primitives ────────────────────────────────────────────────────────────

function Req() {
  return <span className="text-red-500 font-bold ml-0.5">*</span>;
}

const projectStages = ["Ideation", "MVP", "Growth", "Scaling", "Revenue-Generating"];

function SectionCard({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6">
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  req,
  children,
}: {
  label: React.ReactNode;
  req?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-sm font-600 text-[var(--color-ink)]">
        {label}
        {req && <Req />}
      </div>
      {children}
    </div>
  );
}

function PillToggle({
  options,
  value,
  onChange,
  singleSelect = false,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  singleSelect?: boolean;
}) {
  function toggle(opt: string) {
    if (singleSelect) {
      onChange(value[0] === opt ? [] : [opt]);
    } else {
      onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            value.includes(opt)
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: "" | "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-5 py-1.5 text-xs font-semibold transition-colors ${
            value === opt
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          }`}
        >
          {opt === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Type to search…",
  allowSelectAll = false,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  allowSelectAll?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const available = options.filter(
    (o) => !value.includes(o) && o.toLowerCase().includes(query.toLowerCase()),
  );

  function add(opt: string) {
    onChange([...value, opt]);
    setQuery("");
  }

  function remove(opt: string) {
    onChange(value.filter((v) => v !== opt));
  }

  const showAll = allowSelectAll && value.length === 0;

  return (
    <div ref={wrapRef} className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] hover:bg-[var(--color-primary)] hover:text-white leading-none"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={value.length > 0 ? "Add more…" : placeholder}
        className="gn-input"
        autoComplete="off"
      />

      {open && (available.length > 0 || showAll) && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[var(--color-hairline)] bg-[#12121A] py-1 shadow-xl">
          {showAll && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange([...options]);
                setOpen(false);
                setQuery("");
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
            >
              ✓ All Industries (Agnostic)
            </button>
          )}
          {available.map((opt) => (
            <button
              type="button"
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault();
                add(opt);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--color-body)] hover:bg-[var(--color-surface-soft)]"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {open && available.length === 0 && query.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-hairline)] bg-[#12121A] px-3 py-2.5 shadow-xl">
          <p className="text-sm text-[var(--color-muted)]">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

function CheckSizePair({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  req,
}: {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  req?: boolean;
}) {
  return (
    <Field label={label} req={req}>
      <div className="flex gap-3 max-w-sm">
        {(
          [
            { lbl: "Min", val: minValue, fn: onMinChange, ph: "100,000" },
            { lbl: "Max", val: maxValue, fn: onMaxChange, ph: "1,000,000" },
          ] as const
        ).map(({ lbl, val, fn, ph }) => (
          <div key={lbl} className="flex-1 min-w-0">
            <p className="mb-1 text-xs text-[var(--color-muted)]">{lbl}</p>
            <div className="flex items-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 py-[13px] transition-colors focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_rgba(70,4,121,0.1)]">
              <span className="select-none shrink-0 text-sm text-[var(--color-muted)] mr-1">$</span>
              <input
                type="text"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
                placeholder={ph}
                value={val}
                onChange={(e) => fn(e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </Field>
  );
}

function RoleCard({
  value,
  current,
  onSelect,
  icon,
  title,
  description,
}: {
  value: "investor" | "startup" | "ecosystem_partner";
  current: string;
  onSelect: (v: "investor" | "startup" | "ecosystem_partner") => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`relative flex w-full flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
          : "border-[var(--color-hairline)] bg-[var(--color-canvas)] hover:border-[var(--color-primary)]/40"
      }`}
    >
      {active && (
        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] text-white">
          ✓
        </span>
      )}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-surface-soft)] text-[var(--color-muted)]"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="font-semibold text-[var(--color-ink)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{description}</p>
      </div>
    </button>
  );
}

// ─── Extended form state type ─────────────────────────────────────────────────

type ExtendedFields = {
  target_regions: string[];
  target_industries: string[];
  investor_type: string;
  entity_class: string[];
  investment_interests: string[];
  target_stages: string[];
  lp_check_min: string;
  lp_check_max: string;
  direct_check_min: string;
  direct_check_max: string;
  fundraising_stage: string;
  target_raise_min: string;
  target_raise_max: string;
  // Startup — product & team
  product_stage: string;
  total_cofounders: string;
  has_technical_founder: "" | "yes" | "no";
  pitch_deck_url: string;
  // Investor — engagement
  anp_affiliated: boolean;
  demo_day_judge: "" | "yes" | "no";
  // Ecosystem partner
  support_types: string[];
  // Referrals (investor + ecosystem partner)
  referral_1_name: string;
  referral_1_contact: string;
  referral_2_name: string;
  referral_2_contact: string;
  referral_3_name: string;
  referral_3_contact: string;
};

const EMPTY_EXTENDED: ExtendedFields = {
  target_regions: [],
  target_industries: [],
  investor_type: "",
  entity_class: [],
  investment_interests: [],
  target_stages: [],
  lp_check_min: "",
  lp_check_max: "",
  direct_check_min: "",
  direct_check_max: "",
  fundraising_stage: "",
  target_raise_min: "",
  target_raise_max: "",
  product_stage: "",
  total_cofounders: "",
  has_technical_founder: "",
  pitch_deck_url: "",
  anp_affiliated: false,
  demo_day_judge: "",
  support_types: [],
  referral_1_name: "",
  referral_1_contact: "",
  referral_2_name: "",
  referral_2_contact: "",
  referral_3_name: "",
  referral_3_contact: "",
};

function parseExtended(raw: string | null | undefined): ExtendedFields {
  try {
    const parsed = JSON.parse(raw ?? "");
    if (parsed?._v === 2) return { ...EMPTY_EXTENDED, ...parsed };
  } catch {
    /* legacy free-text asks_summary — ignore */
  }
  return EMPTY_EXTENDED;
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function OnboardingForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { role } = useAuth();
  const isAdminView = ["advisor", "admin"].includes(role ?? "");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    stage: "",
    sector: "",
  });
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState("");

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
    member_role: "" as "" | "investor" | "startup" | "ecosystem_partner",
    pdpa_matching_consent: false,
    additional_notes: "",
    offers_summary: "",
    linkedin_url: "",
    ...EMPTY_EXTENDED,
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

        const { data: profile } = await supabase
          .from("profiles")
          .select(
            "full_name,business_name,role_title,city,short_bio,how_heard_about,referred_by,phone_whatsapp,years_in_operation,sector,employee_band,annual_revenue_estimate,member_role,asks_summary,offers_summary,pdpa_matching_consent,additional_notes,linkedin_url",
          )
          .eq("id", userId)
          .single();

        if (profile && mounted) {
          const existingName = (profile.full_name ?? metadataFullName) || "";
          const spaceIdx = existingName.indexOf(" ");
          const loadedFirst = spaceIdx >= 0 ? existingName.slice(0, spaceIdx) : existingName;
          const loadedLast = spaceIdx >= 0 ? existingName.slice(spaceIdx + 1) : "";
          const extended = parseExtended(profile.asks_summary);

          // Map stored referrals array back to individual form fields
          const storedRaw = (() => {
            try { return JSON.parse(profile.asks_summary ?? ""); } catch { return null; }
          })();
          const refs: { name?: string; contact?: string }[] = storedRaw?.referrals ?? [];

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
            years_in_operation: profile.years_in_operation ?? prev.years_in_operation,
            sector: profile.sector ?? prev.sector,
            employee_band: profile.employee_band ?? prev.employee_band,
            annual_revenue_estimate: profile.annual_revenue_estimate ?? prev.annual_revenue_estimate,
            member_role: (profile.member_role as "" | "investor" | "startup" | "ecosystem_partner") ?? prev.member_role,
            pdpa_matching_consent: profile.pdpa_matching_consent ?? prev.pdpa_matching_consent,
            additional_notes: profile.additional_notes ?? prev.additional_notes,
            offers_summary: profile.offers_summary ?? prev.offers_summary,
            linkedin_url: (profile as any).linkedin_url ?? prev.linkedin_url,
            ...extended,
            referral_1_name: refs[0]?.name ?? "",
            referral_1_contact: refs[0]?.contact ?? "",
            referral_2_name: refs[1]?.name ?? "",
            referral_2_contact: refs[1]?.contact ?? "",
            referral_3_name: refs[2]?.name ?? "",
            referral_3_contact: refs[2]?.contact ?? "",
          }));
          setProfileLoaded(true);
          return;
        }

        if (mounted && metadataFullName) {
          const spaceIdx = metadataFullName.indexOf(" ");
          const metaFirst = spaceIdx >= 0 ? metadataFullName.slice(0, spaceIdx) : metadataFullName;
          const metaLast = spaceIdx >= 0 ? metadataFullName.slice(spaceIdx + 1) : "";
          setForm((prev) =>
            prev.first_name.trim() ? prev : { ...prev, first_name: metaFirst, last_name: metaLast },
          );
        }
        if (mounted) setProfileLoaded(true);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const setArr = (field: keyof ExtendedFields, value: string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [pendingRole, setPendingRole] = useState<"investor" | "startup" | "ecosystem_partner" | null>(null);

  const confirmRoleSelect = () => {
    if (!pendingRole) return;
    setForm((prev) => ({ ...prev, member_role: pendingRole, ...EMPTY_EXTENDED }));
    setError("");
    setPendingRole(null);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.first_name.trim()) return fail("First name is required.");
    if (!form.last_name.trim()) return fail("Last name is required.");
    if (!form.business_name.trim()) return fail("Business name is required.");
    if (!form.sector) return fail("Please choose a sector.");
    if (!form.how_heard_about) return fail("Please tell us how you heard about FOUNDERS ARENA.");
    if (form.how_heard_about === "Referred by a member" && !form.referred_by.trim())
      return fail("Please add the name of the person who referred you.");
    if (!form.phone_whatsapp.trim()) return fail("Phone Number / WhatsApp is required.");
    if (!form.years_in_operation) return fail("Please select your years in operation.");
    if (!form.employee_band) return fail("Please select your employee band.");
    if (!form.annual_revenue_estimate) return fail("Please select your annual revenue range.");
    if (!form.role_title.trim()) return fail("Role / title is required.");
    if (!form.city.trim()) return fail("City is required.");
    if (!form.short_bio.trim()) return fail("Short bio is required.");
    if (!form.linkedin_url.trim()) return fail("LinkedIn profile URL is required.");
    if (!isAdminView && !form.member_role) return fail("Please select your role.");

    const investorHasFundInterests = form.investment_interests.some(
      (i) => i.includes("Funds") || i.includes("Fund Manager"),
    );

    if (!isAdminView && form.member_role === "investor") {
      if (!form.investor_type) return fail("Please select your investor type.");
      if (!form.entity_class.length) return fail("Please select at least one entity class.");
      if (!form.investment_interests.length) return fail("Please select at least one investment interest.");
      if (!form.target_regions.length) return fail("Please select at least one target region.");
      if (!form.target_industries.length) return fail("Please select at least one target industry.");
      if (!form.target_stages.length) return fail("Please select a target stage.");
      if (investorHasFundInterests) {
        if (!form.lp_check_min.trim()) return fail("Please enter a minimum LP investment check size.");
        if (!form.lp_check_max.trim()) return fail("Please enter a maximum LP investment check size.");
      }
      if (!form.direct_check_min.trim()) return fail("Please enter a minimum direct startup check size.");
      if (!form.direct_check_max.trim()) return fail("Please enter a maximum direct startup check size.");
      if (!form.referral_1_name.trim() || !form.referral_1_contact.trim()) return fail("Referral 1 name and contact are required.");
      if (!form.referral_2_name.trim() || !form.referral_2_contact.trim()) return fail("Referral 2 name and contact are required.");
      if (!form.referral_3_name.trim() || !form.referral_3_contact.trim()) return fail("Referral 3 name and contact are required.");
    }

    if (!isAdminView && form.member_role === "startup") {
      if (!form.target_regions.length) return fail("Please select at least one target region.");
      if (!form.target_industries.length) return fail("Please select at least one target industry.");
      if (!form.fundraising_stage) return fail("Please select your current fundraising stage.");
      if (!form.product_stage) return fail("Please select your product stage.");
      if (!form.total_cofounders.trim()) return fail("Please enter the number of co-founders.");
      if (!form.target_raise_min.trim()) return fail("Please enter a minimum target raise amount.");
      if (!form.target_raise_max.trim()) return fail("Please enter a maximum target raise amount.");
    }

    if (!isAdminView && form.member_role === "ecosystem_partner") {
      if (!form.support_types.length) return fail("Please select at least one type of support you offer.");
      if (!form.target_industries.length) return fail("Please select at least one target industry.");
      if (!form.target_regions.length) return fail("Please select at least one target region.");
      if (!form.referral_1_name.trim() || !form.referral_1_contact.trim()) return fail("Referral 1 name and contact are required.");
      if (!form.referral_2_name.trim() || !form.referral_2_contact.trim()) return fail("Referral 2 name and contact are required.");
      if (!form.referral_3_name.trim() || !form.referral_3_contact.trim()) return fail("Referral 3 name and contact are required.");
    }

    if (!form.pdpa_matching_consent)
      return fail("You must agree to the data privacy consent to continue.");

    function fail(msg: string) {
      setError(msg);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return undefined as never;
    }

    try {
      const pitchDeckUrl = form.pitch_deck_url;

      const ask_categories =
        form.member_role === "investor"
          ? ["Deal flow / Investment opportunities"]
          : form.member_role === "startup"
          ? ["Funding / Investment capital"]
          : form.member_role === "ecosystem_partner"
          ? ["Startups to support / mentor"]
          : ["General networking"];

      const offer_categories =
        form.member_role === "investor"
          ? ["Capital / Funding"]
          : form.member_role === "startup"
          ? ["Technology / Product"]
          : form.member_role === "ecosystem_partner"
          ? form.support_types.length ? form.support_types : ["Ecosystem support"]
          : ["Industry expertise"];

      const extendedPayload =
        form.member_role === "investor"
          ? {
              _v: 2,
              investor_type: form.investor_type,
              entity_class: form.entity_class,
              investment_interests: form.investment_interests,
              target_regions: form.target_regions,
              target_industries: form.target_industries,
              target_stages: form.target_stages,
              lp_check_min: form.lp_check_min,
              lp_check_max: form.lp_check_max,
              direct_check_min: form.direct_check_min,
              direct_check_max: form.direct_check_max,
              anp_affiliated: form.anp_affiliated,
              demo_day_judge: form.demo_day_judge,
              referrals: [
                { name: form.referral_1_name, contact: form.referral_1_contact },
                { name: form.referral_2_name, contact: form.referral_2_contact },
                { name: form.referral_3_name, contact: form.referral_3_contact },
              ],
            }
          : form.member_role === "startup"
          ? {
              _v: 2,
              target_regions: form.target_regions,
              target_industries: form.target_industries,
              fundraising_stage: form.fundraising_stage,
              product_stage: form.product_stage,
              total_cofounders: form.total_cofounders,
              has_technical_founder: form.has_technical_founder,
              pitch_deck_url: pitchDeckUrl,
              target_raise_min: form.target_raise_min,
              target_raise_max: form.target_raise_max,
            }
          : form.member_role === "ecosystem_partner"
          ? {
              _v: 2,
              support_types: form.support_types,
              target_industries: form.target_industries,
              target_regions: form.target_regions,
              target_stages: form.target_stages,
              referrals: [
                { name: form.referral_1_name, contact: form.referral_1_contact },
                { name: form.referral_2_name, contact: form.referral_2_contact },
                { name: form.referral_3_name, contact: form.referral_3_contact },
              ],
            }
          : null;

      const payload = {
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        member_role: form.member_role || undefined,
        business_name: form.business_name.trim(),
        role_title: form.role_title.trim() || undefined,
        city: form.city.trim() || undefined,
        short_bio: form.short_bio.trim() || undefined,
        linkedin_url: form.linkedin_url.trim() || undefined,
        how_heard_about: form.how_heard_about,
        referred_by: form.referred_by.trim() || undefined,
        phone_whatsapp: form.phone_whatsapp.trim(),
        years_in_operation: form.years_in_operation,
        sector: form.sector || undefined,
        employee_band: form.employee_band,
        annual_revenue_estimate: form.annual_revenue_estimate,
        ask_categories,
        offer_categories,
        asks_summary: extendedPayload ? JSON.stringify(extendedPayload) : undefined,
        offers_summary: form.offers_summary.trim() || undefined,
        pdpa_matching_consent: form.pdpa_matching_consent,
        additional_notes: form.additional_notes.trim() || undefined,
      };

      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData?.error || "Save failed");

      await supabase.auth.refreshSession();
      setSuccess("Profile saved.");
      if (form.member_role === "startup") {
        setTimeout(() => {
          setSuccess("");
          setStep(2);
        }, 600);
      } else {
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (skip = false) => {
    if (skip) {
      router.push("/dashboard");
      return;
    }
    if (!projectForm.name.trim()) {
      setProjectError("Project name is required.");
      return;
    }
    setProjectLoading(true);
    setProjectError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || undefined,
        stage: projectForm.stage || undefined,
        sector: projectForm.sector || undefined,
      }),
    });
    setProjectLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setProjectError(data?.error ?? "Failed to create project.");
      return;
    }
    router.push("/dashboard");
  };

  const ROLE_META: Record<"investor" | "startup" | "ecosystem_partner", { label: string; description: string; detail: string }> = {
    investor: {
      label: "Investor",
      description: "I deploy capital and seek deal flow",
      detail: "You'll be asked to fill in your investment thesis, check sizes, target stages, and 3 referrals who can verify your role.",
    },
    startup: {
      label: "Startup / Founder",
      description: "I'm building a company and raising capital",
      detail: "You'll complete a fundraising profile including your stage, raise target, and product details — then add your first project.",
    },
    ecosystem_partner: {
      label: "Ecosystem Partner",
      description: "I support startups — not through capital, but expertise",
      detail: "You'll describe the type of support you offer (mentorship, legal, technical, etc.) and 3 referrals who can verify your role.",
    },
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
        <div className="mx-auto max-w-[700px] rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Step 2 of 2
          </div>
          <h1 className="text-2xl font-700 text-[var(--color-ink)]">
            Add your first project
          </h1>
          <p className="mt-2 text-sm text-[var(--color-body)]">
            Tell investors what you&apos;re building. You get 1 free project slot — upgrade to add more.
          </p>

          {projectError && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {projectError}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Project name <Req />
              </label>
              <input
                className="gn-input mt-1"
                value={projectForm.name}
                onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. SmartSupply PH"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Description
              </label>
              <textarea
                className="gn-input mt-1 h-24"
                value={projectForm.description}
                onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of what the project does and the problem it solves."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="onb-proj-stage" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  Project stage
                </label>
                <select
                  id="onb-proj-stage"
                  className="gn-input mt-1"
                  value={projectForm.stage}
                  onChange={(e) => setProjectForm((p) => ({ ...p, stage: e.target.value }))}
                >
                  <option value="">Select stage</option>
                  {projectStages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="onb-proj-sector" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  Sector
                </label>
                <select
                  id="onb-proj-sector"
                  className="gn-input mt-1"
                  value={projectForm.sector}
                  onChange={(e) => setProjectForm((p) => ({ ...p, sector: e.target.value }))}
                >
                  <option value="">Select sector</option>
                  {sectorOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleProjectSubmit(false)}
              disabled={projectLoading}
              className="gn-btn-primary disabled:opacity-50"
            >
              {projectLoading ? "Saving..." : "Save project"}
            </button>
            <button
              type="button"
              onClick={() => handleProjectSubmit(true)}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] underline"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showLpFields = form.investment_interests.some(
    (i) => i.includes("Funds") || i.includes("Fund Manager"),
  );
  const showAnpBadge =
    form.investor_type === "Angel Networks" || form.entity_class.includes("Angel");

  return (
    <>
      {/* ─── Role confirmation modal ─────────────────────────────────────── */}
      {pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 shadow-xl">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Confirm your role
            </p>
            <h2 className="mt-3 text-xl font-700 text-[var(--color-ink)]">
              {ROLE_META[pendingRole].label}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {ROLE_META[pendingRole].description}
            </p>
            <p className="mt-4 text-sm text-[var(--color-body)]">
              {ROLE_META[pendingRole].detail}
            </p>
            <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              Your role cannot be changed after confirmation. Make sure this is correct.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRole(null)}
                className="flex-1 rounded-xl border border-[var(--color-hairline)] py-2.5 text-sm font-600 text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={confirmRoleSelect}
                className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-600 text-white hover:opacity-90 transition-opacity"
              >
                Confirm — I&apos;m a {ROLE_META[pendingRole].label}
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-[var(--color-canvas)] px-[5%] py-12">
      <div className="mx-auto max-w-[900px] rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
        {!isAdminView && form.member_role === "startup" && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Step 1 of 2
          </div>
        )}
        <h1 className="text-2xl font-700 text-[var(--color-ink)]">Complete your profile</h1>
        <p className="mt-2 text-sm text-[var(--color-body)]">
          Provide the key details we use to generate curated strategic matches for you.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">

          {/* Basic profile fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="first_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                First name <Req />
              </label>
              <input id="first_name" className="gn-input mt-1" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
            </div>
            <div>
              <label htmlFor="last_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Last name <Req />
              </label>
              <input id="last_name" className="gn-input mt-1" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
            </div>
          </div>

          <div>
            <label htmlFor="business_name" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Business name <Req />
            </label>
            <input id="business_name" className="gn-input mt-1" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="how_heard_about" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                How did you hear about FOUNDERS ARENA? <Req />
              </label>
              <select id="how_heard_about" className="gn-input mt-1" value={form.how_heard_about} onChange={(e) => set("how_heard_about", e.target.value)}>
                <option value="">Select one</option>
                {hearAboutOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="referred_by" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                If referred, who referred you?{" "}
                {form.how_heard_about === "Referred by a member" && <Req />}
              </label>
              <input id="referred_by" className="gn-input mt-1" value={form.referred_by} onChange={(e) => set("referred_by", e.target.value)} placeholder="Referral name — type none if none" />
              <p className="mt-1 text-xs text-[var(--color-muted)]">Type <span className="font-medium">none</span> if you were not referred by anyone.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="phone_whatsapp" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Phone Number / WhatsApp <Req />
              </label>
              <input id="phone_whatsapp" className="gn-input mt-1" value={form.phone_whatsapp} onChange={(e) => set("phone_whatsapp", e.target.value)} placeholder="+63…" />
            </div>
            <div>
              <label htmlFor="years_in_operation" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Years in Operation <Req />
              </label>
              <select id="years_in_operation" className="gn-input mt-1" value={form.years_in_operation} onChange={(e) => set("years_in_operation", e.target.value)}>
                <option value="">Select one</option>
                {yearsOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="role_title" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Role / title <Req />
              </label>
              <input id="role_title" className="gn-input mt-1" value={form.role_title} onChange={(e) => set("role_title", e.target.value)} />
            </div>
            <div>
              <label htmlFor="city" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                City <Req />
              </label>
              <input id="city" className="gn-input mt-1" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Sector <Req />
            </p>
            {form.sector && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Selected: <span className="font-600 text-[var(--color-primary)]">{form.sector}</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {sectorOptions.map((s) => (
                <button key={s} type="button" onClick={() => set("sector", form.sector === s ? "" : s)}
                  className={`rounded-full border px-3 py-1 text-xs font-500 transition-colors ${
                    form.sector === s
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="short_bio" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Short bio (1–2 sentences) <Req />
            </label>
            <textarea id="short_bio" className="gn-input mt-1 h-24" value={form.short_bio} onChange={(e) => set("short_bio", e.target.value)} />
          </div>

          <div>
            <label htmlFor="linkedin_url" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              LinkedIn Profile URL <Req />
            </label>
            <input
              id="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/your-profile"
              className="gn-input mt-1"
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="employee_band" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Employee band <Req />
              </label>
              <select id="employee_band" className="gn-input mt-1" value={form.employee_band} onChange={(e) => set("employee_band", e.target.value)}>
                <option value="">Choose band</option>
                {employeeBands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="annual_revenue_estimate" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                Annual revenue (estimate) <Req />
              </label>
              <select id="annual_revenue_estimate" className="gn-input mt-1" value={form.annual_revenue_estimate} onChange={(e) => set("annual_revenue_estimate", e.target.value)}>
                <option value="">Choose range</option>
                {revenueRanges.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* ─── Role selection ──────────────────────────────────────────── */}
          {!isAdminView && (
            <>
              <div>
                <p className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
                  Role <Req />
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Your role determines what matching criteria we collect.
                </p>

                {!profileLoaded ? (
                  <div className="mt-3 h-14 animate-pulse rounded-xl bg-[var(--color-surface-soft)]" />
                ) : form.member_role ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3">
                    <span className="text-sm font-600 text-[var(--color-ink)] capitalize">
                      {form.member_role === "investor"
                        ? "Investor"
                        : form.member_role === "startup"
                        ? "Startup / Founder"
                        : "Ecosystem Partner"}
                    </span>
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                      Locked
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <RoleCard
                      value="investor"
                      current={form.member_role}
                      onSelect={setPendingRole}
                      title="Investor"
                      description="I deploy capital and seek deal flow"
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      }
                    />
                    <RoleCard
                      value="startup"
                      current={form.member_role}
                      onSelect={setPendingRole}
                      title="Startup / Founder"
                      description="I'm building a company and raising capital"
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      }
                    />
                    <RoleCard
                      value="ecosystem_partner"
                      current={form.member_role}
                      onSelect={setPendingRole}
                      title="Ecosystem Partner"
                      description="I support startups — not through capital, but expertise"
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      }
                    />
                  </div>
                )}
              </div>

              {/* ─── Investor sections ─────────────────────────────────────── */}
              {form.member_role === "investor" && (
                <div className="space-y-4">

                  <SectionCard label="Section A — Profile & Type">
                    <FieldRow>
                      <Field label="Type of Investor" req>
                        <select
                          aria-label="Type of Investor"
                          className="gn-input"
                          value={form.investor_type}
                          onChange={(e) => set("investor_type", e.target.value)}
                        >
                          <option value="">Select type</option>
                          {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>

                      <Field label="Entity Class / Office Type" req>
                        <SearchableMultiSelect
                          options={ENTITY_CLASSES}
                          value={form.entity_class}
                          onChange={(v) => setArr("entity_class", v)}
                          placeholder="Search entity class…"
                        />
                      </Field>
                    </FieldRow>

                    {/* ANP affiliation — shown for Angel Networks type or Angel entity class */}
                    {showAnpBadge && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={form.anp_affiliated}
                          onChange={(e) => setForm((prev) => ({ ...prev, anp_affiliated: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 accent-violet-600"
                        />
                        <div>
                          <p className="text-sm font-semibold text-violet-800">
                            Associate profile with ANP – Bit Angels (Manila Chapter)
                          </p>
                          <p className="mt-0.5 text-xs text-violet-600">
                            Link your profile to the Angel Network Philippines Bit Angels chapter for shared deal flow and co-investment visibility.
                          </p>
                        </div>
                      </label>
                    )}

                    <Field label="Interested in participating as a Demo Day Pitch Judge">
                      <YesNoToggle
                        value={form.demo_day_judge as "" | "yes" | "no"}
                        onChange={(v) => set("demo_day_judge", v)}
                      />
                    </Field>
                  </SectionCard>

                  <SectionCard label="Section B — Investment Focus">
                    <Field label="Investment Interests" req>
                      <p className="mb-2 text-xs text-[var(--color-muted)]">Select all that apply.</p>
                      <PillToggle
                        options={INVESTMENT_INTERESTS}
                        value={form.investment_interests}
                        onChange={(v) => setArr("investment_interests", v)}
                      />
                    </Field>

                    <FieldRow>
                      <Field label="Target Regions" req>
                        <SearchableMultiSelect
                          options={REGIONS}
                          value={form.target_regions}
                          onChange={(v) => setArr("target_regions", v)}
                          placeholder="Search regions…"
                        />
                      </Field>

                      <Field label="Target Industries" req>
                        <SearchableMultiSelect
                          options={INDUSTRIES}
                          value={form.target_industries}
                          onChange={(v) => setArr("target_industries", v)}
                          placeholder="Search industries…"
                          allowSelectAll
                        />
                      </Field>
                    </FieldRow>

                    <Field label="Target Stages" req>
                      <PillToggle
                        options={STAGES}
                        value={form.target_stages}
                        onChange={(v) => setArr("target_stages", v)}
                        singleSelect
                      />
                    </Field>
                  </SectionCard>

                  <SectionCard
                    label="Section C — Financials"
                    description="Approximate check sizes in USD. Used for matching precision only."
                  >
                    {showLpFields && (
                      <CheckSizePair
                        label="LP Investment Check Size"
                        minValue={form.lp_check_min}
                        maxValue={form.lp_check_max}
                        onMinChange={(v) => set("lp_check_min", v)}
                        onMaxChange={(v) => set("lp_check_max", v)}
                        req
                      />
                    )}
                    <CheckSizePair
                      label="Direct Startup Check Size"
                      minValue={form.direct_check_min}
                      maxValue={form.direct_check_max}
                      onMinChange={(v) => set("direct_check_min", v)}
                      onMaxChange={(v) => set("direct_check_max", v)}
                      req
                    />
                  </SectionCard>

                  <SectionCard label="Section D — Referrals" description="Provide 3 people who can verify your role as an investor. All fields required.">
                    {([1, 2, 3] as const).map((n) => (
                      <div key={n} className="space-y-3 rounded-lg border border-[var(--color-hairline)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Referral {n}</p>
                        <FieldRow>
                          <Field label="Full Name" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="e.g. Juan dela Cruz"
                              value={form[`referral_${n}_name` as keyof typeof form] as string}
                              onChange={(e) => set(`referral_${n}_name`, e.target.value)}
                            />
                          </Field>
                          <Field label="Email / LinkedIn / Phone" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="email, linkedin.com/in/... or +63..."
                              value={form[`referral_${n}_contact` as keyof typeof form] as string}
                              onChange={(e) => set(`referral_${n}_contact`, e.target.value)}
                            />
                          </Field>
                        </FieldRow>
                      </div>
                    ))}
                  </SectionCard>

                </div>
              )}

              {/* ─── Startup sections ──────────────────────────────────────── */}
              {form.member_role === "startup" && (
                <div className="space-y-4">

                  <SectionCard label="Section A — Fundraising Target">
                    <FieldRow>
                      <Field label="Target Regions" req>
                        <SearchableMultiSelect
                          options={REGIONS}
                          value={form.target_regions}
                          onChange={(v) => setArr("target_regions", v)}
                          placeholder="Search regions…"
                        />
                      </Field>

                      <Field label="Primary & Secondary Industries" req>
                        <SearchableMultiSelect
                          options={INDUSTRIES}
                          value={form.target_industries}
                          onChange={(v) => setArr("target_industries", v)}
                          placeholder="Search industries…"
                          allowSelectAll
                        />
                      </Field>
                    </FieldRow>

                    <Field label="Current Fundraising Stage" req>
                      <div className="flex flex-wrap gap-2">
                        {STAGES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => set("fundraising_stage", form.fundraising_stage === s ? "" : s)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.fundraising_stage === s
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Product Stage" req>
                      <PillToggle
                        options={PRODUCT_STAGES}
                        value={form.product_stage ? [form.product_stage] : []}
                        onChange={(v) => set("product_stage", v[v.length - 1] ?? "")}
                        singleSelect
                      />
                    </Field>

                    <FieldRow>
                      <Field label="Total Co-founders" req>
                        <input
                          type="number"
                          min={1}
                          className="gn-input"
                          placeholder="e.g. 2"
                          value={form.total_cofounders}
                          onChange={(e) => set("total_cofounders", e.target.value)}
                        />
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Minimum 2 required for Demo Day tracking.
                        </p>
                      </Field>

                      <Field label="Includes a Technical Founder">
                        <YesNoToggle
                          value={form.has_technical_founder as "" | "yes" | "no"}
                          onChange={(v) => set("has_technical_founder", v)}
                        />
                      </Field>
                    </FieldRow>

                    <Field label="Pitch Deck Link">
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... or Notion, Docsend, etc."
                        value={form.pitch_deck_url}
                        onChange={(e) => set("pitch_deck_url", e.target.value)}
                        className="input-base w-full"
                      />
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Paste a shareable link (Google Drive, Docsend, Notion, etc.). Max 10 slides aligning with standard evaluation criteria.
                      </p>
                    </Field>
                  </SectionCard>

                  <SectionCard
                    label="Section B — Financials"
                    description="Approximate raise target in USD. Used for matching precision only."
                  >
                    <CheckSizePair
                      label="Target Raise Amount"
                      minValue={form.target_raise_min}
                      maxValue={form.target_raise_max}
                      onMinChange={(v) => set("target_raise_min", v)}
                      onMaxChange={(v) => set("target_raise_max", v)}
                      req
                    />
                  </SectionCard>

                </div>
              )}

              {/* ─── Ecosystem Partner sections ────────────────────────── */}
              {form.member_role === "ecosystem_partner" && (
                <div className="space-y-4">
                  <SectionCard label="Section A — Support Profile">
                    <Field label="Type of Support You Offer" req>
                      <p className="mb-2 text-xs text-[var(--color-muted)]">Select all that apply.</p>
                      <PillToggle
                        options={SUPPORT_TYPES}
                        value={form.support_types}
                        onChange={(v) => setArr("support_types", v)}
                      />
                    </Field>

                    <FieldRow>
                      <Field label="Target Regions" req>
                        <SearchableMultiSelect
                          options={REGIONS}
                          value={form.target_regions}
                          onChange={(v) => setArr("target_regions", v)}
                          placeholder="Search regions…"
                        />
                      </Field>

                      <Field label="Industries You Focus On" req>
                        <SearchableMultiSelect
                          options={INDUSTRIES}
                          value={form.target_industries}
                          onChange={(v) => setArr("target_industries", v)}
                          placeholder="Search industries…"
                          allowSelectAll
                        />
                      </Field>
                    </FieldRow>

                    <Field label="Startup Stages You Can Best Help">
                      <div className="flex flex-wrap gap-2">
                        {STAGES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setArr(
                                "target_stages",
                                form.target_stages.includes(s)
                                  ? form.target_stages.filter((x) => x !== s)
                                  : [...form.target_stages, s],
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.target_stages.includes(s)
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </SectionCard>

                  <SectionCard label="Section B — Referrals" description="Provide 3 people who can verify your role as an ecosystem partner. All fields required.">
                    {([1, 2, 3] as const).map((n) => (
                      <div key={n} className="space-y-3 rounded-lg border border-[var(--color-hairline)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Referral {n}</p>
                        <FieldRow>
                          <Field label="Full Name" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="e.g. Juan dela Cruz"
                              value={form[`referral_${n}_name` as keyof typeof form] as string}
                              onChange={(e) => set(`referral_${n}_name`, e.target.value)}
                            />
                          </Field>
                          <Field label="Email / LinkedIn / Phone" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="email, linkedin.com/in/... or +63..."
                              value={form[`referral_${n}_contact` as keyof typeof form] as string}
                              onChange={(e) => set(`referral_${n}_contact`, e.target.value)}
                            />
                          </Field>
                        </FieldRow>
                      </div>
                    ))}
                  </SectionCard>
                </div>
              )}

              {!form.member_role && (
                <p className="rounded-lg bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-muted)]">
                  Select your role above to see the relevant matching fields.
                </p>
              )}
            </>
          )}

          {/* ─── PDPA consent ─────────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-body)]">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={form.pdpa_matching_consent}
                onChange={(e) => setForm((prev) => ({ ...prev, pdpa_matching_consent: e.target.checked }))}
                className="mt-1"
              />
              <span>
                I agree to have my professional data used for the purpose of business matching in
                compliance with the Data Privacy Act of the Philippines (PDPA).
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="additional_notes" className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Anything else you&apos;d like us to know?
            </label>
            <textarea
              id="additional_notes"
              className="gn-input mt-1 h-28"
              value={form.additional_notes}
              onChange={(e) => set("additional_notes", e.target.value)}
              placeholder="Optional details that may help with matching"
            />
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="gn-btn-primary" disabled={loading}>
              {loading ? "Saving…" : "Save and continue"}
            </button>
          </div>

        </form>
      </div>
    </div>
    </>
  );
}
