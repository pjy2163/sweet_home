import type {
  CandidateEvidenceMetric,
  ExploreCondition,
} from "@/types/sweethome";

export function filterEvidenceMetrics(
  metrics: CandidateEvidenceMetric[],
  selectedConditions: ExploreCondition[],
  showCautionMetrics: boolean,
) {
  return metrics.filter(
    (metric) =>
      selectedConditions.includes(metric.condition)
      && (showCautionMetrics
        || (metric.level !== "주의" && metric.reliability !== "표본 적음")),
  );
}
