import type {
  AuthSession,
  AgreementStatus,
  CompareResponse,
  ExploreCondition,
  ExploreResponse,
  HousingAreaBand,
  HousingBuildingType,
  HeatmapMetric,
  HeatmapResponse,
  Metadata,
  RegionOption,
  SavedReportCreate,
  SavedReportDetail,
  SavedReportSummary,
} from "@/types/sweethome";

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

function authRequestInit(init: RequestInit = {}): RequestInit {
  return { ...init, signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS) };
}

export async function fetchAuthSession() {
  const response = await fetch(
    "/api/backend/auth/me",
    authRequestInit({ cache: "no-store" }),
  );
  if (response.status === 401) return null;
  return parseJsonResponse<AuthSession>(response, "로그인 상태를 확인하지 못했습니다.");
}

export async function fetchAgreementStatus() {
  const response = await fetch(
    "/api/backend/agreements/me",
    authRequestInit({ cache: "no-store" }),
  );
  if (response.status === 401) return null;
  return parseJsonResponse<AgreementStatus>(
    response,
    "약관 확인 상태를 불러오지 못했습니다.",
  );
}

export async function acceptCurrentAgreement() {
  const response = await fetch("/api/backend/agreements/me", authRequestInit({
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-sweethome-request-intent": "accept-current-agreement",
    },
    body: JSON.stringify({
      terms_accepted: true,
      privacy_notice_confirmed: true,
    }),
  }));
  const savedAgreement = await parseJsonResponse<AgreementStatus>(
    response,
    "약관 확인 내용을 저장하지 못했습니다.",
  );
  if (!savedAgreement.accepted) {
    throw new Error("약관 확인 내용을 저장하지 못했습니다.");
  }

  const confirmedAgreement = await fetchAgreementStatus();
  if (!confirmedAgreement?.accepted) {
    throw new Error("약관 확인 내용을 저장하지 못했습니다.");
  }
  return confirmedAgreement;
}

export async function createSavedReport(payload: SavedReportCreate) {
  const response = await fetch("/api/backend/saved-reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<SavedReportDetail>(
    response,
    "나만의 리포트를 저장하지 못했습니다.",
  );
}

export async function fetchSavedReports() {
  const response = await fetch("/api/backend/saved-reports", { cache: "no-store" });
  return parseJsonResponse<SavedReportSummary[]>(
    response,
    "저장한 리포트를 불러오지 못했습니다.",
  );
}

export async function fetchSavedReport(reportId: string) {
  const response = await fetch(`/api/backend/saved-reports/${encodeURIComponent(reportId)}`, {
    cache: "no-store",
  });
  return parseJsonResponse<SavedReportDetail>(
    response,
    "저장한 리포트를 불러오지 못했습니다.",
  );
}

export async function deleteSavedReport(reportId: string) {
  const response = await fetch(`/api/backend/saved-reports/${encodeURIComponent(reportId)}`, {
    method: "DELETE",
  });
  if (response.status === 204) return;
  await parseJsonResponse<never>(response, "리포트를 삭제하지 못했습니다.");
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const responseBody = await response.text();
  let payload: unknown;

  try {
    payload = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      && typeof payload.message === "string"
      ? payload.message
      : fallbackMessage;
    throw new Error(message);
  }

  if (payload === null) throw new Error(fallbackMessage);

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
