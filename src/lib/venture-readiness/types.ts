export type DimensionSection = {
  findings: string[];
  recommendations: string[];
};

export type ProjectProfile = {
  venture: string | null;
  project_name: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  phone: string | null;
  role_title: string | null;
  city: string | null;
  sector: string | null;
  short_bio: string | null;
  linkedin: string | null;
  employee_band: string | null;
  annual_revenue: string | null;
  role: string | null;
  years_in_operation: string | null;
  referral_source: string | null;
  referral_name: string | null;
  target_regions: string[];
  primary_industries: string[];
  fundraising_stage: string | null;
  product_stage: string | null;
  co_founders: string | null;
  technical_founder: string | null;
  pitch_deck: string | null;
  target_raise_min: number | null;
  target_raise_max: number | null;
  pdpa: string | null;
  additional_info: string | null;
};

export type ReadinessScores = {
  technology: number | null;
  business: number | null;
  investment: number | null;
  team: number | null;
};

export type ExecutiveSummary = {
  assessment: ReadinessScores;
  key_strengths: string[];
  priority_actions: string[];
};

export type Conclusion = {
  recommended_next_steps: string[];
};

export type DimensionSections = {
  ideas_worth_pursuing: DimensionSection;
  problem: DimensionSection;
  solution: DimensionSection;
  team: DimensionSection;
  scalability: DimensionSection;
  bm_viability: DimensionSection;
  risk_mitigation: DimensionSection;
};

export type VentureReadinessReport = {
  report_date: string | null;
  profile: ProjectProfile;
  executive_summary: ExecutiveSummary;
  conclusion: Conclusion;
  sections: DimensionSections;
};
