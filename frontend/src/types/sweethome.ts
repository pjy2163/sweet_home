export type RegionOption = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
};

export type AuthSession = {
  authenticated: true;
  provider: string;
};

export type AgreementStatus = {
  accepted: boolean;
  terms_version: string;
  privacy_notice_version: string;
  accepted_at: string | null;
};

export type SavedReportCreate = {
  client_request_id: string;
  region_ids: string[];
  priority_keys: ExploreCondition[];
  comparison_basis: "seoul" | "direct";
  decision_context?: SavedReportDecisionContext;
  preview_regions?: CandidateMatchRegion[];
  preview_detailed_regions?: RegionMetrics[];
};

export type SavedReportDecisionContext = {
  selection_mode: "candidate" | "direct_map";
  contract_type?: "monthly_rent" | "jeonse";
  budget_max_krw_10k?: number;
  building_type?: HousingBuildingType;
  area_band?: HousingAreaBand;
};

export type SavedReportSummary = {
  report_id: string;
  region_ids: string[];
  region_names: string[];
  priority_keys: ExploreCondition[];
  comparison_basis: "seoul" | "direct";
  title: string;
  summary: string;
  data_version: string;
  created_at: string;
};

export type SavedReportDetail = SavedReportSummary & {
  report_content: {
    title: string;
    summary: string;
    region_names: string[];
    priority_labels: string[];
    decision_flow: {
      candidate_count: number;
      comparison_basis: "seoul" | "direct";
      notice: string;
    };
    decision_context?: SavedReportDecisionContext | null;
    regions: CandidateMatchRegion[];
    detailed_regions?: RegionMetrics[];
    source: string;
    limitation: string;
  };
};

export type Metadata = {
  region_count: number;
  price_latest_month: string | null;
  population_latest_month: string | null;
  safety_latest_date: string | null;
  commercial_latest_quarter: string | null;
  transport_latest_date: string | null;
  source: string;
  aggregation: string;
  limitation: string;
};

export type RegionMetrics = {
  region_id: string;
  gu_name: string;
  dong_name: string;
  display_name: string;
  price_month: string | null;
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
  population_month: string | null;
  living_population: number | null;
  daytime_living_population: number | null;
  nighttime_living_population: number | null;
  day_night_population_ratio: number | null;
  safety_date: string | null;
  safe_facility_count: number | null;
  nightlife_count: number | null;
  commercial_date: string | null;
  industry_count: number | null;
  store_count: number | null;
  transport_date: string | null;
  subway_station_count: number | null;
  subway_line_count: number | null;
  nearest_subway_station_name: string | null;
  nearest_subway_distance_m: number | null;
  bus_stop_count: number | null;
  bus_stop_density: number | null;
  has_price_data: boolean;
  has_population_data: boolean;
  has_safety_data: boolean;
  has_commercial_data: boolean;
  has_transport_data: boolean;
};

export type CompareResponse = {
  region_a: RegionMetrics;
  region_b: RegionMetrics;
  summary: string[];
  data_basis: string[];
};

export type ExploreCondition =
  | "safety"
  | "convenience"
  | "price"
  | "population"
  | "transport";

export type HousingBuildingType =
  | "apartment"
  | "officetel"
  | "multi_family"
  | "detached_multiunit";

export type HousingAreaBand = "compact" | "mid_size" | "large";

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
  contract_type: "monthly_rent" | "jeonse" | null;
  budget_max_krw_10k: number | null;
  budget_filter_applied: boolean;
  building_type: HousingBuildingType | null;
  area_band: HousingAreaBand | null;
  direct_candidate_count: number;
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
  | "daytime_living_population"
  | "nighttime_living_population"
  | "safe_facility_density"
  | "store_density"
  | "bus_stop_density";

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
  source_name: string;
  source_url: string | null;
  source_license: string | null;
  data_date: string | null;
  methodology: string;
  aggregation: string;
  limitation: string;
  metric_label: string;
  metric_description: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  region_count: number;
  data_region_count: number;
  missing_region_count: number;
};

export type HeatmapResponse = {
  metric: HeatmapMetric;
  regions: HeatmapRegion[];
  metadata: HeatmapMetadata;
};
