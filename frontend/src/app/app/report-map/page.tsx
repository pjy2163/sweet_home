"use client";

import Link from "next/link";
import Script from "next/script";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  fetchAIReport,
  fetchAIReportPreview,
  fetchCandidateMatches,
  fetchHeatmap,
} from "@/lib/api";
import { formatNumber, formatRatio } from "@/lib/format";
import type {
  AIReportResponse,
  AIReportEvidencePack,
  CandidateEvidenceMetric,
  CandidateMatchRegion,
  EvidenceChartSpec,
  ExploreCondition,
  HeatmapLevel,
  HeatmapMetric,
  HeatmapRegion,
  HeatmapResponse,
  HousingAreaBand,
  HousingBuildingType,
} from "@/types/sweethome";

const METRICS: Array<{ id: HeatmapMetric; label: string }> = [
  { id: "jeonse_ratio", label: "전세가" },
  { id: "deposit_ratio", label: "실거래가" },
  { id: "safe_facility_density", label: "안심 인프라" },
  { id: "store_density", label: "편의" },
  { id: "bus_stop_density", label: "버스정류소" },
  { id: "daytime_living_population", label: "주간 체류인구" },
  { id: "nighttime_living_population", label: "야간 체류인구" },
];

type ReportView = "heatmap" | "map";

type MapSize = "compact" | "standard" | "expanded";
type CandidateState = "saved" | "excluded";

type ReportRegion = HeatmapRegion & {
  match_count?: number;
  matched_indicators?: string[];
  indicator_summary?: Record<string, string>;
  evidence_metrics?: CandidateEvidenceMetric[];
  selection_source?: "candidate" | "map_click";
};

type OpenCandidateReport = {
  region: ReportRegion;
};

type EvidenceProfile = {
  condition: ExploreCondition;
  label: string;
  status: string;
  detail: string;
  position: number;
  caution: boolean;
  matched: boolean;
};

const MAP_SIZE_OPTIONS: Array<{ id: MapSize; label: string }> = [
  { id: "compact", label: "S" },
  { id: "standard", label: "M" },
  { id: "expanded", label: "L" },
];

const MAP_SIZE_CLASS: Record<MapSize, string> = {
  compact: "h-[420px]",
  standard: "h-[560px]",
  expanded: "h-[700px]",
};

const CONDITION_LABELS: Record<ExploreCondition, string> = {
  safety: "야간 생활환경",
  convenience: "편의",
  price: "가격",
  population: "거주·활동 특성",
  transport: "교통",
};

const CONDITION_OPTIONS: ExploreCondition[] = [
  "price",
  "safety",
  "convenience",
  "population",
  "transport",
];
const AI_REPORT_ENABLED = false;

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
  relayout: () => void;
};

type KakaoLatLngBounds = {
  extend: (position: KakaoLatLng) => void;
};

type KakaoCustomOverlay = {
  setMap: (map: KakaoMap | null) => void;
};

type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};

type KakaoRegionResult = {
  address_name: string;
  code: string;
  region_type: "B" | "H";
};

type KakaoGeocoder = {
  coord2RegionCode: (
    longitude: number,
    latitude: number,
    callback: (result: KakaoRegionResult[], status: string) => void,
  ) => void;
};

type KakaoMaps = {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: {
    map: KakaoMap;
    position: KakaoLatLng;
    title: string;
  }) => KakaoMarker;
  CustomOverlay: new (options: {
    map: KakaoMap;
    position: KakaoLatLng;
    content: string;
    yAnchor: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  event: {
    addListener: (
      target: KakaoMap,
      eventName: "click",
      callback: (event: { latLng: KakaoLatLng }) => void,
    ) => void;
  };
  services?: {
    Geocoder: new () => KakaoGeocoder;
    Status: { OK: string };
  };
  load: (callback: () => void) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
    __sweetHomeOpenReport?: (regionId: string) => void;
  }
}

export default function ReportMapPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#090a0b] p-4 text-[#f5f5f7] flex items-center justify-center">
        <p className="text-[#9f9fa0] text-sm">불러오는 중...</p>
      </main>
    }>
      <ReportMapContent />
    </Suspense>
  );
}

function ReportMapContent() {
  const searchParams = useSearchParams();
  const initialConditions = useMemo<ExploreCondition[]>(() => {
    const raw = searchParams.get("conditions");
    if (!raw) return [];
    const valid: ExploreCondition[] = ["safety", "convenience", "price", "population", "transport"];
    return raw.split(",").filter((c): c is ExploreCondition => valid.includes(c as ExploreCondition));
  }, [searchParams]);
  const contractType = useMemo<"monthly_rent" | "jeonse" | undefined>(() => {
    const raw = searchParams.get("contract_type");
    return raw === "monthly_rent" || raw === "jeonse" ? raw : undefined;
  }, [searchParams]);
  const budgetMaxKrw10k = useMemo<number | undefined>(() => {
    const raw = searchParams.get("budget_max_krw_10k");
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [searchParams]);
  const buildingType = useMemo<HousingBuildingType | undefined>(() => {
    const raw = searchParams.get("building_type");
    const valid: HousingBuildingType[] = ["apartment", "officetel", "multi_family", "detached_multiunit"];
    return valid.includes(raw as HousingBuildingType) ? raw as HousingBuildingType : undefined;
  }, [searchParams]);
  const areaBand = useMemo<HousingAreaBand | undefined>(() => {
    const raw = searchParams.get("area_band");
    const valid: HousingAreaBand[] = ["compact", "mid_size", "large"];
    return valid.includes(raw as HousingAreaBand) ? raw as HousingAreaBand : undefined;
  }, [searchParams]);
  const savedRegionIds = useMemo(() => {
    const raw = searchParams.get("saved");
    return new Set(raw ? raw.split(",").filter(Boolean) : []);
  }, [searchParams]);
  const focusSavedCandidates = searchParams.get("focus") === "true";
  const directSelectionMode = searchParams.get("mode") === "direct";
  const [selectedConditions, setSelectedConditions] = useState<ExploreCondition[]>(
    initialConditions,
  );
  const [excludeLowVolumePrice, setExcludeLowVolumePrice] = useState(true);
  const [showCautionMetrics, setShowCautionMetrics] = useState(true);
  const [metric, setMetric] = useState<HeatmapMetric>("jeonse_ratio");
  const [reportView, setReportView] = useState<ReportView>("map");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [candidateRegions, setCandidateRegions] = useState<CandidateMatchRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (selectedConditions.length === 0 || directSelectionMode) {
      return;
    }
    let ignore = false;
    fetchCandidateMatches(selectedConditions, 20, {
      excludeLowVolumePrice,
      contractType,
      budgetMaxKrw10k,
      buildingType,
      areaBand,
      regionIds: focusSavedCandidates ? [...savedRegionIds] : undefined,
    }).then((result) => {
      if (!ignore) setCandidateRegions(result.regions);
    }).catch(() => {});
    return () => { ignore = true; };
  }, [areaBand, budgetMaxKrw10k, buildingType, contractType, directSelectionMode, excludeLowVolumePrice, focusSavedCandidates, savedRegionIds, selectedConditions]);

  const visibleCandidateRegions = useMemo(
    () => {
      if (selectedConditions.length === 0 || directSelectionMode) return [];
      return [...candidateRegions].sort((a, b) => {
        const savedDifference = Number(savedRegionIds.has(b.region_id))
          - Number(savedRegionIds.has(a.region_id));
        return savedDifference || b.match_count - a.match_count;
      });
    },
    [candidateRegions, directSelectionMode, savedRegionIds, selectedConditions.length],
  );

  useEffect(() => {
    let ignore = false;

    async function loadHeatmap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextHeatmap = await fetchHeatmap(metric);
        if (!ignore) setHeatmap(nextHeatmap);
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "지도 리포트 데이터를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadHeatmap();
    return () => { ignore = true; };
  }, [metric]);

  const topRegions = useMemo<ReportRegion[]>(() => {
    if (visibleCandidateRegions.length > 0) {
      return visibleCandidateRegions.slice(0, 8).map((r) => ({
        region_id: r.region_id,
        gu_name: r.gu_name,
        dong_name: r.dong_name,
        display_name: r.display_name,
        area_km2: r.area_km2,
        centroid_lon: r.centroid_lon,
        centroid_lat: r.centroid_lat,
        map_x: r.map_x,
        map_y: r.map_y,
        value: r.match_count,
        percentile: null,
        level: "very_high" as HeatmapLevel,
        has_data: true,
        match_count: r.match_count,
        matched_indicators: r.matched_indicators,
        indicator_summary: r.indicator_summary,
        evidence_metrics: r.evidence_metrics,
      }));
    }
    return heatmap?.regions.filter((region) => region.has_data).slice(0, 8) ?? [];
  }, [heatmap, visibleCandidateRegions]);

  function toggleCondition(condition: ExploreCondition) {
    setSelectedConditions((current) => {
      if (current.includes(condition)) {
        return current.filter((item) => item !== condition);
      }

      return [...current, condition];
    });
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] p-4 text-[#17203b]">
      <section className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.5rem] border border-[#e3e4e8] bg-white shadow-[0_12px_40px_rgba(17,26,74,0.06)] lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-[#e3e6ed] bg-white p-8 lg:border-b-0 lg:border-r">
          <Link
            className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#9f9fa0]"
            href="/app"
          >
            ← Decision Workspace
          </Link>
          <p className="mt-12 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#6a6b6b]">
            Detailed Report
          </p>
          <h1 className="mt-4 text-4xl font-normal leading-[1.05] tracking-[-0.055em]">
            {directSelectionMode ? "지도에서 두 지역 직접 고르기" : "지도로 보는 후보군 분포"}
          </h1>
          <p className="mt-6 text-base leading-7 text-[#9f9fa0]">
            {directSelectionMode
              ? "궁금한 위치를 한 곳씩 클릭하세요. 선택한 두 행정동을 추천이나 순위 없이 나란히 살펴봅니다."
              : "후보 위치를 확인하거나 궁금한 지점을 직접 클릭해 해당 행정동의 데이터 근거를 살펴봅니다."}
          </p>

          {contractType && budgetMaxKrw10k ? (
            <div className="mt-5 rounded-xl border border-[#b9dcfb] bg-[#edf7ff] p-4 text-[#17203b]">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2475d0]">
                Decision Profile
              </p>
              <p className="mt-2 text-sm font-semibold">
                {contractType === "monthly_rent" ? "월세" : "전세 보증금"} {budgetMaxKrw10k.toLocaleString()}만원 이하
              </p>
              <p className="mt-1 text-xs text-[#6c7689]">
                후보 보드와 동일한 예산{buildingType || areaBand ? "·주거 조건" : ""} 필터가 적용됐습니다.
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-[#e0e4eb] bg-[#f8fafc] p-4">
            <div className="rounded-lg border border-[#dce5ef] bg-white p-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2475d0]">Evidence basis</p>
              <p className="mt-2 text-sm font-semibold text-[#17203b]">서울 전체 분포 기준</p>
              <p className="mt-1 text-xs leading-5 text-[#748095]">모든 후보는 동일한 서울 기준 데이터로 비교합니다.</p>
            </div>
            <div className="mt-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
                지표 카테고리
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((condition) => {
                  const selected = selectedConditions.includes(condition);

                  return directSelectionMode ? (
                    <span className="rounded-full border border-[#dce1e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#626b7d]" key={condition}>
                      {CONDITION_LABELS[condition]}
                    </span>
                  ) : (
                    <button
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-[#9bcdf7] bg-[#eaf4ff] text-[#1479ca]"
                          : "border-[#dce1e8] bg-white text-[#6f7788] hover:border-[#aeb7c5]"
                      }`}
                      key={condition}
                      onClick={() => toggleCondition(condition)}
                      type="button"
                    >
                      {CONDITION_LABELS[condition]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#6a6b6b]">
                {directSelectionMode
                  ? "지도 클릭으로 비교할 행정동을 최대 2곳 직접 선택합니다"
                  : `후보군 ${visibleCandidateRegions.length}곳이 지도에 표시됩니다${savedRegionIds.size > 0 ? ` · 저장 후보 ${savedRegionIds.size}곳 우선 표시` : ""}`}
              </p>
            </div>

            <div className="mt-5 grid gap-3 border-t border-[#e1e5eb] pt-4">
              {!directSelectionMode ? <label className="flex items-start gap-3 text-xs leading-5 text-[#626b7d]">
                <input
                  checked={excludeLowVolumePrice}
                  className="mt-1"
                  onChange={(event) => setExcludeLowVolumePrice(event.target.checked)}
                  type="checkbox"
                />
                <span>거래량 적은 가격 지표 제외</span>
              </label> : null}
              <label className="flex items-start gap-3 text-xs leading-5 text-[#626b7d]">
                <input
                  checked={showCautionMetrics}
                  className="mt-1"
                  onChange={(event) => setShowCautionMetrics(event.target.checked)}
                  type="checkbox"
                />
                <span>주의 지표도 함께 보기</span>
              </label>
            </div>
          </div>

          {!directSelectionMode && selectedConditions.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#e0e4eb] bg-[#f8fafc] p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
                선택 조건
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedConditions.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-[#dce1e8] bg-white px-3 py-1 text-xs font-semibold text-[#626b7d]"
                  >
                    {CONDITION_LABELS[c]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!directSelectionMode ? <><div className="mt-9 grid grid-cols-2 gap-2 rounded-xl border border-[#e0e4eb] bg-[#f2f4f7] p-1">
            {[
              { id: "map", label: "지도" },
              { id: "heatmap", label: "지표 순위" },
            ].map((item) => {
              const selected = reportView === item.id;

              return (
                <button
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "bg-white text-[#17203b] shadow-sm"
                      : "text-[#747d8f] hover:bg-white/70"
                  }`}
                  key={item.id}
                  onClick={() => setReportView(item.id as ReportView)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {METRICS.map((item) => {
              const selected = metric === item.id;

              return (
                <button
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-[#17203b] bg-[#17203b] text-white"
                      : "border-[#dce1e8] bg-white text-[#626b7d] hover:border-[#aeb7c5]"
                  }`}
                  key={item.id}
                  onClick={() => setMetric(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div></> : null}

          {!directSelectionMode && heatmap ? (
            <div className="mt-10 grid gap-4 text-sm text-[#9f9fa0]">
              <SummaryRow label="지표" value={heatmap.metadata.metric_label} />
              <SummaryRow
                label="행정동"
                value={`${heatmap.metadata.data_region_count}/${heatmap.metadata.region_count}개`}
              />
              <SummaryRow label="단위" value={heatmap.metadata.unit} />
            </div>
          ) : null}
        </aside>

        <div className="relative min-h-[760px] bg-[#eef1f3] p-5 sm:p-8">
          {isLoading ? (
            <MapNotice text="지도 데이터를 불러오는 중입니다." />
          ) : errorMessage ? (
            <MapNotice text={errorMessage} />
          ) : heatmap ? (
            <ReportVisual
              directSelectionMode={directSelectionMode}
              regions={heatmap.regions}
              savedRegionIds={savedRegionIds}
              showCautionMetrics={showCautionMetrics}
              topRegions={topRegions}
              unit={heatmap.metadata.unit}
              view={reportView}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-4 border-t border-white/10 pt-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
        {label}
      </dt>
      <dd className="text-[#cacaca]">{value}</dd>
    </div>
  );
}

function ReportVisual({
  directSelectionMode,
  regions,
  savedRegionIds,
  showCautionMetrics,
  topRegions,
  unit,
  view,
}: {
  directSelectionMode: boolean;
  regions: HeatmapRegion[];
  savedRegionIds: Set<string>;
  showCautionMetrics: boolean;
  topRegions: ReportRegion[];
  unit: string;
  view: ReportView;
}) {
  if (view === "heatmap") {
    return (
      <div className="relative h-full min-h-[700px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]">
        <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
          Internal heatmap
        </div>
        <MapLayer regions={regions} topRegions={topRegions} unit={unit} />
      </div>
    );
  }

  return (
    <KakaoReportMap
      directSelectionMode={directSelectionMode}
      regions={regions}
      savedRegionIds={savedRegionIds}
      showCautionMetrics={showCautionMetrics}
      topRegions={topRegions}
      unit={unit}
    />
  );
}

function KakaoReportMap({
  directSelectionMode,
  regions,
  savedRegionIds,
  showCautionMetrics,
  topRegions,
  unit,
}: {
  directSelectionMode: boolean;
  regions: HeatmapRegion[];
  savedRegionIds: Set<string>;
  showCautionMetrics: boolean;
  topRegions: ReportRegion[];
  unit: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapClickRequestRef = useRef(0);
  const [mapReady, setMapReady] = useState(false);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>(
    () => Object.fromEntries([...savedRegionIds].map((regionId) => [regionId, "saved"])),
  );
  const [mapSize, setMapSize] = useState<MapSize>("standard");
  const [mapResetVersion, setMapResetVersion] = useState(0);
  const [openReports, setOpenReports] = useState<OpenCandidateReport[]>([]);
  const [mapClickNotice, setMapClickNotice] = useState({
    tone: "guide" as "guide" | "loading" | "success" | "error",
    text: directSelectionMode
      ? "첫 번째로 비교할 위치를 지도에서 클릭하세요."
      : "지도에서 궁금한 위치를 클릭해 행정동 데이터를 확인하세요.",
  });
  const [comparisonReport, setComparisonReport] =
    useState<AIReportResponse | null>(null);
  const [comparisonEvidence, setComparisonEvidence] =
    useState<AIReportEvidencePack | null>(null);
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [comparisonError, setComparisonError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  function updateCandidateState(regionId: string, nextState: CandidateState) {
    setCandidateStates((current) => {
      const isRemoving = current[regionId] === nextState;
      const savedCount = Object.values(current).filter((state) => state === "saved").length;
      if (!isRemoving && nextState === "saved" && savedCount >= 3) {
        return current;
      }
      const next = { ...current };
      if (isRemoving) delete next[regionId];
      else next[regionId] = nextState;

      return next;
    });
  }

  const comparisonRegionA = openReports[0]?.region.display_name;
  const comparisonRegionB = openReports[1]?.region.display_name;
  const comparisonKey = openReports
    .map((report) => report.region.region_id)
    .join("|");
  const evidenceKey = comparisonEvidence?.regions
    .map((region) => region.region_id)
    .join("|");
  const reportKey = comparisonReport?.evidence.regions
    .map((region) => region.region_id)
    .join("|");
  const activeComparisonReport = reportKey === comparisonKey ? comparisonReport : null;
  const activeReportGenerationError = reportGenerationError?.key === comparisonKey
    ? reportGenerationError.message
    : "";
  const hasComparisonPair = Boolean(comparisonRegionA && comparisonRegionB);
  const isComparisonLoading = hasComparisonPair && evidenceKey !== comparisonKey
    && comparisonError?.key !== comparisonKey;
  const currentComparisonError = comparisonError?.key === comparisonKey
    ? comparisonError.message
    : "";

  useEffect(() => {
    if (!AI_REPORT_ENABLED || !comparisonRegionA || !comparisonRegionB) {
      return;
    }

    let ignore = false;
    const requestKey = comparisonKey;

    fetchAIReportPreview({
      region_a: comparisonRegionA,
      region_b: comparisonRegionB,
      comparison_basis: "seoul",
    })
      .then((result) => {
        if (!ignore) {
          setComparisonEvidence(result);
          setComparisonError(null);
        }
      })
      .catch((error) => {
        if (!ignore) {
          setComparisonError({
            key: requestKey,
            message: error instanceof Error
              ? error.message
              : "후보 비교 근거를 불러오지 못했습니다.",
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, [comparisonKey, comparisonRegionA, comparisonRegionB]);

  async function generateDetailedReport() {
    if (!comparisonRegionA || !comparisonRegionB || isReportGenerating) return;
    setIsReportGenerating(true);
    setReportGenerationError(null);
    try {
      const result = await fetchAIReport({
        region_a: comparisonRegionA,
        region_b: comparisonRegionB,
        comparison_basis: "seoul",
      });
      if (result.evidence.regions.map((region) => region.region_id).join("|") === comparisonKey) {
        setComparisonReport(result);
        window.sessionStorage.setItem("sweethome:ai-report", JSON.stringify(result));
        const params = new URLSearchParams({
          a: comparisonRegionA,
          b: comparisonRegionB,
        });
        window.location.assign(`/app/ai-report?${params.toString()}`);
      }
    } catch (error) {
      setReportGenerationError({
        key: comparisonKey,
        message: error instanceof Error ? error.message : "상세 AI 리포트를 생성하지 못했습니다.",
      });
    } finally {
      setIsReportGenerating(false);
    }
  }

  const mappedTopRegions = useMemo(
    () => directSelectionMode
      ? []
      : topRegions.filter(
        (region) => region.centroid_lat !== null && region.centroid_lon !== null,
      ),
    [directSelectionMode, topRegions],
  );

  const openRegionReport = useCallback((region: ReportRegion) => {
    setOpenReports((reports) => {
      if (reports.some((report) => report.region.region_id === region.region_id)) {
        return reports.map((report) =>
          report.region.region_id === region.region_id
            ? { ...report, region }
            : report,
        );
      }

      return [
        ...reports,
        { region },
      ].slice(-2);
    });
  }, []);

  const analyzeClickedRegion = useCallback(async (
    regionId: string,
    addressName: string,
  ) => {
    const requestId = mapClickRequestRef.current + 1;
    mapClickRequestRef.current = requestId;
    setMapClickNotice({
      tone: "loading",
      text: `${addressName}의 행정동 데이터를 불러오는 중입니다.`,
    });

    try {
      const result = await fetchCandidateMatches(CONDITION_OPTIONS, 1, {
        regionIds: [regionId],
      });
      if (requestId !== mapClickRequestRef.current) return;

      const clickedRegion = result.regions[0];
      if (!clickedRegion) {
        setMapClickNotice({
          tone: "error",
          text: "현재 SweetHome이 지원하는 서울 행정동 데이터가 없는 위치입니다.",
        });
        return;
      }

      openRegionReport(toReportRegion(clickedRegion, "map_click"));
      setMapClickNotice({
        tone: "success",
        text: `${clickedRegion.display_name} · 행정동 단위 분석을 열었습니다.`,
      });
    } catch (error) {
      if (requestId !== mapClickRequestRef.current) return;
      setMapClickNotice({
        tone: "error",
        text: error instanceof Error
          ? error.message
          : "클릭한 위치의 데이터를 불러오지 못했습니다.",
      });
    }
  }, [openRegionReport]);

  const closeRegionReport = useCallback((regionId: string) => {
    setOpenReports((reports) =>
      reports.filter((report) => report.region.region_id !== regionId),
    );
  }, []);

  const clearDirectSelection = useCallback(() => {
    mapClickRequestRef.current += 1;
    setOpenReports([]);
    setMapResetVersion((version) => version + 1);
    setMapClickNotice({
      tone: "guide",
      text: "첫 번째로 비교할 위치를 지도에서 클릭하세요.",
    });
  }, []);

  useEffect(() => {
    window.__sweetHomeOpenReport = (regionId: string) => {
      const region = mappedTopRegions.find((item) => item.region_id === regionId);
      if (region) {
        openRegionReport(region);
      }
    };

    function handleOverlayClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const overlay = target.closest<HTMLElement>("[data-report-region-id]");
      const regionId = overlay?.dataset.reportRegionId;
      if (!regionId) return;

      const region = mappedTopRegions.find((item) => item.region_id === regionId);
      if (region) {
        openRegionReport(region);
      }
    }

    document.addEventListener("click", handleOverlayClick);
    return () => {
      document.removeEventListener("click", handleOverlayClick);
      window.__sweetHomeOpenReport = undefined;
    };
  }, [mappedTopRegions, openRegionReport]);

  // SDK 로드 완료 후 또는 데이터가 바뀔 때 지도 재그리기
  useEffect(() => {
    if (!mapReady || !mapRef.current) {
      return;
    }

    function drawMap() {
      if (!window.kakao?.maps || !mapRef.current) return;

      const maps = window.kakao.maps;
      const centerRegion = mappedTopRegions[0];
      const center = new maps.LatLng(
        centerRegion?.centroid_lat ?? 37.5665,
        centerRegion?.centroid_lon ?? 126.978,
      );
      const map = new maps.Map(mapRef.current, { center, level: 8 });
      const bounds = new maps.LatLngBounds();
      const services = maps.services;
      const geocoder = services ? new services.Geocoder() : null;
      let clickMarker: KakaoMarker | null = null;

      if (!geocoder || !services) {
        setMapClickNotice({
          tone: "error",
          text: "위치 분석 라이브러리를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        });
      } else {
        maps.event.addListener(map, "click", ({ latLng }) => {
          if (clickMarker) clickMarker.setMap(null);
          clickMarker = new maps.Marker({
            map,
            position: latLng,
            title: "분석할 위치",
          });

          setMapClickNotice({
            tone: "loading",
            text: "클릭한 위치의 행정동을 확인하는 중입니다.",
          });
          geocoder.coord2RegionCode(
            latLng.getLng(),
            latLng.getLat(),
            (result, status) => {
              if (status !== services.Status.OK) {
                setMapClickNotice({
                  tone: "error",
                  text: "클릭한 위치의 행정동을 확인하지 못했습니다.",
                });
                return;
              }

              const administrativeRegion = result.find(
                (region) => region.region_type === "H",
              );
              if (!administrativeRegion) {
                setMapClickNotice({
                  tone: "error",
                  text: "이 위치에서는 행정동 정보를 찾을 수 없습니다.",
                });
                return;
              }

              void analyzeClickedRegion(
                administrativeRegion.code,
                administrativeRegion.address_name,
              );
            },
          );
        });
      }

      // 레벨별 오버레이 색상
      const overlayColors: Record<HeatmapLevel, { bg: string; text: string; border: string }> = {
        very_high: { bg: "#847dff", text: "#fff",    border: "#6c65e0" },
        high:      { bg: "#00b3dd", text: "#fff",    border: "#0090b2" },
        medium:    { bg: "#3f4041", text: "#cacaca", border: "#5a5b5c" },
        low:       { bg: "#252829", text: "#9f9fa0", border: "#3a3b3c" },
        very_low:  { bg: "#191b1c", text: "#6a6b6b", border: "#2a2b2c" },
        no_data:   { bg: "#191b1c", text: "#6a6b6b", border: "#2a2b2c" },
      };

      // 오버레이 객체를 배열에 보관해서 호버 시 재삽입으로 앞으로 올림
      const overlays: KakaoCustomOverlay[] = [];

      mappedTopRegions.forEach((region, index) => {
        if (region.centroid_lat === null || region.centroid_lon === null) return;

        const position = new maps.LatLng(region.centroid_lat, region.centroid_lon);
        bounds.extend(position);

        const candidateState = candidateStates[region.region_id];
        const metricColor = overlayColors[region.level] ?? overlayColors.medium;
        const color = candidateState === "saved"
          ? { bg: "#1888e8", text: "#fff", border: "#0f6fbe" }
          : candidateState === "excluded"
            ? { bg: "#a8afb9", text: "#fff", border: "#858c97" }
            : metricColor;
        const scale = index === 0 ? 1.25 : index <= 2 ? 1.05 : 0.9;
        const fontSize = Math.round(13 * scale);
        const padding = index === 0 ? "8px 14px" : "6px 11px";
        const valueText = formatRegionSummary(region, unit);
        const rank = index + 1;
        const rankBadge = candidateState === "saved"
          ? `<span style="display:inline-block;margin-right:5px;font-size:10px">★</span>`
          : candidateState === "excluded"
            ? `<span style="display:inline-block;margin-right:5px;font-size:11px">×</span>`
            : rank <= 3
          ? `<span style="
              display:inline-block;
              margin-right:5px;
              background:${color.text};
              color:${color.bg};
              border-radius:99px;
              font-size:9px;
              font-weight:800;
              padding:1px 5px;
              line-height:1.4;
            ">${rank}</span>`
            : "";

        const overlayId = `sh-overlay-${region.region_id}`;

        const content = `
          <div
            id="${overlayId}"
            data-report-region-id="${region.region_id}"
            role="button"
            tabindex="0"
            onclick="event.stopPropagation(); window.__sweetHomeOpenReport && window.__sweetHomeOpenReport('${region.region_id}')"
            onmousedown="event.stopPropagation()"
            onmouseup="event.stopPropagation()"
            onpointerdown="event.stopPropagation()"
            onpointerup="event.stopPropagation()"
            onmouseenter="this.style.transform='scale(1.1)'; this.style.boxShadow='0 8px 28px rgba(0,0,0,0.65)'; this.parentElement && (this.parentElement.style.zIndex='9999')"
            onmouseleave="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 16px rgba(0,0,0,0.45)'; this.parentElement && (this.parentElement.style.zIndex='${mappedTopRegions.length - index}')"
            style="
              background:${color.bg};
              color:${color.text};
              border:1.5px solid ${color.border};
              border-radius:999px;
              padding:${padding};
              font-size:${fontSize}px;
              font-weight:700;
              font-family:'Apple SD Gothic Neo',sans-serif;
              white-space:nowrap;
              box-shadow:0 4px 16px rgba(0,0,0,0.45);
              cursor:pointer;
              line-height:1.3;
              transition:transform 0.12s,box-shadow 0.12s;
            "
          >
            ${rankBadge}${region.dong_name}
            <span style="
              margin-left:5px;
              font-size:${fontSize - 2}px;
              font-weight:400;
              opacity:0.75;
            ">${region.match_count === undefined ? valueText : ""}</span>
          </div>`;

        const overlay = new maps.CustomOverlay({
          map,
          position,
          content,
          yAnchor: 1.3,
          zIndex: mappedTopRegions.length - index,
        });
        overlays.push(overlay);

        // 호버 이벤트는 DOM 삽입 후 연결해야 함 — requestAnimationFrame으로 지연
        requestAnimationFrame(() => {
          const el = document.getElementById(overlayId);
          if (!el) return;

          el.addEventListener("click", () => {
            openRegionReport(region);
          });
        });
      });

      if (mappedTopRegions.length > 1) {
        map.setBounds(bounds);
      } else if (mappedTopRegions.length === 1) {
        map.setCenter(center);
        map.setLevel(7);
      } else {
        map.setCenter(center);
        map.setLevel(8);
      }
      map.relayout();
    }

    window.kakao?.maps.load(drawMap);
  }, [analyzeClickedRegion, candidateStates, mapReady, mapResetVersion, mapSize, mappedTopRegions, openRegionReport, unit]);

  if (!appKey) {
    return (
      <div className="grid h-full min-h-[700px] content-start gap-4">
        <div
          className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
        >
          <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9f9fa0] backdrop-blur">
            Kakao key required
          </div>
          <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
          <MapLayer regions={regions} topRegions={directSelectionMode ? [] : topRegions} unit={unit} />
          {directSelectionMode ? (
            <DirectSelectionProgress
              reports={openReports}
              onClear={clearDirectSelection}
            />
          ) : null}
        </div>
        {!directSelectionMode ? <TopRegionCards
          candidateStates={candidateStates}
          selectedRegionIds={openReports.map((report) => report.region.region_id)}
          topRegions={topRegions}
          unit={unit}
          onCandidateStateChange={updateCandidateState}
          onSelectRegion={openRegionReport}
        /> : null}
        <MapSelectionReports
          candidateStates={candidateStates}
          directSelectionMode={directSelectionMode}
          reports={openReports}
          showCautionMetrics={showCautionMetrics}
          unit={unit}
          onCandidateStateChange={updateCandidateState}
          onClose={closeRegionReport}
        />
        {AI_REPORT_ENABLED ? <EvidenceComparisonReport
          evidence={comparisonEvidence}
          result={activeComparisonReport}
          error={currentComparisonError}
          isLoading={isComparisonLoading}
          isReportGenerating={isReportGenerating}
          reportGenerationError={activeReportGenerationError}
          selectedCount={openReports.length}
          onGenerateReport={generateDetailedReport}
        /> : null}
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[700px] content-start gap-4">
      {/* Next.js Script 컴포넌트로 SDK 로드 — CORB 방지 */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onReady={() => setMapReady(true)}
        onError={() => setMapReady(false)}
      />
      <div
        className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
      >
        <div ref={mapRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,10,11,0.10),rgba(9,10,11,0.22))]" />
        <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
          Kakao map layer
        </div>
        {directSelectionMode ? (
          <DirectSelectionProgress
            reports={openReports}
            onClear={clearDirectSelection}
          />
        ) : null}
        <MapClickNotice notice={mapClickNotice} />
        <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
      </div>
      {!directSelectionMode ? <TopRegionCards
        candidateStates={candidateStates}
        selectedRegionIds={openReports.map((report) => report.region.region_id)}
        topRegions={topRegions}
        unit={unit}
        onCandidateStateChange={updateCandidateState}
        onSelectRegion={openRegionReport}
      /> : null}
      <MapSelectionReports
        candidateStates={candidateStates}
        directSelectionMode={directSelectionMode}
        reports={openReports}
        showCautionMetrics={showCautionMetrics}
        unit={unit}
        onCandidateStateChange={updateCandidateState}
        onClose={closeRegionReport}
      />
      {AI_REPORT_ENABLED ? <EvidenceComparisonReport
        evidence={comparisonEvidence}
        result={activeComparisonReport}
        error={currentComparisonError}
        isLoading={isComparisonLoading}
        isReportGenerating={isReportGenerating}
        reportGenerationError={activeReportGenerationError}
        selectedCount={openReports.length}
        onGenerateReport={generateDetailedReport}
      /> : null}
    </div>
  );
}

function EvidenceComparisonReport({
  evidence,
  result,
  error,
  isLoading,
  isReportGenerating,
  reportGenerationError,
  selectedCount,
  onGenerateReport,
}: {
  evidence: AIReportEvidencePack | null;
  result: AIReportResponse | null;
  error: string;
  isLoading: boolean;
  isReportGenerating: boolean;
  reportGenerationError: string;
  selectedCount: number;
  onGenerateReport: () => void;
}) {
  return (
    <section className="border-t border-white/10 py-8" id="candidate-comparison-report">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
            Evidence Comparison
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[#f5f5f7]">
            후보 2개 데이터 비교
          </h2>
        </div>
        {evidence ? (
          <p className="font-mono text-[10px] text-[#6a6b6b]">
            DATA {evidence.data_version.replace("sha256:", "")}
          </p>
        ) : null}
      </div>

      {selectedCount < 2 ? (
        <p className="mt-5 border-l-2 border-white/15 pl-4 text-sm leading-6 text-[#9f9fa0]">
          지도나 후보 카드에서 지역 두 곳의 미니 리포트를 열면 같은 근거로 비교합니다.
        </p>
      ) : isLoading ? (
        <p className="mt-5 text-sm text-[#9f9fa0]">비교 근거를 확인하는 중입니다.</p>
      ) : error ? (
        <p className="mt-5 border-l-2 border-[#ffcf70] pl-4 text-sm leading-6 text-[#ffcf70]">
          {error}
        </p>
      ) : evidence ? (
        <>
          {result ? (
            <DetailedAIAnalysis result={result} />
          ) : (
            <div className="mt-7 rounded-2xl border border-[#847dff]/25 bg-[#847dff]/[0.07] p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#aaa6ff]">
                Grounded AI Analysis
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">AI 상세 분석 생성</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b7b7bb]">
                아래 검증된 비교 근거를 바탕으로 가격과 생활환경의 차이, 데이터 주의사항과
                직접 확인할 항목을 정리합니다. 지역 선택이나 투자 판단을 대신하지 않습니다.
              </p>
              <button
                className="mt-5 rounded-full bg-[#847dff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#716ae8] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isReportGenerating}
                onClick={onGenerateReport}
                type="button"
              >
                {isReportGenerating ? "상세 분석 생성 중..." : "AI 상세 분석 생성"}
              </button>
              {reportGenerationError ? (
                <p className="mt-4 text-sm text-[#ffcf70]">{reportGenerationError}</p>
              ) : null}
            </div>
          )}
          <div className="mt-7 border-y border-white/10">
            {evidence.chart_specs.map((chart) => (
              <EvidenceComparisonChart chart={chart} key={chart.chart_id} />
            ))}
          </div>
          <EvidenceQualitySummary evidence={evidence} />
        </>
      ) : null}
    </section>
  );
}

function DetailedAIAnalysis({ result }: { result: AIReportResponse }) {
  return (
    <article className="mt-7 rounded-2xl border border-[#847dff]/25 bg-[#847dff]/[0.07] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#aaa6ff]">
            Grounded AI Analysis
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">데이터 근거 기반 상세 분석</h3>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-[#9f9fa0]">
          {result.generation_mode === "openai" ? "AI 해석" : "검증 규칙 리포트"}
        </span>
      </div>
      <p className="mt-5 text-sm leading-7 text-[#d8d8dc]">
        {result.report.executive_summary}
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {result.report.sections.map((section) => (
          <section className="rounded-xl border border-white/10 bg-black/20 p-4" key={section.heading}>
            <h4 className="text-sm font-semibold text-white">{section.heading}</h4>
            <p className="mt-3 text-sm leading-6 text-[#b7b7bb]">{section.analysis}</p>
          </section>
        ))}
      </div>
      <div className="mt-6 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold text-[#ffcf70]">해석 시 주의사항</h4>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-[#9f9fa0]">
            {result.report.cautions.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[#9ed8c5]">추가 확인 사항</h4>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-[#9f9fa0]">
            {result.report.next_checks.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
    </article>
  );
}

function EvidenceComparisonChart({ chart }: { chart: EvidenceChartSpec }) {
  const position = (value: number) => {
    const rawPosition =
      ((value - chart.axis_min) / Math.max(chart.axis_max - chart.axis_min, 1)) * 100;
    return Math.min(Math.max(rawPosition, 0), 100);
  };
  const validData = chart.data.filter(
    (datum): datum is typeof datum & { value: number } => datum.value !== null,
  );
  const positions = validData.map((datum) => position(datum.value));
  const connectorLeft = positions.length > 1 ? Math.min(...positions) : 0;
  const connectorWidth = positions.length > 1
    ? Math.max(...positions) - connectorLeft
    : 0;
  const hasCaution = chart.data.some((datum) => datum.quality_status !== "reliable");

  return (
    <article className="grid gap-5 border-b border-white/10 py-7 last:border-b-0 lg:grid-cols-[15rem_1fr] lg:items-center">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#f5f5f7]">{chart.title}</h3>
          {hasCaution ? (
            <span className="text-[10px] font-bold text-[#ffcf70]">주의</span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[#6a6b6b]">
          {chart.lower_label} · {chart.higher_label} / 서울 전체 관측 범위
        </p>
      </div>

      {validData.length === 0 ? (
        <p className="text-sm text-[#6a6b6b]">비교 가능한 데이터가 없습니다.</p>
      ) : (
        <div>
          <div className="relative h-12" aria-label={`${chart.title} 비교 차트`}>
            <div className="absolute left-0 right-0 top-5 h-px bg-white/15" />
            {chart.reference ? (
              <div
                className="absolute top-2 h-7 w-px bg-white/30"
                style={{ left: `${position(chart.reference.value)}%` }}
                title={`${chart.reference.label}: ${formatEvidenceValue(chart.reference.value, chart.unit)}`}
              />
            ) : null}
            {connectorWidth > 0 ? (
              <div
                className="absolute top-[18px] h-1 bg-[#847dff]/45"
                style={{ left: `${connectorLeft}%`, width: `${connectorWidth}%` }}
              />
            ) : null}
            {validData.map((datum, index) => (
              <div
                className={`absolute top-[13px] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-[#0f1011] ${
                  datum.quality_status === "reliable"
                    ? index === 0
                      ? "bg-[#f5f5f7]"
                      : "bg-[#dfff62]"
                    : "bg-[#ffcf70]"
                }`}
                key={datum.evidence_id}
                style={{ left: `${position(datum.value)}%` }}
                title={`${datum.label}: ${formatEvidenceValue(datum.value, chart.unit)}`}
              />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {chart.data.map((datum, index) => (
              <div className="flex items-center justify-between gap-3 text-xs" key={datum.evidence_id}>
                <span className="flex min-w-0 items-center gap-2 text-[#9f9fa0]">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      datum.quality_status === "reliable"
                        ? index === 0
                          ? "bg-[#f5f5f7]"
                          : "bg-[#dfff62]"
                        : datum.quality_status === "caution"
                          ? "bg-[#ffcf70]"
                          : "bg-[#6a6b6b]"
                    }`}
                  />
                  <span className="truncate">{datum.label}</span>
                </span>
                <strong className="shrink-0 font-mono text-[#f5f5f7]">
                  {formatEvidenceValue(datum.value, chart.unit)}
                </strong>
              </div>
            ))}
          </div>
          {chart.reference ? (
            <p className="mt-3 text-[10px] text-[#6a6b6b]">
              기준선: {chart.reference.label} {formatEvidenceValue(chart.reference.value, chart.unit)}
            </p>
          ) : null}
          <p className="mt-2 flex justify-between font-mono text-[9px] text-[#555758]">
            <span>{formatEvidenceValue(chart.axis_min, chart.unit)}</span>
            <span>{formatEvidenceValue(chart.axis_max, chart.unit)}</span>
          </p>
        </div>
      )}
    </article>
  );
}

function EvidenceQualitySummary({ evidence }: { evidence: AIReportEvidencePack }) {
  const visibleFlags = evidence.quality_flags.filter((flag) =>
    evidence.chart_specs.some((chart) =>
      chart.related_quality_flag_codes.includes(flag.code),
    ),
  );

  if (visibleFlags.length === 0) return null;

  return (
    <details className="mt-6 border-b border-white/10 pb-6">
      <summary className="cursor-pointer text-sm font-semibold text-[#cacaca]">
        데이터 주의사항 {visibleFlags.length}개
      </summary>
      <ul className="mt-4 grid gap-3 text-xs leading-5 text-[#9f9fa0]">
        {visibleFlags.map((flag) => (
          <li className="border-l-2 border-white/15 pl-3" key={`${flag.code}:${flag.region_id ?? "all"}`}>
            {flag.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

function formatEvidenceValue(value: number | null, unit: string) {
  if (value === null) return "데이터 없음";
  const digits = unit === "%" || unit.includes("/") ? 1 : 0;

  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}${unit}`;
}

function MapSizeControl({
  mapSize,
  onMapSizeChange,
}: {
  mapSize: MapSize;
  onMapSizeChange: (size: MapSize) => void;
}) {
  return (
    <div className="absolute right-5 top-5 z-20 flex rounded-lg border border-white/10 bg-black/45 p-1 backdrop-blur">
      {MAP_SIZE_OPTIONS.map((option) => {
        const selected = option.id === mapSize;

        return (
          <button
            aria-label={`지도 크기 ${option.label}`}
            aria-pressed={selected}
            className={`h-8 w-8 rounded-md font-mono text-[10px] font-bold transition ${
              selected
                ? "bg-white text-black"
                : "text-[#cacaca] hover:bg-white/[0.08] hover:text-[#f5f5f7]"
            }`}
            key={option.id}
            onClick={() => onMapSizeChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MapLayer({
  regions,
  topRegions,
  unit,
}: {
  regions: HeatmapRegion[];
  topRegions: ReportRegion[];
  unit: string;
}) {
  // 데이터 있는 지역만, value 높은 순 상위 20개
  const chartRegions = useMemo(
    () =>
      regions
        .filter((r) => r.has_data && r.value !== null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .slice(0, 20),
    [regions],
  );

  const maxValue = chartRegions[0]?.value ?? 1;
  const minValue = chartRegions[chartRegions.length - 1]?.value ?? 0;
  const range = Math.max(maxValue - minValue, 1);

  const levelColor: Record<HeatmapLevel, string> = {
    very_high: "#847dff",
    high:      "#00b3dd",
    medium:    "#6a6b6b",
    low:       "#3f4041",
    very_low:  "#252829",
    no_data:   "#191b1c",
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-6 sm:p-8">
      {/* 헤더 */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
            Distribution Chart
          </p>
          <h3 className="mt-1 text-lg font-medium text-[#f5f5f7]">
            상위 20개 행정동 지표 분포
          </h3>
        </div>
        <p className="text-xs text-[#6a6b6b]">단위: {unit}</p>
      </div>

      {/* 바 차트 */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid gap-[6px]">
          {chartRegions.map((region, index) => {
            const barWidth = ((region.value ?? 0) - minValue) / range * 100;
            const isTopRegion = topRegions.some((t) => t.region_id === region.region_id);
            const color = levelColor[region.level];

            return (
              <div
                key={region.region_id}
                className="group flex items-center gap-3"
                title={`${region.display_name}: ${formatMapValue(region.value, unit)}`}
              >
                {/* 순위 */}
                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-[#6a6b6b]">
                  {index + 1}
                </span>

                {/* 동 이름 */}
                <span
                  className={`w-[88px] shrink-0 truncate text-xs font-semibold ${
                    isTopRegion ? "text-[#f5f5f7]" : "text-[#9f9fa0]"
                  }`}
                >
                  {region.dong_name}
                  {isTopRegion && (
                    <span className="ml-1 text-[9px] font-bold text-[#847dff]">●</span>
                  )}
                </span>

                {/* 바 */}
                <div className="relative flex-1 h-[18px] overflow-hidden rounded-[3px] bg-white/[0.05]">
                  <div
                    className="h-full rounded-[3px] transition-all duration-300"
                    style={{
                      width: `${Math.max(barWidth, 2)}%`,
                      background: color,
                      opacity: isTopRegion ? 1 : 0.55,
                    }}
                  />
                </div>

                {/* 수치 */}
                <span className="w-[56px] shrink-0 text-right font-mono text-[10px] text-[#9f9fa0] group-hover:text-[#f5f5f7]">
                  {formatMapValue(region.value, unit)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례: 후보군 표시 설명 */}
      {topRegions.length > 0 && (
        <p className="mt-4 text-[10px] text-[#6a6b6b]">
          <span className="text-[#847dff]">●</span> 후보군에 포함된 행정동
        </p>
      )}
    </div>
  );
}

function TopRegionCards({
  candidateStates,
  selectedRegionIds,
  topRegions,
  unit,
  onCandidateStateChange,
  onSelectRegion,
}: {
  candidateStates: Record<string, CandidateState>;
  selectedRegionIds: string[];
  topRegions: ReportRegion[];
  unit: string;
  onCandidateStateChange: (regionId: string, state: CandidateState) => void;
  onSelectRegion: (region: ReportRegion) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {topRegions.slice(0, 4).map((region, index) => {
        const selected = selectedRegionIds.includes(region.region_id);
        const candidateState = candidateStates[region.region_id];

        return (
          <article
            className={`rounded-xl border bg-white p-4 text-[#17203b] shadow-[0_8px_24px_rgba(23,32,59,0.06)] transition ${
              selected
                ? "border-[#1888e8] ring-1 ring-[#1888e8]"
                : candidateState === "excluded"
                  ? "border-[#e0e4eb] opacity-55"
                  : "border-[#e0e4eb] hover:border-[#aeb7c5]"
            }`}
            key={region.region_id}
          >
            <button className="w-full text-left" onClick={() => onSelectRegion(region)} type="button">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a91a0]">0{index + 1}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${candidateState === "saved" ? "bg-[#eaf4ff] text-[#1888e8]" : candidateState === "excluded" ? "bg-[#f0f1f3] text-[#858b98]" : "bg-[#eef7f3] text-[#3c8065]"}`}>{candidateState === "saved" ? "저장됨" : candidateState === "excluded" ? "제외됨" : "후보"}</span>
              </div>
              <h2 className="mt-2 truncate text-lg font-medium">{region.display_name}</h2>
              <p className="mt-3 text-sm text-[#7a8292]">{region.match_count === undefined ? formatRegionSummary(region, unit) : "근거 보기"}</p>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#eceef2] pt-3">
              <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${candidateState === "saved" ? "bg-[#eaf4ff] text-[#1888e8]" : "border border-[#dce1e8] text-[#596174]"}`} onClick={() => onCandidateStateChange(region.region_id, "saved")} type="button">{candidateState === "saved" ? "저장 취소" : "후보 저장"}</button>
              <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${candidateState === "excluded" ? "bg-[#f0f1f3] text-[#777e8c]" : "border border-[#dce1e8] text-[#747b89]"}`} onClick={() => onCandidateStateChange(region.region_id, "excluded")} type="button">{candidateState === "excluded" ? "제외 취소" : "제외"}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MapSelectionReports({
  candidateStates,
  directSelectionMode,
  reports,
  showCautionMetrics,
  unit,
  onCandidateStateChange,
  onClose,
}: {
  candidateStates: Record<string, CandidateState>;
  directSelectionMode: boolean;
  reports: OpenCandidateReport[];
  showCautionMetrics: boolean;
  unit: string;
  onCandidateStateChange: (regionId: string, state: CandidateState) => void;
  onClose: (regionId: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#dfe3ea] bg-white p-5 shadow-[0_10px_30px_rgba(23,32,59,.06)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e6e9ee] pb-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2475d0]">Map comparison</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17203b]">
            {directSelectionMode ? "직접 고른 두 지역의 데이터 근거" : "지도에서 선택한 후보 데이터 근거"}
          </h2>
        </div>
        <p className="text-xs text-[#798294]">선택 {reports.length}/2 · 추천이나 종합 순위가 아닙니다</p>
      </div>
      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => {
          const report = reports[index];
          if (!report) {
            return (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-[#cfd5df] bg-[#f7f9fb] p-8 text-center" key={index}>
                <div>
                  <p className="font-mono text-xs font-semibold text-[#1888e8]">0{index + 1}</p>
                  <p className="mt-3 text-lg font-semibold text-[#3f4a60]">{index === 0 ? "첫 번째 지역을 선택하세요" : "두 번째 지역을 선택하세요"}</p>
                  <p className="mt-2 text-sm leading-6 text-[#80899a]">
                    {directSelectionMode
                      ? "지도에서 궁금한 위치를 클릭하면 이 자리에 행정동 상세 근거가 표시됩니다."
                      : "지도 라벨이나 아래 후보 카드에서 지역을 선택하면 이 자리에 상세 근거가 표시됩니다."}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <CandidateMiniReport
              candidateState={candidateStates[report.region.region_id]}
              key={report.region.region_id}
              reportIndex={index}
              region={report.region}
              showCautionMetrics={showCautionMetrics}
              unit={unit}
              onCandidateStateChange={(state) => onCandidateStateChange(report.region.region_id, state)}
              onClose={() => onClose(report.region.region_id)}
            />
          );
        })}
      </div>
    </section>
  );
}

function CandidateMiniReport({
  candidateState,
  reportIndex,
  region,
  showCautionMetrics,
  unit,
  onCandidateStateChange,
  onClose,
}: {
  candidateState?: CandidateState;
  reportIndex: number;
  region: ReportRegion;
  showCautionMetrics: boolean;
  unit: string;
  onCandidateStateChange: (state: CandidateState) => void;
  onClose: () => void;
}) {
  const evidence = useMemo(
    () =>
      (region.evidence_metrics ?? []).filter((metric) => {
        if (showCautionMetrics) return true;
        return metric.level !== "주의" && metric.reliability !== "표본 적음";
      }),
    [region.evidence_metrics, showCautionMetrics],
  );
  const evidenceProfiles = useMemo(
    () => buildEvidenceProfiles(evidence),
    [evidence],
  );

  return (
    <aside className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-white/12 bg-[#111827] p-5 text-[#f5f5f7] shadow-[0_12px_36px_rgba(23,32,59,.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
            {region.selection_source === "map_click" ? "Map click analysis" : `Mini Report 0${reportIndex + 1}`}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{region.display_name}</h2>
        </div>
        <button
          aria-label="미니 리포트 닫기"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm text-[#9f9fa0] transition hover:bg-white/[0.08] hover:text-[#f5f5f7]"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold text-[#9f9fa0]">
          {region.selection_source === "map_click" ? "클릭 위치 분석 기준" : "후보로 잡힌 이유"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {region.selection_source === "map_click" ? (
            <span className="text-sm leading-6 text-[#cacaca]">
              클릭한 좌표가 속한 행정동의 데이터입니다. 개별 주소나 건물을 분석한 결과는 아닙니다.
            </span>
          ) : (region.matched_indicators ?? []).length > 0 ? (
            region.matched_indicators?.map((indicator) => (
              <span
                className="rounded-full border border-[#847dff]/30 bg-[#847dff]/15 px-3 py-1 text-xs font-semibold text-[#d8d6ff]"
                key={indicator}
              >
                {indicator}
              </span>
            ))
          ) : (
            <span className="text-sm text-[#cacaca]">
              현재 선택한 지표 기준 상위 지역입니다.
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${candidateState === "saved" ? "bg-[#1888e8] text-white" : "border border-white/15 text-[#d8d8dc]"}`} onClick={() => onCandidateStateChange("saved")} type="button">{candidateState === "saved" ? "저장 취소" : "후보 저장"}</button>
        <button className={`rounded-lg px-3 py-2.5 text-xs font-semibold ${candidateState === "excluded" ? "bg-white/15 text-white" : "border border-white/15 text-[#d8d8dc]"}`} onClick={() => onCandidateStateChange("excluded")} type="button">{candidateState === "excluded" ? "제외 취소" : "후보 제외"}</button>
      </div>

      <div className="mt-4">
        {evidenceProfiles.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#9f9fa0]">지역 데이터 프로필</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6a6b6b]">
                Low · Mid · High
              </p>
            </div>
            <div className="grid gap-4">
              {evidenceProfiles.map((profile) => (
                <EvidenceProfileRow key={profile.condition} profile={profile} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold">{formatMapValue(region.value, unit)}</p>
            <p className="mt-2 text-xs leading-5 text-[#cacaca]">
              후보 조건 없이 연 지도에서는 선택한 지표의 현재 값만 표시합니다.
            </p>
          </div>
        )}
      </div>
      {evidence.length > 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#f5f5f7]">상세 데이터 근거</p>
            <span className="text-[10px] text-[#6a6b6b]">{evidence.length}개 지표</span>
          </div>
          <div className="mt-4 grid gap-3">
            {evidence.map((metric) => (
              <div className="rounded-lg border border-white/8 bg-white/[0.04] p-3" key={`${metric.condition}-${metric.label}-${metric.data_date ?? "none"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[#847dff]">
                      {CONDITION_LABELS[metric.condition]}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#cacaca]">{metric.label}</p>
                  </div>
                  <p className="text-lg font-semibold text-white">{metric.display_value}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#9f9fa0]">{metric.interpretation}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#6f7378]">
                  <span>기준 {metric.data_date ?? "확인 필요"}</span>
                  <span>{metric.reliability}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function DirectSelectionProgress({
  reports,
  onClear,
}: {
  reports: OpenCandidateReport[];
  onClear: () => void;
}) {
  const selectedCount = reports.length;
  const guide = selectedCount === 0
    ? "첫 번째 위치를 클릭하세요"
    : selectedCount === 1
      ? "두 번째 위치를 클릭하세요"
      : "두 행정동 선택 완료";

  return (
    <div className="absolute left-1/2 top-5 z-20 w-[min(34rem,calc(100%-11rem))] -translate-x-1/2 rounded-xl border border-white/15 bg-[#111a2c]/95 p-3 text-white shadow-[0_12px_36px_rgba(0,0,0,.35)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#91cfff]">직접 선택 비교 · {selectedCount}/2</p>
          <p className="mt-1 text-xs font-semibold">{guide}</p>
        </div>
        {selectedCount > 0 ? (
          <button className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white" onClick={onClear} type="button">
            다시 선택
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[0, 1].map((index) => (
          <div className={`rounded-lg border px-3 py-2 text-xs ${reports[index] ? "border-[#847dff]/40 bg-[#847dff]/15 text-white" : "border-white/10 bg-white/[0.04] text-white/35"}`} key={index}>
            <span className="mr-2 font-mono text-[9px]">0{index + 1}</span>
            {reports[index]?.region.display_name ?? "위치 미선택"}
          </div>
        ))}
      </div>
      {selectedCount === 2 ? (
        <p className="mt-2 text-[10px] leading-4 text-white/55">두 상세 패널을 나란히 확인하세요. 새 위치를 클릭하면 먼저 고른 지역이 교체됩니다.</p>
      ) : null}
    </div>
  );
}

function MapClickNotice({
  notice,
}: {
  notice: {
    tone: "guide" | "loading" | "success" | "error";
    text: string;
  };
}) {
  const toneClass = {
    guide: "border-white/10 bg-black/55 text-[#d8d8dc]",
    loading: "border-[#847dff]/35 bg-[#17152b]/90 text-[#d8d6ff]",
    success: "border-[#5bc89a]/35 bg-[#10251d]/90 text-[#b8f0d8]",
    error: "border-[#e8988f]/35 bg-[#2a1716]/90 text-[#ffc7c2]",
  }[notice.tone];

  return (
    <div className={`absolute bottom-5 left-5 z-20 max-w-[28rem] rounded-xl border px-4 py-3 text-xs leading-5 shadow-lg backdrop-blur ${toneClass}`}>
      <p className="font-semibold">위치 선택 분석</p>
      <p className="mt-1 opacity-85">{notice.text}</p>
    </div>
  );
}

function toReportRegion(
  region: CandidateMatchRegion,
  selectionSource: ReportRegion["selection_source"] = "candidate",
): ReportRegion {
  return {
    region_id: region.region_id,
    gu_name: region.gu_name,
    dong_name: region.dong_name,
    display_name: region.display_name,
    area_km2: region.area_km2,
    centroid_lon: region.centroid_lon,
    centroid_lat: region.centroid_lat,
    map_x: region.map_x,
    map_y: region.map_y,
    value: region.match_count,
    percentile: null,
    level: "very_high",
    has_data: true,
    match_count: region.match_count,
    matched_indicators: region.matched_indicators,
    indicator_summary: region.indicator_summary,
    evidence_metrics: region.evidence_metrics,
    selection_source: selectionSource,
  };
}

function EvidenceProfileRow({ profile }: { profile: EvidenceProfile }) {
  return (
    <div className="grid grid-cols-[4.5rem_3rem_1fr] items-center gap-3">
      <div>
        <p className="text-sm font-semibold text-[#f5f5f7]">{profile.label}</p>
        <p className="mt-1 truncate text-[10px] text-[#6a6b6b]" title={profile.detail}>
          {profile.detail}
        </p>
      </div>
      <span
        className={`text-xs font-bold ${
          profile.caution
            ? "text-[#ffcf70]"
            : profile.matched
              ? "text-[#d8d6ff]"
              : "text-[#9f9fa0]"
        }`}
      >
        {profile.status}
      </span>
      <div className="relative h-3 rounded-full bg-white/[0.08]">
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
        <div
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
            profile.caution
              ? "border-[#ffcf70] bg-[#332716]"
              : profile.matched
                ? "border-[#d8d6ff] bg-[#847dff]"
                : "border-[#6a6b6b] bg-[#1f2422]"
          }`}
          style={{ left: `${profile.position}%` }}
        />
      </div>
    </div>
  );
}

function buildEvidenceProfiles(metrics: CandidateEvidenceMetric[]): EvidenceProfile[] {
  const grouped = new Map<ExploreCondition, CandidateEvidenceMetric[]>();
  metrics.forEach((metric) => {
    const current = grouped.get(metric.condition) ?? [];
    current.push(metric);
    grouped.set(metric.condition, current);
  });

  return (["price", "safety", "convenience", "population", "transport"] as const)
    .map((condition) => {
      const conditionMetrics = grouped.get(condition) ?? [];
      if (!conditionMetrics.length) return null;

      return evidenceProfileForCondition(condition, conditionMetrics);
    })
    .filter((profile): profile is EvidenceProfile => profile !== null);
}

function evidenceProfileForCondition(
  condition: EvidenceProfile["condition"],
  metrics: CandidateEvidenceMetric[],
): EvidenceProfile {
  const caution = metrics.some(
    (metric) => metric.level === "주의" || metric.reliability === "표본 적음",
  );
  const matched = metrics.some((metric) => metric.is_matched);
  const primary = metrics.find((metric) => metric.is_matched) ?? metrics[0];

  if (caution) {
    return {
      condition,
      label: evidenceConditionLabel(condition),
      status: "주의",
      detail: primary.reliability,
      position: 18,
      caution: true,
      matched,
    };
  }

  if (condition === "price") {
    const priceMetrics = metrics.filter((metric) => metric.unit === "%");
    const values = priceMetrics
      .map((metric) => metric.value)
      .filter((value): value is number => value !== null && !Number.isNaN(value));
    const average = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
    const lowPrice = average !== null && average <= 0;

    return {
      condition,
      label: "가격",
      status: lowPrice ? "낮음" : "높음",
      detail: primary.display_value,
      position: lowPrice ? 24 : 82,
      caution: false,
      matched,
    };
  }

  return {
    condition,
    label: evidenceConditionLabel(condition),
    status: matched ? "높음" : "보통",
    detail: primary.display_value,
    position: matched ? 88 : 52,
    caution: false,
    matched,
  };
}

function evidenceConditionLabel(condition: EvidenceProfile["condition"]) {
  const labels: Record<EvidenceProfile["condition"], string> = {
    price: "가격",
    safety: "야간 생활환경",
    convenience: "편의",
    population: "거주·활동 특성",
    transport: "교통 접근성",
  };

  return labels[condition];
}

function MapNotice({ text }: { text: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(420px,calc(100%_-_48px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f1011] p-6 text-center text-sm font-medium text-[#9f9fa0]">
      {text}
    </div>
  );
}

function formatMapValue(value: number | null, unit: string) {
  if (value === null) {
    return "데이터 없음";
  }

  if (unit === "%") {
    return formatRatio(value);
  }

  return formatNumber(value, unit);
}

function formatRegionSummary(region: ReportRegion, unit: string) {
  return formatMapValue(region.value, unit);
}
