export type RegionOption = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
};

export type Metadata = {
  region_count: number;
  price_latest_month: string | null;
  population_latest_month: string | null;
  safety_latest_date: string | null;
  commercial_latest_quarter: string | null;
  source: string;
  aggregation: string;
  limitation: string;
};

export type RegionMetrics = {
  display_name: string;
  price_latest_available_month: string | null;
  price_selection_policy: string | null;
  price_month_lag: number | null;
  deposit: number | null;
  seoul_deposit: number | null;
  deposit_ratio: number | null;
  jeonse: number | null;
  seoul_jeonse: number | null;
  jeonse_ratio: number | null;
  volume: number | null;
  low_volume: boolean;
  living_population: number | null;
  safe_facility_count: number | null;
  nightlife_count: number | null;
  industry_count: number | null;
  store_count: number | null;
  has_price_data: boolean;
  has_population_data: boolean;
  has_safety_data: boolean;
  has_commercial_data: boolean;
};

export type CompareResponse = {
  region_a: RegionMetrics;
  region_b: RegionMetrics;
  summary: string[];
  data_basis: string[];
};

export type RegionGroups = Record<string, RegionOption[]>;

export type ExploreCondition =
  | "safety"
  | "convenience"
  | "price"
  | "population"
  | "transport";

export type CandidateMatchRegion = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
  area_km2: number | null;
  centroid_lon: number | null;
  centroid_lat: number | null;
  map_x: number | null;
  map_y: number | null;
  match_count: number;
  matched_indicators: string[];
  indicator_summary: Record<string, string>;
  evidence_metrics: CandidateEvidenceMetric[];
};

export type CandidateEvidenceMetric = {
  condition: ExploreCondition;
  label: string;
  value: number | null;
  unit: string;
  display_value: string;
  interpretation: string;
  level: string;
  is_matched: boolean;
  data_date: string | null;
  reliability: string;
};

export type ExploreMetadata = {
  source: string;
  aggregation: string;
  limitation: string;
  transport_status: string;
};

export type ExploreResponse = {
  selected_conditions: ExploreCondition[];
  regions: CandidateMatchRegion[];
  metadata: ExploreMetadata;
};

export type HeatmapMetric =
  | "deposit_ratio"
  | "jeonse_ratio"
  | "living_population"
  | "safe_facility_density"
  | "store_density";

export type HeatmapLevel =
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high"
  | "no_data";

export type HeatmapRegion = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
  area_km2: number | null;
  centroid_lon: number | null;
  centroid_lat: number | null;
  map_x: number | null;
  map_y: number | null;
  value: number | null;
  percentile: number | null;
  level: HeatmapLevel;
  has_data: boolean;
};

export type HeatmapMetadata = {
  source: string;
  aggregation: string;
  limitation: string;
  metric_label: string;
  metric_description: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  region_count: number;
  data_region_count: number;
};

export type HeatmapResponse = {
  metric: HeatmapMetric;
  regions: HeatmapRegion[];
  metadata: HeatmapMetadata;
};

export type AIReportPriority = Exclude<ExploreCondition, "transport">;

export type AIReportPreviewRequest = {
  region_a: string;
  region_b: string;
  priorities?: AIReportPriority[];
  comparison_basis?: "seoul" | "direct";
};

export type EvidenceQualityStatus = "reliable" | "caution" | "missing";

export type EvidenceRegion = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
};

export type EvidenceQualityFlag = {
  code: string;
  severity: "info" | "caution" | "unavailable";
  domain: AIReportPriority | null;
  region_id: string | null;
  evidence_ids: string[];
  message: string;
};

export type EvidenceChartDatum = {
  evidence_id: string;
  region_id: string;
  label: string;
  value: number | null;
  quality_status: EvidenceQualityStatus;
};

export type EvidenceChartSpec = {
  chart_id: string;
  chart_type: "dumbbell" | "reference_dot";
  semantic: "candidate_comparison" | "relative_to_reference";
  title: string;
  metric_key: string;
  unit: string;
  lower_label: string;
  higher_label: string;
  favorable_direction: "none";
  axis_basis: "seoul_observed_range";
  axis_min: number;
  axis_max: number;
  data: EvidenceChartDatum[];
  reference: { label: string; value: number } | null;
  related_quality_flag_codes: string[];
};

export type InterpretationPolicy = {
  policy_id: string;
  label: string;
  kind: "data_quality" | "product_heuristic" | "distribution_band";
  status: "active" | "review_required";
  definition: string;
  threshold_values: number[];
  unit: string;
  source: string;
  rationale: string;
  limitation: string;
};

export type AIReportEvidencePack = {
  schema_version: string;
  data_version: string;
  request: AIReportPreviewRequest;
  regions: EvidenceRegion[];
  chart_specs: EvidenceChartSpec[];
  quality_flags: EvidenceQualityFlag[];
  interpretation_policies: InterpretationPolicy[];
};

export type AIReportSection = {
  heading: string;
  analysis: string;
  evidence_ids: string[];
};

export type AIReportResponse = {
  schema_version: string;
  report_id: string;
  generation_mode: "openai" | "deterministic_fallback";
  model: string | null;
  prompt_version: string;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  fallback_reason: string | null;
  evidence: AIReportEvidencePack;
  report: {
    executive_summary: string;
    sections: AIReportSection[];
    cautions: string[];
    next_checks: string[];
  };
};
