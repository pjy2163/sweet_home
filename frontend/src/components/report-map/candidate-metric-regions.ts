import type {
  CandidateMatchRegion,
  HeatmapRegion,
} from "@/types/sweethome";

import type { ReportRegion } from "./types";

export function mergeCandidateMetricRegions(
  candidates: CandidateMatchRegion[],
  metricRegions: HeatmapRegion[],
): ReportRegion[] {
  const metricByRegionId = new Map(
    metricRegions.map((region) => [region.region_id, region]),
  );

  return candidates.map((candidate) => {
    const metricRegion = metricByRegionId.get(candidate.region_id);

    return {
      region_id: candidate.region_id,
      gu_name: candidate.gu_name,
      dong_name: candidate.dong_name,
      display_name: candidate.display_name,
      area_km2: candidate.area_km2 ?? metricRegion?.area_km2 ?? null,
      centroid_lon: candidate.centroid_lon ?? metricRegion?.centroid_lon ?? null,
      centroid_lat: candidate.centroid_lat ?? metricRegion?.centroid_lat ?? null,
      map_x: candidate.map_x ?? metricRegion?.map_x ?? null,
      map_y: candidate.map_y ?? metricRegion?.map_y ?? null,
      value: metricRegion?.value ?? null,
      percentile: metricRegion?.percentile ?? null,
      level: metricRegion?.level ?? "no_data",
      has_data: metricRegion?.has_data ?? false,
      match_count: candidate.match_count,
      matched_indicators: candidate.matched_indicators,
      indicator_summary: candidate.indicator_summary,
      evidence_metrics: candidate.evidence_metrics,
      selection_source: "candidate",
    };
  });
}
