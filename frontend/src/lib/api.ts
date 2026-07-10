import type {
  CompareResponse,
  ExploreCondition,
  ExploreResponse,
  HeatmapMetric,
  HeatmapResponse,
  Metadata,
  RegionOption,
} from "@/types/sweethome";

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? fallbackMessage);
  }

  return payload as T;
}

export async function fetchRegions() {
  const response = await fetch("/api/backend/regions");

  return parseJsonResponse<RegionOption[]>(
    response,
    "지역 목록을 불러오지 못했습니다.",
  );
}

export async function fetchMetadata() {
  const response = await fetch("/api/backend/metadata");

  return parseJsonResponse<Metadata>(
    response,
    "데이터 기준을 불러오지 못했습니다.",
  );
}

export async function fetchComparison(regionA: string, regionB: string) {
  const params = new URLSearchParams({ a: regionA, b: regionB });
  const response = await fetch(`/api/backend/compare?${params.toString()}`);

  return parseJsonResponse<CompareResponse>(
    response,
    "지역 비교에 실패했습니다.",
  );
}

export async function fetchCandidateMatches(
  selectedConditions: ExploreCondition[],
  limit = 8,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  selectedConditions.forEach((condition) => {
    params.set(condition, "true");
  });

  const response = await fetch(`/api/backend/explore?${params.toString()}`);

  return parseJsonResponse<ExploreResponse>(
    response,
    "후보군을 불러오지 못했습니다.",
  );
}

export async function fetchHeatmap(metric: HeatmapMetric) {
  const params = new URLSearchParams({ metric });
  const response = await fetch(`/api/backend/map/heatmap?${params.toString()}`);

  return parseJsonResponse<HeatmapResponse>(
    response,
    "히트맵 데이터를 불러오지 못했습니다.",
  );
}
