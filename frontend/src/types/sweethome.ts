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
