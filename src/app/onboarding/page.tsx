"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "../providers";

// ─── Static lists ────────────────────────────────────────────────────────────

const sectorOptions = [
  "Advanced Manufacturing",
  "Aerospace & Defense",
  "Agtech",
  "Animal Health",
  "Brand & Retail",
  "Crypto & Digital Assets",
  "Deeptech",
  "Energy",
  "Enterprise & AI",
  "Fintech",
  "Food & Beverage",
  "GOAL",
  "Health",
  "Insurtech",
  "Lifetech",
  "Maritime",
  "Media & Advertising",
  "Medtech",
  "Mobility & Physical AI",
  "New Materials & Packaging",
  "Real Estate & Construction",
  "Semiconductors",
  "Smart Cities",
  "Sportstech",
  "Supply Chain",
  "Sustainability",
  "Travel & Hospitality",
];

const employeeBands = ["1-10", "11-50", "51-200", "201-500", "500+"];
const revenueRanges = [
  "Under $20K",
  "$20K – $100K",
  "$100K – $350K",
  "$350K – $1M",
  "$1M – $2M",
  "$2M – $10M",
  "$10M+",
];
const hearAboutOptions = [
  "Masterclass",
  "Referred by a member",
  "L&D Workshop",
  "Social Media",
  "Other",
];
const yearsOptions = ["Less than 1 year", "1-3 years", "3-5 years", "5+ years"];

const REGIONS = [
  "Global",
  "United States",
  "Canada",
  "United Kingdom",
  "Europe",
  "Israel",
  "Latin America",
  "Middle East",
  "Africa",
  "Asia Pacific",
  "Other regions",
];

const INDUSTRIES = [
  "AI",
  "B2B SaaS",
  "B2C",
  "Fintech",
  "Healthcare",
  "Biotech",
  "ClimateTech",
  "Energy",
  "Deep Tech",
  "Future of Work / HRtech",
  "Mobility & Transportation",
  "E-com & Retail",
  "Cybersecurity",
  "AgriTech",
  "SpaceTech",
  "Blockchain / Crypto",
  "PropTech / Real Estate",
  "Education",
  "InsurTech",
  "Marketing / Adtech",
  "CPG",
  "Foodtech",
  "Hardware",
  "Tourism & Hospitality",
  "Sportstech",
];

const STAGES = [
  "Pre-revenue Startups",
  "Cash-flow Businesses",
  "Dividend-paying Companies",
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Pre-IPO / Late-Stage",
  "Public Companies",
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

// ─── Ask / Offer options per role ────────────────────────────────────────────

const INVESTOR_ASKS = [
  "Deal flow / Investment opportunities",
  "Co-investment partners",
  "LP introductions",
  "Expert advisors",
  "Board seat opportunities",
  "Secondary market deals",
  "Fund manager introductions",
];

const INVESTOR_OFFERS = [
  "Capital / Funding",
  "Strategic guidance",
  "Network / Introductions",
  "Industry expertise",
  "Board support",
  "Follow-on capital",
  "Market access",
  "Governance support",
  "Operational support",
];

const STARTUP_ASKS = [
  "Funding / Investment capital",
  "Mentorship / Advisory",
  "Strategic partnerships",
  "Technical expertise",
  "Legal / Compliance support",
  "Marketing / PR support",
  "Distribution / Sales networks",
  "International expansion support",
  "Talent / Recruitment",
  "Business Development",
  "Accounting / Finance support",
  "Government relations",
];

const STARTUP_OFFERS = [
  "Technology / Product",
  "Market access",
  "Co-founder opportunity",
  "Advisory board seat",
  "Revenue partnership",
  "Pilot / Beta access",
  "Strategic collaboration",
  "IP / Patents",
];

const ECO_ASKS = [
  "Deal flow / Investment pipeline",
  "Startup applications",
  "Partnership opportunities",
  "Co-programme partners",
  "Mentor networks",
  "Corporate sponsors",
];

const ECO_OFFERS = [
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
  "Capital / Incubation / Acceleration",
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
  "Single Family Office",
  "Multi Family Office",
  "Limited Partner",
  "Fund of Funds",
  "High Net Worth Indiv. ($1M+)",
  "Ultra HNWI ($30M+)",
  "Angel",
  "VC Fund",
  "Private Equity Fund",
  "Real Estate Fund",
  "Accelerator",
  "Venture Studio",
  "Hedge Fund",
  "Crypto Fund",
  "Private Credit Fund",
  "Corporation / CVC",
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
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {description}
          </p>
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
      onChange(
        value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
      );
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
              <i
                className="ri-check-line mr-2 align-[-2px]"
                aria-hidden="true"
              />
              All Industries (Agnostic)
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
          <p className="text-sm text-[var(--color-muted)]">
            No results for &ldquo;{query}&rdquo;
          </p>
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
              <span className="select-none shrink-0 text-sm text-[var(--color-muted)] mr-1">
                $
              </span>
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
          <i
            className="ri-check-line text-[11px] leading-none"
            aria-hidden="true"
          />
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
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          {description}
        </p>
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

// ─── PDF Upload ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PdfUploadCard({
  file,
  status,
  error,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onChange,
  onParse,
  onClear,
  hideParseButton = false,
}: {
  file: File | null;
  status: "idle" | "parsing" | "done" | "error";
  error: string;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParse: () => void;
  onClear: () => void;
  hideParseButton?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Quick-fill
          </p>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">
            Optional
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
          Upload your Venture Confidence Assessment report
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">
          We&apos;ll extract your fundraising details to auto-fill the fields
          below.
        </p>
      </div>

      {/* Done */}
      {status === "done" ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-emerald-800">
              Fields filled from {file?.name}
            </p>
            <p className="text-xs text-emerald-600">
              Review and adjust the fields below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-emerald-700 underline hover:text-emerald-900"
          >
            Change file
          </button>
        </div>
      ) : /* Parsing */
      status === "parsing" ? (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-4">
          <svg
            className="h-5 w-5 shrink-0 animate-spin text-[var(--color-primary)]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Analysing your document…
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              This takes a few seconds
            </p>
          </div>
        </div>
      ) : /* File selected */
      file ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                {file.name}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClear}
              aria-label="Remove file"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!hideParseButton && (
            <button
              type="button"
              onClick={onParse}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Auto-fill from this PDF
            </button>
          )}
        </div>
      ) : (
        /* Drop zone */
        <div>
          <div
            role="button"
            tabIndex={0}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
              isDragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-hairline)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/3"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${isDragging ? "bg-[var(--color-primary)]/10" : "bg-[var(--color-canvas)]"}`}
              >
                <svg
                  className={`h-6 w-6 transition-colors ${isDragging ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isDragging ? "Drop to upload" : "Drop your PDF here"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                  or{" "}
                  <span className="font-medium text-[var(--color-primary)]">
                    click to browse
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-[var(--color-muted)]">
                PDF only · Max 10 MB
              </p>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            aria-label="Upload Venture Confidence Assessment report PDF"
            className="hidden"
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function OnboardingForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { role, user, signOut } = useAuth();
  const isAdminView = ["advisor", "admin"].includes(role ?? "");
  const [step, setStep] = useState<"role" | "profile" | "startup">("role");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    stage: "",
    sector: "",
  });
  const [startupLoading, setStartupLoading] = useState(false);
  const [startupError, setStartupError] = useState("");
  const [startupMode, setStartupMode] = useState<"create" | "join">("create");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

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
    ask_categories: [] as string[],
    offer_categories: [] as string[],
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
            "full_name,business_name,role_title,city,short_bio,how_heard_about,referred_by,phone_whatsapp,years_in_operation,sector,employee_band,annual_revenue_estimate,member_role,asks_summary,offers_summary,ask_categories,offer_categories,pdpa_matching_consent,additional_notes,linkedin_url",
          )
          .eq("id", userId)
          .single();

        if (profile && mounted) {
          const existingName = (profile.full_name ?? metadataFullName) || "";
          const spaceIdx = existingName.indexOf(" ");
          const loadedFirst =
            spaceIdx >= 0 ? existingName.slice(0, spaceIdx) : existingName;
          const loadedLast =
            spaceIdx >= 0 ? existingName.slice(spaceIdx + 1) : "";
          const extended = parseExtended(profile.asks_summary);

          // Map stored referrals array back to individual form fields
          const storedRaw = (() => {
            try {
              return JSON.parse(profile.asks_summary ?? "");
            } catch {
              return null;
            }
          })();
          const refs: { name?: string; contact?: string }[] =
            storedRaw?.referrals ?? [];

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
            member_role:
              (profile.member_role as
                | ""
                | "investor"
                | "startup"
                | "ecosystem_partner") ?? prev.member_role,
            pdpa_matching_consent:
              profile.pdpa_matching_consent ?? prev.pdpa_matching_consent,
            additional_notes: profile.additional_notes ?? prev.additional_notes,
            offers_summary: profile.offers_summary ?? prev.offers_summary,
            linkedin_url: (profile as any).linkedin_url ?? prev.linkedin_url,
            ask_categories: (profile as any).ask_categories ?? prev.ask_categories,
            offer_categories: (profile as any).offer_categories ?? prev.offer_categories,
            ...extended,
            referral_1_name: refs[0]?.name ?? "",
            referral_1_contact: refs[0]?.contact ?? "",
            referral_2_name: refs[1]?.name ?? "",
            referral_2_contact: refs[1]?.contact ?? "",
            referral_3_name: refs[2]?.name ?? "",
            referral_3_contact: refs[2]?.contact ?? "",
          }));
          if (profile.member_role) setStep("profile");
          setProfileLoaded(true);
          return;
        }

        if (mounted && metadataFullName) {
          const spaceIdx = metadataFullName.indexOf(" ");
          const metaFirst =
            spaceIdx >= 0
              ? metadataFullName.slice(0, spaceIdx)
              : metadataFullName;
          const metaLast =
            spaceIdx >= 0 ? metadataFullName.slice(spaceIdx + 1) : "";
          setForm((prev) =>
            prev.first_name.trim()
              ? prev
              : { ...prev, first_name: metaFirst, last_name: metaLast },
          );
        }
        if (mounted) setProfileLoaded(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const setArr = (field: keyof ExtendedFields, value: string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const toggleAskOffer = (field: "ask_categories" | "offer_categories", item: string) => {
    setForm((prev) => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(item) ? current.filter((x) => x !== item) : [...current, item],
      };
    });
    setErrors([]);
  };

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [pendingRole, setPendingRole] = useState<
    "investor" | "startup" | "ecosystem_partner" | null
  >(null);
  const [roleAgreeChecked, setRoleAgreeChecked] = useState(false);

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStatus, setPdfStatus] = useState<
    "idle" | "parsing" | "done" | "error"
  >("idle");
  const [pdfError, setPdfError] = useState("");
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  const handlePdfFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setPdfError("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError("File must be under 10 MB.");
      return;
    }
    setPdfFile(file);
    setPdfError("");
    setPdfStatus("idle");
  };

  const clearPdf = () => {
    setPdfFile(null);
    setPdfStatus("idle");
    setPdfError("");
  };

  const handlePdfParse = async (): Promise<boolean> => {
    if (!pdfFile || pdfStatus === "parsing") return false;
    setPdfStatus("parsing");
    setPdfError("");
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const res = await fetch("/api/venture-readiness/parse", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          profile?: {
            venture?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            business_name?: string | null;
            project_name?: string | null;
            role_title?: string | null;
            phone?: string | null;
            city?: string | null;
            short_bio?: string | null;
            linkedin?: string | null;
            sector?: string | null;
            employee_band?: string | null;
            annual_revenue?: string | null;
            years_in_operation?: string | null;
            referral_source?: string | null;
            referral_name?: string | null;
            description?: string | null;
            fundraising_stage?: string | null;
            target_regions?: string[] | null;
            primary_industries?: string[] | null;
            product_stage?: string | null;
            co_founders?: string | null;
            technical_founder?: string | null;
            target_raise_min?: number | null;
            target_raise_max?: number | null;
            additional_info?: string | null;
          };
        };
      };

      if (!res.ok || !json.success) {
        setPdfError(json.error ?? "Failed to parse PDF.");
        setPdfStatus("error");
        return false;
      }

      const p = json.data?.profile ?? {};

      // Case-insensitive partial match against a list of allowed option strings
      const matchOpt = (
        value: string | null | undefined,
        options: string[],
      ): string => {
        if (!value) return "";
        const v = value.toLowerCase();
        return (
          options.find((o) => o.toLowerCase() === v) ??
          options.find(
            (o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()),
          ) ??
          ""
        );
      };

      // Revenue matching: handles shorthand like "20-100K" → "$20K – $100K"
      const parseRevenueNum = (s: string): number => {
        const m = s
          .replace(/[$,\s]/g, "")
          .toLowerCase()
          .match(/^([\d.]+)([km]?)$/);
        if (!m) return NaN;
        const n = parseFloat(m[1]);
        if (m[2] === "k") return n * 1000;
        if (m[2] === "m") return n * 1_000_000;
        return n;
      };
      const matchRevenue = (raw: string | null | undefined): string => {
        if (!raw) return "";
        const parts = raw.split(/[-–—]/);
        const rawLow = parseRevenueNum(parts[0]);
        const rawHigh = parts[1] ? parseRevenueNum(parts[1]) : NaN;
        for (const opt of revenueRanges) {
          const op = opt.split(/[-–—]/);
          const oLow = parseRevenueNum(op[0]);
          const oHigh = op[1] ? parseRevenueNum(op[1]) : NaN;
          if (isNaN(rawLow) || isNaN(oLow)) continue;
          const lowMatch =
            Math.abs(rawLow - oLow) < 1 || Math.abs(rawLow * 1000 - oLow) < 1;
          if (!lowMatch) continue;
          const highMatch =
            (isNaN(rawHigh) && isNaN(oHigh)) ||
            (!isNaN(rawHigh) &&
              !isNaN(oHigh) &&
              (Math.abs(rawHigh - oHigh) < 1 ||
                Math.abs(rawHigh * 1000 - oHigh) < 1));
          if (highMatch) return opt;
        }
        return matchOpt(raw, revenueRanges);
      };

      // Array field matchers
      const matchList = (
        items: string[] | null | undefined,
        options: string[],
      ): string[] =>
        (items ?? []).map((r) => matchOpt(r, options)).filter(Boolean);

      const techFounder = p.technical_founder?.toLowerCase();

      setForm((prev) => ({
        ...prev,
        first_name: p.first_name || prev.first_name,
        last_name: p.last_name || prev.last_name,
        business_name: p.business_name || prev.business_name,
        role_title: p.role_title || prev.role_title,
        phone_whatsapp: p.phone || prev.phone_whatsapp,
        city: p.city || prev.city,
        short_bio: p.short_bio || prev.short_bio,
        linkedin_url: p.linkedin || prev.linkedin_url,
        sector: matchOpt(p.sector, sectorOptions) || prev.sector,
        employee_band:
          matchOpt(p.employee_band, employeeBands) || prev.employee_band,
        annual_revenue_estimate:
          matchRevenue(p.annual_revenue) || prev.annual_revenue_estimate,
        years_in_operation:
          matchOpt(p.years_in_operation, yearsOptions) ||
          prev.years_in_operation,
        how_heard_about:
          matchOpt(p.referral_source, hearAboutOptions) || prev.how_heard_about,
        referred_by: p.referral_name || prev.referred_by,
        member_role: prev.member_role || "startup",
        // Extended startup fields
        target_regions: matchList(p.target_regions, REGIONS).length
          ? matchList(p.target_regions, REGIONS)
          : prev.target_regions,
        target_industries: matchList(p.primary_industries, INDUSTRIES).length
          ? matchList(p.primary_industries, INDUSTRIES)
          : prev.target_industries,
        fundraising_stage:
          matchOpt(p.fundraising_stage, STAGES) || prev.fundraising_stage,
        product_stage:
          matchOpt(p.product_stage, PRODUCT_STAGES) || prev.product_stage,
        total_cofounders: p.co_founders || prev.total_cofounders,
        has_technical_founder:
          techFounder === "yes"
            ? "yes"
            : techFounder === "no"
              ? "no"
              : prev.has_technical_founder,
        target_raise_min:
          p.target_raise_min != null
            ? String(p.target_raise_min)
            : prev.target_raise_min,
        target_raise_max:
          p.target_raise_max != null
            ? String(p.target_raise_max)
            : prev.target_raise_max,
      }));

      // Pre-fill the project form (used in step 2)
      setProjectForm((prev) => ({
        name: p.project_name || p.venture || p.business_name || prev.name,
        description: p.description || p.additional_info || prev.description,
        stage: matchOpt(p.product_stage, PRODUCT_STAGES) || prev.stage,
        sector: matchOpt(p.sector, sectorOptions) || prev.sector,
      }));

      setPdfStatus("done");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse PDF.";
      setPdfError(msg);
      setPdfStatus("error");
      return false;
    }
  };

  const showLpFields = form.investment_interests.some(
    (i) => i.includes("Funds") || i.includes("Fund Manager"),
  );
  const showAnpBadge =
    form.investor_type === "Angel Networks" ||
    form.entity_class.includes("Angel");

  useEffect(() => {
    if (showAnpBadge) {
      setForm((prev) => ({ ...prev, anp_affiliated: true }));
    }
  }, [showAnpBadge]);

  const confirmRoleSelect = () => {
    if (!pendingRole) return;
    const defaultAsks =
      pendingRole === "investor"         ? ["Deal flow / Investment opportunities"]
      : pendingRole === "startup"        ? ["Funding / Investment capital"]
      : pendingRole === "ecosystem_partner" ? ["Deal flow / Investment pipeline"]
      : [];
    const defaultOffers =
      pendingRole === "investor"         ? ["Capital / Funding"]
      : pendingRole === "startup"        ? ["Technology / Product"]
      : pendingRole === "ecosystem_partner" ? ["Capital / Incubation / Acceleration"]
      : [];
    setForm((prev) => ({
      ...prev,
      member_role: pendingRole,
      ask_categories: defaultAsks,
      offer_categories: defaultOffers,
      ...EMPTY_EXTENDED,
    }));
    setErrors([]);
    setPendingRole(null);
    setRoleAgreeChecked(false);
    setStep("profile");
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setSuccess("");

    const errs: string[] = [];

    if (!form.first_name.trim()) errs.push("First name is required.");
    if (!form.last_name.trim()) errs.push("Last name is required.");
    if (!form.business_name.trim()) errs.push("Business name is required.");
    if (!form.sector) errs.push("Please choose at least one sector.");
    if (!form.how_heard_about)
      errs.push("Please tell us how you heard about FOUNDERS ARENA.");
    if (form.how_heard_about === "Referred by a member" && !form.referred_by.trim())
      errs.push("Please add the name of the person who referred you.");
    if (!form.phone_whatsapp.trim()) errs.push("Phone Number / WhatsApp is required.");
    if (!form.years_in_operation) errs.push("Years in operation is required.");
    if (!form.employee_band) errs.push("Employee band is required.");
    if (!form.annual_revenue_estimate) errs.push("Annual revenue range is required.");
    if (!form.role_title.trim()) errs.push("Role / title is required.");
    if (!form.city.trim()) errs.push("City is required.");
    if (!form.short_bio.trim()) errs.push("Short bio is required.");
    if (!form.linkedin_url.trim()) errs.push("LinkedIn profile URL is required.");
    if (!isAdminView && !form.member_role) errs.push("Please select your role.");

    const investorHasFundInterests = form.investment_interests.some(
      (i) => i.includes("Funds") || i.includes("Fund Manager"),
    );

    if (!isAdminView && form.member_role === "investor") {
      if (!form.investor_type) errs.push("Investor type is required.");
      if (!form.entity_class.length) errs.push("Please select at least one entity class.");
      if (!form.investment_interests.length) errs.push("Please select at least one investment interest.");
      if (!form.target_regions.length) errs.push("Please select at least one target region.");
      if (!form.target_industries.length) errs.push("Please select at least one target industry.");
      if (!form.target_stages.length) errs.push("Please select at least one target stage.");
      if (investorHasFundInterests) {
        if (!form.lp_check_min.trim()) errs.push("Minimum LP investment check size is required.");
        if (!form.lp_check_max.trim()) errs.push("Maximum LP investment check size is required.");
      }
      if (!form.direct_check_min.trim()) errs.push("Minimum direct startup check size is required.");
      if (!form.direct_check_max.trim()) errs.push("Maximum direct startup check size is required.");
      if (!form.referral_1_name.trim() || !form.referral_1_contact.trim())
        errs.push("Reference 1: name and contact are required.");
      if (!form.referral_2_name.trim() || !form.referral_2_contact.trim())
        errs.push("Reference 2: name and contact are required.");
      if (!form.referral_3_name.trim() || !form.referral_3_contact.trim())
        errs.push("Reference 3: name and contact are required.");
    }

    if (!isAdminView && form.member_role === "ecosystem_partner") {
      if (!form.support_types.length) errs.push("Please select your organization type.");
      if (!form.target_industries.length) errs.push("Please select at least one target industry.");
      if (!form.target_regions.length) errs.push("Please select at least one target region.");
      if (!form.referral_1_name.trim() || !form.referral_1_contact.trim())
        errs.push("Reference 1: name and contact are required.");
      if (!form.referral_2_name.trim() || !form.referral_2_contact.trim())
        errs.push("Reference 2: name and contact are required.");
      if (!form.referral_3_name.trim() || !form.referral_3_contact.trim())
        errs.push("Reference 3: name and contact are required.");
    }

    if (!form.pdpa_matching_consent)
      errs.push("You must agree to the data privacy consent to continue.");

    if (errs.length > 0) {
      setErrors(errs);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      // Use user-selected ask/offer categories; fall back to role defaults only if empty.
      const defaultAsks =
        form.member_role === "investor"         ? ["Deal flow / Investment opportunities"]
        : form.member_role === "startup"        ? ["Funding / Investment capital"]
        : form.member_role === "ecosystem_partner" ? ["Deal flow / Investment pipeline"]
        : ["General networking"];

      const defaultOffers =
        form.member_role === "investor"         ? ["Capital / Funding"]
        : form.member_role === "startup"        ? ["Technology / Product"]
        : form.member_role === "ecosystem_partner"
          ? (form.support_types.length ? form.support_types : ["Capital / Incubation / Acceleration"])
        : ["Industry expertise"];

      const ask_categories   = form.ask_categories.length   > 0 ? form.ask_categories   : defaultAsks;
      const offer_categories = form.offer_categories.length > 0 ? form.offer_categories : defaultOffers;

      // Startup extended fields are collected in the dedicated "startup" step
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
                {
                  name: form.referral_1_name,
                  contact: form.referral_1_contact,
                },
                {
                  name: form.referral_2_name,
                  contact: form.referral_2_contact,
                },
                {
                  name: form.referral_3_name,
                  contact: form.referral_3_contact,
                },
              ],
            }
          : form.member_role === "ecosystem_partner"
            ? {
                _v: 2,
                support_types: form.support_types,
                target_industries: form.target_industries,
                target_regions: form.target_regions,
                target_stages: form.target_stages,
                referrals: [
                  {
                    name: form.referral_1_name,
                    contact: form.referral_1_contact,
                  },
                  {
                    name: form.referral_2_name,
                    contact: form.referral_2_contact,
                  },
                  {
                    name: form.referral_3_name,
                    contact: form.referral_3_contact,
                  },
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
        asks_summary: extendedPayload
          ? JSON.stringify(extendedPayload)
          : undefined,
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
          setStep("startup");
        }, 600);
      } else {
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Save failed."]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartupSubmit = async (skipProject = false) => {
    setStartupLoading(true);
    setStartupError("");

    function failStartup(msg: string) {
      setStartupError(msg);
      setStartupLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return undefined as never;
    }

    if (!form.target_regions.length)
      return failStartup("Please select at least one target region.");
    if (!form.target_industries.length)
      return failStartup("Please select at least one target industry.");
    if (!form.fundraising_stage)
      return failStartup("Please select your current fundraising stage.");
    if (!form.product_stage)
      return failStartup("Please select your product stage.");
    if (!form.total_cofounders.trim())
      return failStartup("Please enter the number of co-founders.");
    if (!form.target_raise_min.trim())
      return failStartup("Please enter a minimum target raise amount.");
    if (!form.target_raise_max.trim())
      return failStartup("Please enter a maximum target raise amount.");
    if (!skipProject && !projectForm.name.trim())
      return failStartup("Project name is required.");

    try {
      const startupExtended = {
        _v: 2,
        target_regions: form.target_regions,
        target_industries: form.target_industries,
        fundraising_stage: form.fundraising_stage,
        product_stage: form.product_stage,
        total_cofounders: form.total_cofounders,
        has_technical_founder: form.has_technical_founder,
        pitch_deck_url: form.pitch_deck_url,
        target_raise_min: form.target_raise_min,
        target_raise_max: form.target_raise_max,
      };

      // Re-send full profile payload so the API upsert has all required fields
      const profileRes = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
          member_role: "startup",
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
          ask_categories: ["Funding / Investment capital"],
          offer_categories: ["Technology / Product"],
          asks_summary: JSON.stringify(startupExtended),
          offers_summary: form.offers_summary.trim() || undefined,
          pdpa_matching_consent: form.pdpa_matching_consent,
          additional_notes: form.additional_notes.trim() || undefined,
        }),
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData?.error || "Save failed");

      if (!skipProject) {
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectForm.name.trim(),
            description: projectForm.description.trim() || undefined,
            stage: form.product_stage || undefined,
            sector: form.sector || undefined,
          }),
        });
        if (!projectRes.ok) {
          const d = await projectRes.json();
          return failStartup(d?.error ?? "Failed to create project.");
        }
      }

      router.push("/projects/new");
    } catch (err) {
      setStartupError(err instanceof Error ? err.message : "Save failed.");
      setStartupLoading(false);
    }
  };

  const handleInviteAccept = async () => {
    setInviteLoading(true);
    setInviteError("");

    let token = inviteLink.trim();
    try {
      const url = new URL(token);
      token = url.searchParams.get("token") ?? token;
    } catch {
      // not a full URL — treat the raw string as the token
    }

    if (!token) {
      setInviteError("Please paste your invite link.");
      setInviteLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/cofounders/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to accept invite.");
      router.push("/dashboard");
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to accept invite.",
      );
      setInviteLoading(false);
    }
  };

  const ROLE_META: Record<
    "investor" | "startup" | "ecosystem_partner",
    {
      label: string;
      description: string;
      detail: string;
      features: string[];
      commitment: string;
    }
  > = {
    investor: {
      label: "Investor",
      description: "I deploy capital and seek deal flow",
      detail:
        "You'll be asked to fill in your investment thesis, check sizes, target stages, and 3 references who can verify your role.",
      features: [
        "Browse and filter curated deal flow from vetted startups",
        "Access startup pitch decks, data rooms, and project details",
        "Get matched with founders based on your investment thesis, stage, and sector preferences",
        "Participate as a Demo Day judge and evaluator",
        "Connect and co-invest with other investors and ecosystem partners",
        "Receive inbound introductions from accelerators and incubators",
      ],
      commitment:
        "I confirm I am an active investor or deploying capital, and that the references I provide can verify my role.",
    },
    startup: {
      label: "Founder",
      description: "I'm building a company and raising capital",
      detail:
        "You'll complete a fundraising profile including your stage, raise target, and product details — then add your first project.",
      features: [
        "Create a public founder profile visible to investors and partners",
        "List your fundraising round, raise target, and product stage",
        "Get matched with investors aligned to your sector, stage, and region",
        "Upload pitch decks and manage a secure data room",
        "Collaborate with co-founders on a shared project record",
        "Apply to accelerator programs, Demo Days, and platform events",
      ],
      commitment:
        "I confirm I am actively building a startup or company and am seeking capital, partnerships, or ecosystem support.",
    },
    ecosystem_partner: {
      label: "Ecosystem Partner",
      description:
        "I deploy capital or build startups — TBI, accelerator, VC, or angel",
      detail:
        "You'll set your organization type, investment mandate, target sectors and stages, and provide 3 references who can verify your role.",
      features: [
        "Showcase your organization to a network of founders and investors",
        "Source and filter deal flow from vetted, platform-verified startups",
        "Offer mentorship, advisory, technical, or operational support to startups",
        "Co-invest and syndicate deals with other ecosystem partners",
        "Get matched with startups in your focus sectors, stages, and regions",
        "Host or participate in accelerator cohorts, workshops, and Demo Days",
      ],
      commitment:
        "I confirm my organization operates in the startup ecosystem — as a TBI, accelerator, VC, angel network, or equivalent — and that my references can verify this.",
    },
  };

  if (step === "role") {
    if (!profileLoaded) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        </div>
      );
    }
    return (
      <>
        {pendingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] shadow-xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-8 pt-8 pb-4 border-b border-[var(--color-hairline)]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                  About this role
                </p>
                <h2 className="mt-2 text-xl font-700 text-[var(--color-ink)]">
                  {ROLE_META[pendingRole].label}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {ROLE_META[pendingRole].description}
                </p>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto px-8 py-5 flex-1">
                <p className="text-sm text-[var(--color-body)]">
                  {ROLE_META[pendingRole].detail}
                </p>

                <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                  What you can do
                </p>
                <ul className="mt-3 space-y-2">
                  {ROLE_META[pendingRole].features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-[var(--color-body)]"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <i
                          className="ri-check-line text-[10px] leading-none"
                          aria-hidden="true"
                        />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                  Your role cannot be changed after confirmation. Make sure this
                  is correct.
                </p>
              </div>

              {/* Footer — agree + actions */}
              <div className="px-8 py-5 border-t border-[var(--color-hairline)] space-y-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={roleAgreeChecked}
                    onChange={(e) => setRoleAgreeChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--color-hairline)] accent-[var(--color-primary)] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--color-body)] leading-relaxed">
                    {ROLE_META[pendingRole].commitment}
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRole(null);
                      setRoleAgreeChecked(false);
                    }}
                    className="flex-1 rounded-xl border border-[var(--color-hairline)] py-2.5 text-sm font-600 text-[var(--color-ink)] hover:bg-[var(--color-surface-soft)] transition-colors"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={confirmRoleSelect}
                    disabled={!roleAgreeChecked}
                    className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-600 text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    Confirm — I&apos;m a {ROLE_META[pendingRole].label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="min-h-screen bg-[var(--color-canvas)] px-4 sm:px-6 py-12">
          <div className="mx-auto max-w-[520px]">
            <div className="rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                Before you start
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                What brings you to FOUNDERS ARENA?
              </h1>
              <p className="mt-3 text-sm text-[var(--color-body)]">
                Choose the role that best describes you. This shapes how we
                match you and what information we collect — it can&apos;t be
                changed later.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <RoleCard
                  value="startup"
                  current={form.member_role}
                  onSelect={setPendingRole}
                  title="Founder"
                  description="I'm building a company and raising capital"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <RoleCard
                  value="investor"
                  current={form.member_role}
                  onSelect={setPendingRole}
                  title="Investor"
                  description="I deploy capital and seek deal flow"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  }
                />
                <RoleCard
                  value="ecosystem_partner"
                  current={form.member_role}
                  onSelect={setPendingRole}
                  title="Ecosystem Partner"
                  description="I deploy capital or build startups — TBI, accelerator, VC, or angel"
                  icon={
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>
        {user && (
          <div className="fixed z-50 bottom-4 left-0 right-0 px-4 text-center text-sm text-[var(--color-muted)] pointer-events-none">
            <div className="mx-auto max-w-[520px] pointer-events-auto">
              <div className="inline-flex items-center justify-center gap-3 rounded-xl bg-[var(--color-surface-soft)]/95 border border-[var(--color-hairline)] px-4 py-2 shadow-lg">
                <p className="text-sm text-[var(--color-muted)] m-0">
                  Not you?
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut?.();
                    router.push("/sign-in");
                  }}
                  className="ml-1 font-medium text-[var(--color-primary)] hover:underline"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (step === "startup") {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)] px-4 sm:px-6 py-12">
        <div className="mx-auto max-w-[900px] rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Step 2 of 2
          </div>
          <div className="mt-6 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-6 space-y-4">
            <h1 className="text-2xl font-700 text-[var(--color-ink)]">
              Founder profile saved
            </h1>
            <p className="text-sm text-[var(--color-body)]">
              Next, register your startup/project profile. The Venture
              Confidence Assessment belongs on the project record, not the
              founder profile.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/projects/new" className="gn-btn-primary">
                Register a project
              </Link>
              <button
                type="button"
                onClick={handleInviteAccept}
                className="rounded-xl border border-[var(--color-hairline)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
              >
                I was invited as a co-founder
              </button>
            </div>
          </div>
        </div>
        {user && (
          <div className="fixed z-50 bottom-4 left-0 right-0 px-4 text-center text-sm text-[var(--color-muted)] pointer-events-none">
            <div className="mx-auto max-w-[900px] pointer-events-auto">
              <div className="inline-flex items-center justify-center gap-3 rounded-xl bg-[var(--color-surface-soft)]/95 border border-[var(--color-hairline)] px-4 py-2 shadow-lg">
                <p className="text-sm text-[var(--color-muted)] m-0">
                  Not you?
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut?.();
                    router.push("/sign-in");
                  }}
                  className="ml-1 font-medium text-[var(--color-primary)] hover:underline"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-[900px] rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8">
        {!isAdminView && form.member_role === "startup" && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Step 1 of 2
          </div>
        )}
        <h1 className="text-2xl font-700 text-[var(--color-ink)]">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-[var(--color-body)]">
          Provide the key details we use to generate curated strategic matches
          for you.
        </p>

        {user && (
          <div className="fixed z-50 bottom-4 left-0 right-0 px-4 text-center pointer-events-none">
            <div className="mx-auto max-w-[900px] pointer-events-auto">
              <div className="inline-flex items-center justify-center gap-3 rounded-xl bg-[var(--color-surface-soft)]/95 border border-[var(--color-hairline)] px-4 py-2 shadow-lg">
                <p className="text-sm text-[var(--color-muted)] m-0">
                  Not you?
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut?.();
                    router.push("/sign-in");
                  }}
                  className="ml-1 font-medium text-[var(--color-primary)] hover:underline"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
        {errors.length > 0 && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">
                  Please complete the following required fields:
                </p>
                <ul className="mt-2 space-y-1">
                  {errors.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-sm text-red-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="first_name"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                First name <Req />
              </label>
              <input
                id="first_name"
                className="gn-input mt-1"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Last name <Req />
              </label>
              <input
                id="last_name"
                className="gn-input mt-1"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="business_name"
              className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
            >
              Business name <Req />
            </label>
            <input
              id="business_name"
              className="gn-input mt-1"
              value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="how_heard_about"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                How did you hear about FOUNDERS ARENA? <Req />
              </label>
              <select
                id="how_heard_about"
                className="gn-input mt-1"
                value={form.how_heard_about}
                onChange={(e) => set("how_heard_about", e.target.value)}
              >
                <option value="">Select one</option>
                {hearAboutOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="referred_by"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                If referred, who referred you?{" "}
                {form.how_heard_about === "Referred by a member" && <Req />}
              </label>
              <input
                id="referred_by"
                className="gn-input mt-1"
                value={form.referred_by}
                onChange={(e) => set("referred_by", e.target.value)}
                placeholder="Referral name — type none if none"
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Type <span className="font-medium">none</span> if you were not
                referred by anyone.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="phone_whatsapp"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Phone Number / WhatsApp <Req />
              </label>
              <input
                id="phone_whatsapp"
                className="gn-input mt-1"
                value={form.phone_whatsapp}
                onChange={(e) => set("phone_whatsapp", e.target.value)}
                placeholder="+63…"
              />
            </div>
            <div>
              <label
                htmlFor="years_in_operation"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Years in Operation <Req />
              </label>
              <select
                id="years_in_operation"
                className="gn-input mt-1"
                value={form.years_in_operation}
                onChange={(e) => set("years_in_operation", e.target.value)}
              >
                <option value="">Select one</option>
                {yearsOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="role_title"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Role / title <Req />
              </label>
              <input
                id="role_title"
                className="gn-input mt-1"
                value={form.role_title}
                onChange={(e) => set("role_title", e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="city"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                City <Req />
              </label>
              <input
                id="city"
                className="gn-input mt-1"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]">
              Sector{" "}
              <span className="text-xs font-400 text-[var(--color-muted)]">
                (select all that apply)
              </span>{" "}
              <Req />
            </p>
            {form.sector && (
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Selected:{" "}
                <span className="font-600 text-[var(--color-primary)]">
                  {form.sector.split(",").join(", ")}
                </span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {sectorOptions.map((s) => {
                const selected = form.sector.split(",").filter(Boolean).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const current = form.sector.split(",").filter(Boolean);
                      const updated = current.includes(s)
                        ? current.filter((x) => x !== s)
                        : [...current, s];
                      set("sector", updated.join(","));
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-500 transition-colors ${
                      selected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="short_bio"
              className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
            >
              Short bio (1–2 sentences) <Req />
            </label>
            <textarea
              id="short_bio"
              className="gn-input mt-1 h-24"
              value={form.short_bio}
              onChange={(e) => set("short_bio", e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="linkedin_url"
              className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
            >
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
              <label
                htmlFor="employee_band"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Employee band <Req />
              </label>
              <select
                id="employee_band"
                className="gn-input mt-1"
                value={form.employee_band}
                onChange={(e) => set("employee_band", e.target.value)}
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
              <label
                htmlFor="annual_revenue_estimate"
                className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
              >
                Annual revenue (estimate) <Req />
              </label>
              <select
                id="annual_revenue_estimate"
                className="gn-input mt-1"
                value={form.annual_revenue_estimate}
                onChange={(e) => set("annual_revenue_estimate", e.target.value)}
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
                          ? "Founder"
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
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      }
                    />
                    <RoleCard
                      value="startup"
                      current={form.member_role}
                      onSelect={setPendingRole}
                      title="Founder"
                      description="I'm building a company and raising capital"
                      icon={
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
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
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
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

              {/* ─── Startup Ask & Offer ───────────────────────────────────── */}
              {form.member_role === "startup" && (
                <SectionCard
                  label="Ask &amp; Offer"
                  description="Tell us what your startup needs and what it brings. This directly powers Investment Thesis matching with investors and ecosystem partners."
                >
                  <Field label="What are you looking for?">
                    <p className="mb-2 text-xs text-[var(--color-muted)]">Select everything that applies.</p>
                    <div className="flex flex-wrap gap-2">
                      {STARTUP_ASKS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAskOffer("ask_categories", item)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            form.ask_categories.includes(item)
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="What does your startup offer to partners?">
                    <div className="flex flex-wrap gap-2">
                      {STARTUP_OFFERS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAskOffer("offer_categories", item)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            form.offer_categories.includes(item)
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                              : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </Field>
                </SectionCard>
              )}

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
                          {INVESTOR_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
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

                    {/* ANP affiliation — automatic for Angel Networks type or Angel entity class */}
                    {showAnpBadge && (
                      <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600">
                          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-violet-800">
                            Automatic reciprocal membership — ANP · Bit Angels Philippines
                          </p>
                          <p className="mt-0.5 text-xs text-violet-600">
                            As an angel investor, you will automatically be enrolled as a member of Angel Network Philippines – Bit Angels Philippines for shared deal flow and co-investment visibility.
                          </p>
                        </div>
                      </div>
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
                      <p className="mb-2 text-xs text-[var(--color-muted)]">
                        Select all that apply.
                      </p>
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
                    label="Section C — Ask &amp; Offer"
                    description="Tell us what you're looking for and what you bring to the table. This directly powers Investment Thesis matching."
                  >
                    <Field label="What are you looking for?">
                      <p className="mb-2 text-xs text-[var(--color-muted)]">Select everything that applies — used for ask/offer compatibility scoring.</p>
                      <div className="flex flex-wrap gap-2">
                        {INVESTOR_ASKS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAskOffer("ask_categories", item)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.ask_categories.includes(item)
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="What do you offer to startups?">
                      <div className="flex flex-wrap gap-2">
                        {INVESTOR_OFFERS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAskOffer("offer_categories", item)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.offer_categories.includes(item)
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </SectionCard>

                  <SectionCard
                    label="Section D — Financials"
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

                  <SectionCard
                    label="Section E — References"
                    description="Provide 3 people who can verify your role as an investor. All fields required."
                  >
                    {([1, 2, 3] as const).map((n) => (
                      <div
                        key={n}
                        className="space-y-3 rounded-lg border border-[var(--color-hairline)] p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                          Reference {n}
                        </p>
                        <FieldRow>
                          <Field label="Full Name" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="e.g. Juan dela Cruz"
                              value={
                                form[
                                  `referral_${n}_name` as keyof typeof form
                                ] as string
                              }
                              onChange={(e) =>
                                set(`referral_${n}_name`, e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Email / LinkedIn / Phone" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="email, linkedin.com/in/... or +63..."
                              value={
                                form[
                                  `referral_${n}_contact` as keyof typeof form
                                ] as string
                              }
                              onChange={(e) =>
                                set(`referral_${n}_contact`, e.target.value)
                              }
                            />
                          </Field>
                        </FieldRow>
                      </div>
                    ))}
                  </SectionCard>
                </div>
              )}

              {/* ─── Ecosystem Partner sections ────────────────────────── */}
              {form.member_role === "ecosystem_partner" && (
                <div className="space-y-4">
                  <SectionCard label="Section A — Organization & Investment Mandate">
                    <Field label="Organization Type" req>
                      <p className="mb-2 text-xs text-[var(--color-muted)]">
                        Select the category that best describes your
                        organization.
                      </p>
                      <PillToggle
                        options={INVESTOR_TYPES}
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

                      <Field label="Sector Focus" req>
                        <SearchableMultiSelect
                          options={INDUSTRIES}
                          value={form.target_industries}
                          onChange={(v) => setArr("target_industries", v)}
                          placeholder="Search industries…"
                          allowSelectAll
                        />
                      </Field>
                    </FieldRow>

                    <Field label="Stage Preference">
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

                  <SectionCard
                    label="Section B — Ask &amp; Offer"
                    description="Tell us what your organisation is looking for and what it offers to startups. This powers mandate-fit scoring."
                  >
                    <Field label="What are you looking for?">
                      <div className="flex flex-wrap gap-2">
                        {ECO_ASKS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAskOffer("ask_categories", item)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.ask_categories.includes(item)
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="What do you offer to startups?">
                      <p className="mb-2 text-xs text-[var(--color-muted)]">Your support types above are included automatically — add anything extra here.</p>
                      <div className="flex flex-wrap gap-2">
                        {ECO_OFFERS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleAskOffer("offer_categories", item)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              form.offer_categories.includes(item)
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                                : "border-[var(--color-hairline)] bg-[var(--color-canvas)] text-[var(--color-body)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </SectionCard>

                  <SectionCard
                    label="Section C — References"
                    description="Provide 3 people who can verify your organization (e.g. colleagues, portfolio founders, co-investors). All fields required."
                  >
                    {([1, 2, 3] as const).map((n) => (
                      <div
                        key={n}
                        className="space-y-3 rounded-lg border border-[var(--color-hairline)] p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                          Reference {n}
                        </p>
                        <FieldRow>
                          <Field label="Full Name" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="e.g. Juan dela Cruz"
                              value={
                                form[
                                  `referral_${n}_name` as keyof typeof form
                                ] as string
                              }
                              onChange={(e) =>
                                set(`referral_${n}_name`, e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Email / LinkedIn / Phone" req>
                            <input
                              type="text"
                              className="gn-input"
                              placeholder="email, linkedin.com/in/... or +63..."
                              value={
                                form[
                                  `referral_${n}_contact` as keyof typeof form
                                ] as string
                              }
                              onChange={(e) =>
                                set(`referral_${n}_contact`, e.target.value)
                              }
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
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pdpa_matching_consent: e.target.checked,
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
            <label
              htmlFor="additional_notes"
              className="flex items-center gap-2 text-sm font-600 text-[var(--color-ink)]"
            >
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
  );
}
