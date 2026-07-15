"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import {
  createSavedReport,
  fetchCandidateMatches,
  fetchAuthSession,
  fetchHeatmap,
} from "@/lib/api";
import { DataBasis } from "@/components/data-provenance";
import { mergeCandidateMetricRegions } from "@/components/report-map/candidate-metric-regions";
import {
  MapClickNotice,
  MapNotice,
  MapStatusBanner,
  type MapClickNoticeState,
} from "@/components/report-map/map-feedback";
import {
  MAP_SIZE_CLASS,
  MapSizeControl,
  type MapSize,
} from "@/components/report-map/map-size-control";
import {
  ReportControls,
  type ReportView,
} from "@/components/report-map/report-controls";
import { HeatmapDistribution } from "@/components/report-map/heatmap-distribution";
import { KakaoMapCanvas } from "@/components/report-map/kakao-map-canvas";
import {
  DirectSelectionProgress,
  MapSelectionReports,
  TopRegionCards,
} from "@/components/report-map/map-selection-reports";
import type {
  CandidateState,
  OpenCandidateReport,
  ReportRegion,
} from "@/components/report-map/types";
import type {
  CandidateMatchRegion,
  ExploreCondition,
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
  { id: "bus_stop_density", label: "버스정류소 밀도" },
  { id: "daytime_living_population", label: "주간 체류인구" },
  { id: "nighttime_living_population", label: "야간 체류인구" },
];

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
const DATA_INVENTORY_URL = "https://github.com/pjy2163/sweet_home#데이터-출처와-산출-기준";

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
  const pendingSaveRequestId = searchParams.get("save_request");
  const pendingReportRegionIds = useMemo(
    () => searchParams.get("report_regions")?.split(",").filter(Boolean).slice(0, 2) ?? [],
    [searchParams],
  );
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
  const [heatmapReloadKey, setHeatmapReloadKey] = useState(0);

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
  }, [heatmapReloadKey, metric]);

  const topRegions = useMemo<ReportRegion[]>(() => {
    if (visibleCandidateRegions.length > 0) {
      return mergeCandidateMetricRegions(
        visibleCandidateRegions.slice(0, 8),
        heatmap?.regions ?? [],
      );
    }
    return heatmap?.regions.filter((region) => region.has_data).slice(0, 8) ?? [];
  }, [heatmap, visibleCandidateRegions]);

  function toggleCondition(condition: ExploreCondition) {
    setSelectedConditions((current) => {
      if (current.includes(condition)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== condition);
      }

      return [...current, condition];
    });
  }

  return (
    <main className="warm-canvas min-h-screen p-4 text-ink">
      <section className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.5rem] border border-line bg-white/88 shadow-[0_12px_40px_rgba(67,62,63,0.08)] backdrop-blur-xl lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-line bg-white/76 p-8 lg:border-b-0 lg:border-r">
          <Link
            className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#9f9fa0]"
            href="/app"
          >
            ← 비교 화면
          </Link>
          <p className="mt-12 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#6a6b6b]">
            지도 비교
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
            <div className="mt-5 rounded-xl border border-sage-line bg-sage-soft p-4 text-ink">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-sage">
                비교 조건
              </p>
              <p className="mt-2 text-sm font-semibold">
                {contractType === "monthly_rent" ? "월세" : "전세 보증금"} {budgetMaxKrw10k.toLocaleString()}만원 이하
              </p>
              <p className="mt-1 text-xs text-[#6c7689]">
                후보 보드와 동일한 예산{buildingType || areaBand ? "·주거 조건" : ""} 필터가 적용됐습니다.
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-line bg-surface-soft p-4">
            <div className="rounded-lg border border-sage-soft bg-white p-3">
              <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-sage">비교 기준</p>
              <p className="mt-2 text-sm font-semibold text-ink">서울 전체 분포 기준</p>
              <p className="mt-1 text-xs leading-5 text-[#748095]">모든 후보는 동일한 서울 기준 데이터로 비교합니다.</p>
            </div>
            <div className="mt-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
                {directSelectionMode ? "비교할 데이터" : "후보를 고를 조건"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((condition) => {
                  const selected = selectedConditions.includes(condition);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-sage-line bg-sage-soft text-sage-strong"
                          : "border-line bg-white text-[#6f7788] hover:border-[#aeb7c5]"
                      }`}
                      key={condition}
                      onClick={() => toggleCondition(condition)}
                      title={selected && selectedConditions.length === 1 ? "비교할 데이터는 하나 이상 선택해야 합니다" : undefined}
                      type="button"
                    >
                      {CONDITION_LABELS[condition]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#6a6b6b]">
                {directSelectionMode
                  ? "선택한 데이터만 지도에서 고른 지역의 비교 카드에 표시됩니다"
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
                <span>거래량이 적은 가격 데이터 제외</span>
              </label> : null}
              <label className="flex items-start gap-3 text-xs leading-5 text-[#626b7d]">
                <input
                  checked={showCautionMetrics}
                  className="mt-1"
                  onChange={(event) => setShowCautionMetrics(event.target.checked)}
                  type="checkbox"
                />
                <span>주의가 필요한 데이터도 보기</span>
              </label>
            </div>
          </div>

          {!directSelectionMode && heatmap ? (
            <>
              <div className="mt-10 grid gap-4 text-sm text-[#9f9fa0]">
                <SummaryRow label="지표" value={heatmap.metadata.metric_label} />
                <SummaryRow
                  label="행정동"
                  value={`${heatmap.metadata.data_region_count}/${heatmap.metadata.region_count}개`}
                />
                <SummaryRow label="단위" value={heatmap.metadata.unit} />
              </div>
              <DataProvenance metadata={heatmap.metadata} />
            </>
          ) : null}
        </aside>

        <div className="relative min-h-[760px] bg-[#f1f7f4] p-5 sm:p-8">
          {!directSelectionMode ? (
            <ReportControls
              metric={metric}
              metrics={METRICS}
              onMetricChange={setMetric}
              onViewChange={setReportView}
              view={reportView}
            />
          ) : null}
          {heatmap ? (
            <>
              <ReportVisual
                directSelectionMode={directSelectionMode}
                pendingReportRegionIds={pendingReportRegionIds}
                pendingSaveRequestId={pendingSaveRequestId}
                regions={heatmap.regions}
                savedRegionIds={savedRegionIds}
                selectedConditions={selectedConditions}
                showCautionMetrics={showCautionMetrics}
                topRegions={topRegions}
                metricLabel={heatmap.metadata.metric_label}
                unit={heatmap.metadata.unit}
                view={reportView}
              />
              {isLoading ? <MapStatusBanner text="새 지표를 불러오는 중입니다. 현재 지도는 그대로 유지됩니다." /> : null}
              {errorMessage ? (
                <MapStatusBanner
                  onRetry={() => setHeatmapReloadKey((key) => key + 1)}
                  text={`${errorMessage} 이전에 불러온 지도를 유지했습니다.`}
                  tone="error"
                />
              ) : null}
            </>
          ) : isLoading ? (
            <MapNotice text="지도 데이터를 불러오는 중입니다." />
          ) : errorMessage ? (
            <MapNotice
              onRetry={() => setHeatmapReloadKey((key) => key + 1)}
              text={errorMessage}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-4 border-t border-[#e3e7ec] pt-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a8292]">
        {label}
      </dt>
      <dd className="font-medium text-[#3f4a60]">{value}</dd>
    </div>
  );
}

function DataProvenance({ metadata }: { metadata: HeatmapResponse["metadata"] }) {
  return (
    <section className="mt-8 rounded-xl border border-line bg-surface-soft p-4" aria-labelledby="data-provenance-title">
      <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-sage" id="data-provenance-title">데이터 출처</p>
      <p className="mt-3 text-sm font-semibold leading-5 text-ink">{metadata.source_name}</p>
      <dl className="mt-4 space-y-3 text-xs leading-5 text-[#667083]">
        <div><dt className="inline font-semibold text-[#596174]">기준일 </dt><dd className="inline"><DataBasis primaryDate={metadata.data_date ?? "원천별 확인 필요"} showLabel={false} /></dd></div>
        <div><dt className="inline font-semibold text-[#596174]">산출 방식 </dt><dd className="inline">{metadata.methodology}</dd></div>
        <div><dt className="inline font-semibold text-[#596174]">데이터 범위 </dt><dd className="inline">{metadata.data_region_count}개 행정동 · 결측 {metadata.missing_region_count}개</dd></div>
        {metadata.source_license ? <div><dt className="inline font-semibold text-[#596174]">이용 조건 </dt><dd className="inline">{metadata.source_license}</dd></div> : null}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        {metadata.source_url ? <a className="text-sage hover:text-sage-strong" href={metadata.source_url} rel="noreferrer" target="_blank">공식 원천 ↗</a> : null}
        <a className="text-sage hover:text-sage-strong" href={DATA_INVENTORY_URL} rel="noreferrer" target="_blank">전체 출처·한계 ↗</a>
      </div>
    </section>
  );
}

function ReportVisual({
  directSelectionMode,
  pendingReportRegionIds,
  pendingSaveRequestId,
  regions,
  savedRegionIds,
  selectedConditions,
  showCautionMetrics,
  topRegions,
  metricLabel,
  unit,
  view,
}: {
  directSelectionMode: boolean;
  pendingReportRegionIds: string[];
  pendingSaveRequestId: string | null;
  regions: HeatmapRegion[];
  savedRegionIds: Set<string>;
  selectedConditions: ExploreCondition[];
  showCautionMetrics: boolean;
  topRegions: ReportRegion[];
  metricLabel: string;
  unit: string;
  view: ReportView;
}) {
  if (view === "heatmap") {
    return (
      <div className="relative h-full min-h-[700px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]">
        <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
          지역별 지표
        </div>
      <HeatmapDistribution
        regions={regions}
        topRegions={topRegions}
        unit={unit}
      />
      </div>
    );
  }

  return (
    <KakaoReportMap
      directSelectionMode={directSelectionMode}
      pendingReportRegionIds={pendingReportRegionIds}
      pendingSaveRequestId={pendingSaveRequestId}
      regions={regions}
      savedRegionIds={savedRegionIds}
      selectedConditions={selectedConditions}
      showCautionMetrics={showCautionMetrics}
      topRegions={topRegions}
      metricLabel={metricLabel}
      unit={unit}
    />
  );
}

function KakaoReportMap({
  directSelectionMode,
  pendingReportRegionIds,
  pendingSaveRequestId,
  regions,
  savedRegionIds,
  selectedConditions,
  showCautionMetrics,
  topRegions,
  metricLabel,
  unit,
}: {
  directSelectionMode: boolean;
  pendingReportRegionIds: string[];
  pendingSaveRequestId: string | null;
  regions: HeatmapRegion[];
  savedRegionIds: Set<string>;
  selectedConditions: ExploreCondition[];
  showCautionMetrics: boolean;
  topRegions: ReportRegion[];
  metricLabel: string;
  unit: string;
}) {
  const mapClickRequestRef = useRef(0);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>(
    () => Object.fromEntries([...savedRegionIds].map((regionId) => [regionId, "saved"])),
  );
  const [mapSize, setMapSize] = useState<MapSize>("standard");
  const [mapResetVersion, setMapResetVersion] = useState(0);
  const [openReports, setOpenReports] = useState<OpenCandidateReport[]>([]);
  const [mapClickNotice, setMapClickNotice] = useState<MapClickNoticeState>({
    tone: "guide",
    text: directSelectionMode
      ? "첫 번째로 비교할 위치를 지도에서 클릭하세요."
      : "지도에서 궁금한 위치를 클릭해 행정동 데이터를 확인하세요.",
  });
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  useEffect(() => {
    if (pendingReportRegionIds.length === 0) return;
    let ignore = false;
    fetchCandidateMatches(
      selectedConditions.length > 0 ? selectedConditions : CONDITION_OPTIONS,
      2,
      { regionIds: pendingReportRegionIds },
    ).then((result) => {
      if (!ignore) {
        setOpenReports(result.regions.map((region) => ({
          region: toReportRegion(region, "map_click"),
        })));
      }
    }).catch(() => {
      if (!ignore) {
        setMapClickNotice({
          tone: "error",
          text: "로그인 전에 선택한 지역을 다시 불러오지 못했습니다.",
        });
      }
    });
    return () => { ignore = true; };
  }, [pendingReportRegionIds, selectedConditions]);

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

  if (!appKey) {
    return (
      <div className="grid h-full min-h-[700px] content-start gap-4">
        <div
          className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
        >
          <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9f9fa0] backdrop-blur">
            지도 설정 필요
          </div>
          <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
          <HeatmapDistribution
            regions={regions}
            topRegions={directSelectionMode ? [] : topRegions}
            unit={unit}
          />
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
          selectedConditions={selectedConditions}
          showCautionMetrics={showCautionMetrics}
          unit={unit}
          onCandidateStateChange={updateCandidateState}
          onClose={closeRegionReport}
        />
        <SaveReportAction
          pendingSaveRequestId={pendingSaveRequestId}
          reports={openReports}
          selectedConditions={selectedConditions}
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[700px] content-start gap-4">
      <KakaoMapCanvas
        appKey={appKey}
        candidateStates={candidateStates}
        label={directSelectionMode ? "지도에서 비교할 위치 선택" : `지도에 표시 중 · ${metricLabel}`}
        mapResetVersion={mapResetVersion}
        mapSize={mapSize}
        regions={mappedTopRegions}
        unit={unit}
        onAnalyzeRegion={analyzeClickedRegion}
        onNoticeChange={setMapClickNotice}
        onOpenRegion={openRegionReport}
      >
        {directSelectionMode ? (
          <DirectSelectionProgress
            reports={openReports}
            onClear={clearDirectSelection}
          />
        ) : null}
        <MapClickNotice notice={mapClickNotice} />
        <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
      </KakaoMapCanvas>
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
        selectedConditions={selectedConditions}
        showCautionMetrics={showCautionMetrics}
        unit={unit}
        onCandidateStateChange={updateCandidateState}
        onClose={closeRegionReport}
      />
      <SaveReportAction
        pendingSaveRequestId={pendingSaveRequestId}
        reports={openReports}
        selectedConditions={selectedConditions}
      />
    </div>
  );
}

function SaveReportAction({
  pendingSaveRequestId,
  reports,
  selectedConditions,
}: {
  pendingSaveRequestId: string | null;
  reports: OpenCandidateReport[];
  selectedConditions: ExploreCondition[];
}) {
  const router = useRouter();
  const attemptedRequestRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const regionIds = reports.map((report) => report.region.region_id);
  const priorities = selectedConditions.length > 0
    ? selectedConditions
    : CONDITION_OPTIONS;

  const save = useCallback(async (requestId: string) => {
    if (regionIds.length === 0) return;
    setStatus("saving");
    setMessage("");
    try {
      const session = await fetchAuthSession();
      if (!session) {
        const returnUrl = new URL(window.location.href);
        returnUrl.searchParams.set("report_regions", regionIds.join(","));
        returnUrl.searchParams.set("save_request", requestId);
        const redirect = `${returnUrl.pathname}${returnUrl.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      const saved = await createSavedReport({
        client_request_id: requestId,
        region_ids: regionIds,
        priority_keys: priorities,
        comparison_basis: "direct",
      });
      router.replace(`/mypage?created=${encodeURIComponent(saved.report_id)}`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "나만의 리포트를 저장하지 못했습니다.",
      );
    }
  }, [priorities, regionIds, router]);

  useEffect(() => {
    if (
      !pendingSaveRequestId
      || regionIds.length === 0
      || attemptedRequestRef.current === pendingSaveRequestId
    ) return;
    attemptedRequestRef.current = pendingSaveRequestId;
    void save(pendingSaveRequestId);
  }, [pendingSaveRequestId, regionIds.length, save]);

  return (
    <section className="rounded-2xl border border-sage-line bg-white/92 p-5 shadow-[0_12px_32px_rgba(52,78,68,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sage-strong">내 비교 기록</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">지금 확인한 근거를 나만의 리포트로 남기세요</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            선택한 지역과 판단 기준을 저장하고, 나중에 같은 의사결정 흐름을 다시 확인할 수 있습니다.
          </p>
        </div>
        <button
          className="min-h-11 shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-40"
          disabled={regionIds.length === 0 || status === "saving"}
          onClick={() => void save(crypto.randomUUID())}
          type="button"
        >
          {status === "saving" ? "리포트 저장 중…" : "나만의 리포트 만들기"}
        </button>
      </div>
      {regionIds.length === 0 ? (
        <p className="mt-3 text-xs text-subtle">지도에서 비교할 지역을 1곳 이상 선택하면 저장할 수 있습니다.</p>
      ) : null}
      {status === "error" ? <p className="mt-3 text-xs font-semibold text-[#b84d61]">{message}</p> : null}
    </section>
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
