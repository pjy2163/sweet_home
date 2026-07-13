"use client";

import Link from "next/link";
import Script from "next/script";
import {
  Suspense,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
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

const DECISION_STORAGE_KEY = "sweethome.decision-workspace.v1";

type ReportRegion = HeatmapRegion & {
  match_count?: number;
  matched_indicators?: string[];
  indicator_summary?: Record<string, string>;
  evidence_metrics?: CandidateEvidenceMetric[];
};

type ReportPanelPosition = {
  x: number;
  y: number;
};

type ReportPanelSize = {
  width: number;
  height: number;
};

type OpenCandidateReport = {
  region: ReportRegion;
  position: ReportPanelPosition | null;
  size: ReportPanelSize;
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
  }) => unknown;
  CustomOverlay: new (options: {
    map: KakaoMap;
    position: KakaoLatLng;
    content: string;
    yAnchor: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
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
    if (selectedConditions.length === 0) {
      return;
    }
    let ignore = false;
    fetchCandidateMatches(selectedConditions, 20, {
      excludeLowVolumePrice,
      contractType,
      budgetMaxKrw10k,
      buildingType,
      areaBand,
    }).then((result) => {
      if (!ignore) setCandidateRegions(result.regions);
    }).catch(() => {});
    return () => { ignore = true; };
  }, [areaBand, budgetMaxKrw10k, buildingType, contractType, excludeLowVolumePrice, selectedConditions]);

  const visibleCandidateRegions = useMemo(
    () => {
      if (selectedConditions.length === 0) return [];
      return [...candidateRegions].sort((a, b) => {
        const savedDifference = Number(savedRegionIds.has(b.region_id))
          - Number(savedRegionIds.has(a.region_id));
        return savedDifference || b.match_count - a.match_count;
      });
    },
    [candidateRegions, savedRegionIds, selectedConditions.length],
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
            지도로 보는 후보군 분포
          </h1>
          <p className="mt-6 text-base leading-7 text-[#9f9fa0]">
            지도에서 후보 위치를 먼저 확인하고, 지표 순위에서 서울 전체 분포를 함께 비교합니다.
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

                  return (
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
                후보군 {visibleCandidateRegions.length}곳이 지도에 표시됩니다
                {savedRegionIds.size > 0 ? ` · 저장 후보 ${savedRegionIds.size}곳 우선 표시` : ""}
              </p>
            </div>

            <div className="mt-5 grid gap-3 border-t border-[#e1e5eb] pt-4">
              <label className="flex items-start gap-3 text-xs leading-5 text-[#626b7d]">
                <input
                  checked={excludeLowVolumePrice}
                  className="mt-1"
                  onChange={(event) => setExcludeLowVolumePrice(event.target.checked)}
                  type="checkbox"
                />
                <span>거래량 적은 가격 지표 제외</span>
              </label>
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

          {selectedConditions.length > 0 && (
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

          <div className="mt-9 grid grid-cols-2 gap-2 rounded-xl border border-[#e0e4eb] bg-[#f2f4f7] p-1">
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
          </div>

          {heatmap ? (
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
  regions,
  savedRegionIds,
  showCautionMetrics,
  topRegions,
  unit,
  view,
}: {
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
      regions={regions}
      savedRegionIds={savedRegionIds}
      showCautionMetrics={showCautionMetrics}
      topRegions={topRegions}
      unit={unit}
    />
  );
}

function KakaoReportMap({
  regions,
  savedRegionIds,
  showCautionMetrics,
  topRegions,
  unit,
}: {
  regions: HeatmapRegion[];
  savedRegionIds: Set<string>;
  showCautionMetrics: boolean;
  topRegions: ReportRegion[];
  unit: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [candidateStates, setCandidateStates] = useState<Record<string, CandidateState>>(
    () => Object.fromEntries([...savedRegionIds].map((regionId) => [regionId, "saved"])),
  );
  const [mapSize, setMapSize] = useState<MapSize>("standard");
  const [openReports, setOpenReports] = useState<OpenCandidateReport[]>([]);
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
      const next = { ...current };
      if (next[regionId] === nextState) delete next[regionId];
      else next[regionId] = nextState;

      try {
        const stored = window.localStorage.getItem(DECISION_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) as Record<string, unknown> : {};
        window.localStorage.setItem(
          DECISION_STORAGE_KEY,
          JSON.stringify({ ...parsed, candidateStates: next }),
        );
      } catch {
        // Candidate state still works for the current map session.
      }
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
    if (!comparisonRegionA || !comparisonRegionB) {
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
    () =>
      topRegions.filter(
        (region) => region.centroid_lat !== null && region.centroid_lon !== null,
      ),
    [topRegions],
  );

  const openRegionReport = useCallback((region: ReportRegion) => {
    setOpenReports((reports) => {
      if (reports.some((report) => report.region.region_id === region.region_id)) {
        return reports;
      }

      return [
        ...reports,
        {
          region,
          position: null,
          size: { width: 380, height: 520 },
        },
      ].slice(-2);
    });
  }, []);

  const closeRegionReport = useCallback((regionId: string) => {
    setOpenReports((reports) =>
      reports.filter((report) => report.region.region_id !== regionId),
    );
  }, []);

  const updateReportPosition = useCallback((
    regionId: string,
    position: ReportPanelPosition,
  ) => {
    setOpenReports((reports) =>
      reports.map((report) =>
        report.region.region_id === regionId ? { ...report, position } : report,
      ),
    );
  }, []);

  const updateReportSize = useCallback((regionId: string, size: ReportPanelSize) => {
    setOpenReports((reports) =>
      reports.map((report) =>
        report.region.region_id === regionId ? { ...report, size } : report,
      ),
    );
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
    if (!mapReady || !mapRef.current || mappedTopRegions.length === 0) {
      return;
    }

    function drawMap() {
      if (!window.kakao?.maps || !mapRef.current) return;

      const maps = window.kakao.maps;
      const centerRegion = mappedTopRegions[0];
      const center = new maps.LatLng(
        centerRegion.centroid_lat ?? 37.5665,
        centerRegion.centroid_lon ?? 126.978,
      );
      const map = new maps.Map(mapRef.current, { center, level: 8 });
      const bounds = new maps.LatLngBounds();

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
      } else {
        map.setCenter(center);
        map.setLevel(7);
      }
      map.relayout();
    }

    window.kakao?.maps.load(drawMap);
  }, [candidateStates, mapReady, mapSize, mappedTopRegions, openRegionReport, unit]);

  if (!appKey) {
    return (
      <div className="grid h-full min-h-[700px] content-start gap-4">
        <div
          className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
          ref={mapShellRef}
        >
          <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9f9fa0] backdrop-blur">
            Kakao key required
          </div>
          <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
          <MapLayer regions={regions} topRegions={topRegions} unit={unit} />
          {openReports.map((report, index) => (
            <CandidateMiniReport
              candidateState={candidateStates[report.region.region_id]}
              containerRef={mapShellRef}
              key={report.region.region_id}
              position={report.position}
              reportIndex={index}
              region={report.region}
              showCautionMetrics={showCautionMetrics}
              size={report.size}
              unit={unit}
              onCandidateStateChange={(state) => updateCandidateState(report.region.region_id, state)}
              onClose={() => closeRegionReport(report.region.region_id)}
              onPositionChange={(position) =>
                updateReportPosition(report.region.region_id, position)
              }
              onSizeChange={(size) => updateReportSize(report.region.region_id, size)}
            />
          ))}
        </div>
        <TopRegionCards
          candidateStates={candidateStates}
          selectedRegionIds={openReports.map((report) => report.region.region_id)}
          topRegions={topRegions}
          unit={unit}
          onCandidateStateChange={updateCandidateState}
          onSelectRegion={openRegionReport}
        />
        <EvidenceComparisonReport
          evidence={comparisonEvidence}
          result={activeComparisonReport}
          error={currentComparisonError}
          isLoading={isComparisonLoading}
          isReportGenerating={isReportGenerating}
          reportGenerationError={activeReportGenerationError}
          selectedCount={openReports.length}
          onGenerateReport={generateDetailedReport}
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[700px] content-start gap-4">
      {/* Next.js Script 컴포넌트로 SDK 로드 — CORB 방지 */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => setMapReady(true)}
        onError={() => setMapReady(false)}
      />
      <div
        className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
        ref={mapShellRef}
      >
        <div ref={mapRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,10,11,0.10),rgba(9,10,11,0.22))]" />
        <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
          Kakao map layer
        </div>
        <MapSizeControl mapSize={mapSize} onMapSizeChange={setMapSize} />
        {openReports.map((report, index) => (
          <CandidateMiniReport
            candidateState={candidateStates[report.region.region_id]}
            containerRef={mapShellRef}
            key={report.region.region_id}
            position={report.position}
            reportIndex={index}
            region={report.region}
            showCautionMetrics={showCautionMetrics}
            size={report.size}
            unit={unit}
            onCandidateStateChange={(state) => updateCandidateState(report.region.region_id, state)}
            onClose={() => closeRegionReport(report.region.region_id)}
            onPositionChange={(position) =>
              updateReportPosition(report.region.region_id, position)
            }
            onSizeChange={(size) => updateReportSize(report.region.region_id, size)}
          />
        ))}
      </div>
      <TopRegionCards
        candidateStates={candidateStates}
        selectedRegionIds={openReports.map((report) => report.region.region_id)}
        topRegions={topRegions}
        unit={unit}
        onCandidateStateChange={updateCandidateState}
        onSelectRegion={openRegionReport}
      />
      <EvidenceComparisonReport
        evidence={comparisonEvidence}
        result={activeComparisonReport}
        error={currentComparisonError}
        isLoading={isComparisonLoading}
        isReportGenerating={isReportGenerating}
        reportGenerationError={activeReportGenerationError}
        selectedCount={openReports.length}
        onGenerateReport={generateDetailedReport}
      />
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

function CandidateMiniReport({
  candidateState,
  containerRef,
  position,
  reportIndex,
  region,
  showCautionMetrics,
  size,
  unit,
  onCandidateStateChange,
  onClose,
  onPositionChange,
  onSizeChange,
}: {
  candidateState?: CandidateState;
  containerRef: RefObject<HTMLDivElement | null>;
  position: ReportPanelPosition | null;
  reportIndex: number;
  region: ReportRegion;
  showCautionMetrics: boolean;
  size: ReportPanelSize;
  unit: string;
  onCandidateStateChange: (state: CandidateState) => void;
  onClose: () => void;
  onPositionChange: (position: ReportPanelPosition) => void;
  onSizeChange: (size: ReportPanelSize) => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
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
  const minPanelSize = { width: 300, height: 280 };

  useEffect(() => {
    if (position || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const defaultX = reportIndex === 0
      ? Math.max(20, container.width - size.width - 20)
      : 20;

    onPositionChange({
      x: defaultX,
      y: 88 + reportIndex * 28,
    });
  }, [containerRef, onPositionChange, position, reportIndex, size.width]);

  function clampPosition(nextPosition: ReportPanelPosition) {
    const container = containerRef.current?.getBoundingClientRect();

    if (!container) {
      return nextPosition;
    }

    return {
      x: Math.min(Math.max(20, nextPosition.x), Math.max(20, container.width - size.width - 20)),
      y: Math.min(Math.max(20, nextPosition.y), Math.max(20, container.height - size.height - 20)),
    };
  }

  function clampSize(nextSize: ReportPanelSize) {
    const container = containerRef.current?.getBoundingClientRect();
    const maxWidth = container && position
      ? Math.max(minPanelSize.width, container.width - position.x - 20)
      : 640;
    const maxHeight = container && position
      ? Math.max(minPanelSize.height, container.height - position.y - 20)
      : 640;

    return {
      width: Math.min(Math.max(minPanelSize.width, nextSize.width), maxWidth),
      height: Math.min(Math.max(minPanelSize.height, nextSize.height), maxHeight),
    };
  }

  function handleDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!position) return;

    event.preventDefault();
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panelX: position.x,
      panelY: position.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onPositionChange(
        clampPosition({
          x: start.panelX + moveEvent.clientX - start.pointerX,
          y: start.panelY + moveEvent.clientY - start.pointerY,
        }),
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: size.width,
      height: size.height,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onSizeChange(
        clampSize({
          width: start.width + moveEvent.clientX - start.pointerX,
          height: start.height + moveEvent.clientY - start.pointerY,
        }),
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <aside
      className="absolute z-30 min-h-[280px] min-w-[300px] overflow-auto rounded-2xl border border-white/12 bg-[#0f1011]/95 p-5 text-[#f5f5f7] shadow-[0_24px_80px_rgba(0,0,0,0.48)] backdrop-blur"
      ref={panelRef}
      style={{
        height: size.height,
        left: position?.x ?? 20,
        top: position?.y ?? 88,
        width: size.width,
        zIndex: 30 + reportIndex,
      }}
    >
      <div
        className="flex cursor-move touch-none select-none items-start justify-between gap-4"
        onPointerDown={handleDragStart}
      >
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
            Mini Report 0{reportIndex + 1}
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
        <p className="text-xs font-semibold text-[#9f9fa0]">후보로 잡힌 이유</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(region.matched_indicators ?? []).length > 0 ? (
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
      <button
        aria-label="미니 리포트 크기 조절"
        className="absolute bottom-2 right-2 h-7 w-7 cursor-nwse-resize rounded-md border border-white/10 bg-white/[0.06] text-[#9f9fa0] transition hover:border-white/25 hover:bg-white/[0.12] hover:text-[#f5f5f7]"
        onPointerDown={handleResizeStart}
        type="button"
      >
        <span className="block translate-x-[1px] translate-y-[1px] text-[13px] leading-none">↘</span>
      </button>
    </aside>
  );
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
