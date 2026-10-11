import type {
  CandidateEvidenceMetric,
  CandidatePriceBasis,
  ExploreCondition,
  HeatmapRegion,
} from "@/types/sweethome";

export type CandidateState = "saved" | "excluded";

export type ReportRegion = HeatmapRegion & {
  match_count?: number;
  matched_indicators?: string[];
  indicator_summary?: Record<string, string>;
  evidence_metrics?: CandidateEvidenceMetric[];
  price_basis?: CandidatePriceBasis | null;
  selection_source?: "candidate" | "map_click";
};

export type OpenCandidateReport = {
  region: ReportRegion;
};

export type EvidenceProfile = {
  condition: ExploreCondition;
  label: string;
  status: string;
  detail: string;
  position: number;
  caution: boolean;
  matched: boolean;
};
