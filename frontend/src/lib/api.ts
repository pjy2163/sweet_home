import type {
  AuthSession,
  CompareResponse,
  ExploreCondition,
  ExploreResponse,
  HousingAreaBand,
  HousingBuildingType,
  HeatmapMetric,
  HeatmapResponse,
  Metadata,
  RegionOption,
} from "@/types/sweethome";

export async function fetchAuthSession() {
  const response = await fetch("/api/backend/auth/me", { cache: "no-store" });
  if (response.status === 401) return null;
  return parseJsonResponse<AuthSession>(response, "로그인 상태를 확인하지 못했습니다.");
}

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
  options: {
    excludeLowVolumePrice?: boolean;
    contractType?: "monthly_rent" | "jeonse";
    budgetMaxKrw10k?: number;
    buildingType?: HousingBuildingType;
    areaBand?: HousingAreaBand;
    regionIds?: string[];
  } = {},
) {
  const params = new URLSearchParams({ limit: String(limit) });
  selectedConditions.forEach((condition) => {
    params.set(condition, "true");
  });
  if (options.excludeLowVolumePrice) {
    params.set("exclude_low_volume_price", "true");
  }
  if (options.contractType) {
    params.set("contract_type", options.contractType);
  }
  if (options.budgetMaxKrw10k !== undefined) {
    params.set("budget_max_krw_10k", String(options.budgetMaxKrw10k));
  }
  if (options.buildingType) params.set("building_type", options.buildingType);
  if (options.areaBand) params.set("area_band", options.areaBand);
  options.regionIds?.forEach((regionId) => params.append("region_ids", regionId));

  const response = await fetch(`/api/backend/explore?${params.toString()}`);

  return parseJsonResponse<ExploreResponse>(
    response,
    "후보군을 불러오지 못했습니다.",
  );
}

export async function fetchHeatmap(metric: HeatmapMetric) {
  const params = new URLSearchParams({ metric });
  const response = await fetch(`/api/backend/map/heatmap?${params.toString()}`);

  if (response.status === 422) {
    throw new Error(
      "현재 데이터 서버가 이 지표를 지원하지 않습니다. 최신 서버 버전을 확인해 주세요.",
    );
  }

  return parseJsonResponse<HeatmapResponse>(
    response,
    "히트맵 데이터를 불러오지 못했습니다.",
  );
}
