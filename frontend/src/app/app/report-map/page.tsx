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

import {
  fetchAIReport,
  fetchAIReportPreview,
  fetchCandidateMatches,
  fetchHeatmap,
} from "@/lib/api";
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
  AIReportResponse,
  AIReportEvidencePack,
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
  { id: "bus_stop_density", label: "버스정류소 밀도" },
  { id: "daytime_living_population", label: "주간 체류인구" },
  { id: "nighttime_living_population", label: "야간 체류인구" },
];

type ReportView = "heatmap" | "map";

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

        <div className="relative min-h-[760px] bg-[#eef1f3] p-5 sm:p-8">
          {heatmap ? (
            <>
              <ReportVisual
                directSelectionMode={directSelectionMode}
                regions={heatmap.regions}
                savedRegionIds={savedRegionIds}
                showCautionMetrics={showCautionMetrics}
                topRegions={topRegions}
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
    <div className="grid grid-cols-[5rem_1fr] gap-4 border-t border-white/10 pt-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
        {label}
      </dt>
      <dd className="text-[#cacaca]">{value}</dd>
    </div>
  );
}

function DataProvenance({ metadata }: { metadata: HeatmapResponse["metadata"] }) {
  return (
    <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-4" aria-labelledby="data-provenance-title">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#847dff]" id="data-provenance-title">Data provenance</p>
      <p className="mt-3 text-sm font-semibold leading-5 text-[#e1e1e4]">{metadata.source_name}</p>
      <dl className="mt-4 space-y-3 text-xs leading-5 text-[#9f9fa0]">
        <div><dt className="inline text-[#6f7073]">기준일 </dt><dd className="inline">{metadata.data_date ?? "원천별 확인 필요"}</dd></div>
        <div><dt className="inline text-[#6f7073]">산출 방식 </dt><dd className="inline">{metadata.methodology}</dd></div>
        <div><dt className="inline text-[#6f7073]">데이터 범위 </dt><dd className="inline">{metadata.data_region_count}개 행정동 · 결측 {metadata.missing_region_count}개</dd></div>
        {metadata.source_license ? <div><dt className="inline text-[#6f7073]">이용 조건 </dt><dd className="inline">{metadata.source_license}</dd></div> : null}
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
        {metadata.source_url ? <a className="text-[#a9a4ff] hover:text-white" href={metadata.source_url} rel="noreferrer" target="_blank">공식 원천 ↗</a> : null}
        <a className="text-[#a9a4ff] hover:text-white" href={DATA_INVENTORY_URL} rel="noreferrer" target="_blank">전체 출처·한계 ↗</a>
      </div>
    </section>
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
      <KakaoMapCanvas
        appKey={appKey}
        candidateStates={candidateStates}
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
