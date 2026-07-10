"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { fetchHeatmap } from "@/lib/api";
import { formatNumber, formatRatio } from "@/lib/format";
import type {
  HeatmapLevel,
  HeatmapMetric,
  HeatmapRegion,
  HeatmapResponse,
} from "@/types/sweethome";

const METRICS: Array<{ id: HeatmapMetric; label: string }> = [
  { id: "jeonse_ratio", label: "전세가" },
  { id: "deposit_ratio", label: "실거래가" },
  { id: "safe_facility_density", label: "안전" },
  { id: "store_density", label: "편의" },
  { id: "living_population", label: "생활인구" },
];

const LEVEL_COLORS: Record<HeatmapLevel, string> = {
  very_low: "#252829",
  low: "#3f4041",
  medium: "#6a6b6b",
  high: "#00b3dd",
  very_high: "#847dff",
  no_data: "#191b1c",
};

const LEVEL_LABELS: Record<HeatmapLevel, string> = {
  very_low: "매우 낮음",
  low: "낮음",
  medium: "보통",
  high: "높음",
  very_high: "매우 높음",
  no_data: "데이터 없음",
};

type ReportView = "heatmap" | "map";

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
};

type KakaoLatLngBounds = {
  extend: (position: KakaoLatLng) => void;
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
  load: (callback: () => void) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
  }
}

export default function ReportMapPage() {
  const [metric, setMetric] = useState<HeatmapMetric>("jeonse_ratio");
  const [reportView, setReportView] = useState<ReportView>("heatmap");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadHeatmap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextHeatmap = await fetchHeatmap(metric);

        if (!ignore) {
          setHeatmap(nextHeatmap);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "지도 리포트 데이터를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadHeatmap();

    return () => {
      ignore = true;
    };
  }, [metric]);

  const topRegions = useMemo(() => {
    return heatmap?.regions.filter((region) => region.has_data).slice(0, 8) ?? [];
  }, [heatmap]);

  return (
    <main className="min-h-screen bg-[#090a0b] p-4 text-[#f5f5f7]">
      <section className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0f1011] lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
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
            후보군을 한 창에서 다시 봅니다
          </h1>
          <p className="mt-6 text-base leading-7 text-[#9f9fa0]">
            데이터 히트맵과 카카오 지도를 같은 리포트 안에서 전환합니다.
            먼저 분포를 보고, 필요할 때 실제 지도 위치감을 확인합니다.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
            {[
              { id: "heatmap", label: "데이터 히트맵" },
              { id: "map", label: "카카오 지도" },
            ].map((item) => {
              const selected = reportView === item.id;

              return (
                <button
                  className={`rounded-lg px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "bg-white text-black"
                      : "text-[#9f9fa0] hover:bg-white/[0.06] hover:text-[#f5f5f7]"
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
                      ? "border-white bg-white text-black"
                      : "border-white/12 bg-white/[0.06] text-[#cacaca] hover:border-white/35"
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

        <div className="relative min-h-[760px] bg-[#090a0b] p-5 sm:p-8">
          {isLoading ? (
            <MapNotice text="지도 데이터를 불러오는 중입니다." />
          ) : errorMessage ? (
            <MapNotice text={errorMessage} />
          ) : heatmap ? (
            <ReportVisual
              regions={heatmap.regions}
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
  topRegions,
  unit,
  view,
}: {
  regions: HeatmapRegion[];
  topRegions: HeatmapRegion[];
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
    <KakaoReportMap regions={regions} topRegions={topRegions} unit={unit} />
  );
}

function KakaoReportMap({
  regions,
  topRegions,
  unit,
}: {
  regions: HeatmapRegion[];
  topRegions: HeatmapRegion[];
  unit: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapStatus, setMapStatus] = useState<"ready" | "fallback" | "error">(
    "ready",
  );
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  const mappedTopRegions = useMemo(
    () =>
      topRegions.filter(
        (region) => region.centroid_lat !== null && region.centroid_lon !== null,
      ),
    [topRegions],
  );

  useEffect(() => {
    if (!appKey || !mapRef.current || mappedTopRegions.length === 0) {
      setMapStatus("fallback");
      return;
    }

    let cancelled = false;

    function drawMap() {
      if (cancelled || !window.kakao?.maps || !mapRef.current) {
        return;
      }

      const maps = window.kakao.maps;
      const centerRegion = mappedTopRegions[0];
      const center = new maps.LatLng(
        centerRegion.centroid_lat ?? 37.5665,
        centerRegion.centroid_lon ?? 126.978,
      );
      const map = new maps.Map(mapRef.current, {
        center,
        level: 8,
      });
      const bounds = new maps.LatLngBounds();

      mappedTopRegions.forEach((region) => {
        if (region.centroid_lat === null || region.centroid_lon === null) {
          return;
        }

        const position = new maps.LatLng(region.centroid_lat, region.centroid_lon);
        bounds.extend(position);
        new maps.Marker({
          map,
          position,
          title: `${region.display_name} ${formatMapValue(region.value, unit)}`,
        });
      });

      if (mappedTopRegions.length > 1) {
        map.setBounds(bounds);
      } else {
        map.setCenter(center);
        map.setLevel(7);
      }

      setMapStatus("ready");
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(drawMap);
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => window.kakao?.maps.load(drawMap);
    script.onerror = () => {
      if (!cancelled) {
        setMapStatus("error");
      }
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [appKey, mappedTopRegions, unit]);

  if (mapStatus !== "ready" || !appKey) {
    return (
      <div className="relative h-full min-h-[700px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]">
        <div className="absolute left-5 top-5 z-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9f9fa0] backdrop-blur">
          {appKey ? "Map fallback" : "Kakao key required"}
        </div>
        <MapLayer regions={regions} topRegions={topRegions} unit={unit} />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[700px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]">
      <div ref={mapRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,10,11,0.10),rgba(9,10,11,0.22))]" />
      <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
        Kakao map layer
      </div>
      <TopRegionCards topRegions={topRegions} unit={unit} />
    </div>
  );
}

function MapLayer({
  regions,
  topRegions,
  unit,
}: {
  regions: HeatmapRegion[];
  topRegions: HeatmapRegion[];
  unit: string;
}) {
  const visibleRegions = regions.filter((region) => region.has_data).slice(0, 180);

  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(132,125,255,0.12),transparent_24%),radial-gradient(circle_at_34%_70%,rgba(0,179,221,0.10),transparent_28%)]" />
      <div className="absolute inset-10">
        {visibleRegions.map((region) => {
          if (region.map_x === null || region.map_y === null) {
            return null;
          }

          return (
            <span
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 shadow-sm"
              key={region.region_id}
              style={{
                background: LEVEL_COLORS[region.level],
                left: `${Math.max(3, Math.min(97, region.map_x * 100))}%`,
                top: `${Math.max(3, Math.min(97, region.map_y * 100))}%`,
              }}
              title={`${region.display_name} ${formatMapValue(region.value, unit)}`}
            />
          );
        })}
      </div>

      <TopRegionCards topRegions={topRegions} unit={unit} />
      <div className="absolute left-5 top-16 flex max-w-[calc(100%-40px)] flex-wrap gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
        {(["very_low", "medium", "high", "very_high"] as HeatmapLevel[]).map(
          (level) => (
            <span
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9f9fa0]"
              key={level}
            >
              <i
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: LEVEL_COLORS[level] }}
              />
              {LEVEL_LABELS[level]}
            </span>
          ),
        )}
      </div>
    </>
  );
}

function TopRegionCards({
  topRegions,
  unit,
}: {
  topRegions: HeatmapRegion[];
  unit: string;
}) {
  return (
    <div className="absolute bottom-5 left-5 right-5 grid gap-3 md:grid-cols-4">
      {topRegions.slice(0, 4).map((region, index) => (
        <article
          className="rounded-2xl border border-white/10 bg-black/45 p-4 text-[#f5f5f7] shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur"
          key={region.region_id}
        >
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
            0{index + 1}
          </p>
          <h2 className="mt-2 truncate text-lg font-medium">{region.display_name}</h2>
          <p className="mt-3 text-sm text-[#9f9fa0]">
            {formatMapValue(region.value, unit)}
          </p>
        </article>
      ))}
    </div>
  );
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
