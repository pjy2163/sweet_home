"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchHeatmap } from "@/lib/api";
import { formatNumber, formatRatio } from "@/lib/format";
import type {
  HeatmapLevel,
  HeatmapMetric,
  HeatmapRegion,
  HeatmapResponse,
} from "@/types/sweethome";

const HEATMAP_METRICS: Array<{ id: HeatmapMetric; label: string }> = [
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

export function SeoulHeatmap() {
  const [metric, setMetric] = useState<HeatmapMetric>("jeonse_ratio");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
              : "히트맵 데이터를 불러오지 못했습니다.",
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

  const mappedRegions = useMemo(() => {
    return (
      heatmap?.regions.filter(
        (region) => region.map_x !== null && region.map_y !== null,
      ) ?? []
    );
  }, [heatmap]);

  const topRegions = useMemo(() => {
    return heatmap?.regions.filter((region) => region.has_data).slice(0, 5) ?? [];
  }, [heatmap]);

  return (
    <section
      className="mx-auto w-[min(calc(100%_-_48px),1240px)] pb-20"
      id="heatmap-report"
    >
      <div className="overflow-hidden rounded-[1.5rem] bg-[#0f1011] text-[#f5f5f7]">
        <div className="grid min-h-[720px] lg:grid-cols-[0.86fr_1.14fr]">
          <aside className="border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
            <p className="font-mono text-[11px] font-semibold uppercase leading-6 tracking-[0.18em] text-[#9f9fa0]">
              Seoul Heatmap
            </p>
            <h2 className="mt-6 max-w-md text-5xl font-normal leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              서울 행정동 지표를 한 화면에 봅니다
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#9f9fa0]">
              공공데이터를 행정동 기준으로 맞춘 뒤, 값의 상대 구간을 자체
              히트맵으로 시각화합니다.
            </p>

            <div className="mt-10 flex flex-wrap gap-2">
              {HEATMAP_METRICS.map((item) => {
                const selected = item.id === metric;

                return (
                  <button
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
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
              <dl className="mt-12 grid gap-4 text-sm text-[#9f9fa0]">
                <HeatmapStat label="지표" value={heatmap.metadata.metric_label} />
                <HeatmapStat
                  label="행정동"
                  value={`${heatmap.metadata.data_region_count}/${heatmap.metadata.region_count}`}
                />
                <HeatmapStat
                  label="범위"
                  value={`${formatHeatmapValue(
                    heatmap.metadata.min_value,
                    heatmap.metadata.unit,
                  )} - ${formatHeatmapValue(
                    heatmap.metadata.max_value,
                    heatmap.metadata.unit,
                  )}`}
                />
              </dl>
            ) : null}

            <p className="mt-10 text-sm leading-6 text-[#6a6b6b]">
              이 화면은 지표 분포를 빠르게 보기 위한 데이터 레이어입니다. 지역
              선택, 우열 판단, 안전 단정 또는 투자 판단을 의미하지 않습니다.
            </p>
          </aside>

          <div className="relative min-h-[620px] bg-[#090a0b] p-5 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_36%,rgba(132,125,255,0.13),transparent_25%),radial-gradient(circle_at_34%_72%,rgba(0,179,221,0.11),transparent_28%)]" />
            <div className="relative grid h-full grid-rows-[1fr_auto] gap-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]">
                <MapFrame
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  regions={mappedRegions}
                  unit={heatmap?.metadata.unit ?? ""}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {topRegions.map((region, index) => (
                  <article
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                    key={region.region_id}
                  >
                    <p className="font-mono text-[10px] font-semibold uppercase leading-5 tracking-[0.16em] text-[#6a6b6b]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 truncate text-base font-medium text-[#f5f5f7]">
                      {region.dong_name}
                    </h3>
                    <p className="mt-3 text-sm text-[#9f9fa0]">
                      {formatHeatmapValue(region.value, heatmap?.metadata.unit ?? "")}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MapFrame({
  errorMessage,
  isLoading,
  regions,
  unit,
}: {
  errorMessage: string;
  isLoading: boolean;
  regions: HeatmapRegion[];
  unit: string;
}) {
  if (isLoading) {
    return <MapNotice text="히트맵 데이터를 불러오는 중입니다." />;
  }

  if (errorMessage) {
    return <MapNotice text={errorMessage} />;
  }

  return (
    <>
      <div className="absolute inset-8 rounded-[48%] border border-white/[0.04]" />
      <div className="absolute inset-x-[10%] top-1/2 border-t border-white/[0.04]" />
      <div className="absolute inset-y-[10%] left-1/2 border-l border-white/[0.04]" />
      {regions.map((region) => {
        const opacity = region.has_data ? 0.42 + (region.percentile ?? 0) / 180 : 0.18;
        const size = region.has_data ? 5 + (region.percentile ?? 0) / 16 : 4;

        return (
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[3px] transition hover:z-20 hover:scale-[1.8]"
            key={region.region_id}
            style={{
              background: LEVEL_COLORS[region.level],
              height: `${size}px`,
              left: `${Math.max(3, Math.min(97, (region.map_x ?? 0) * 100))}%`,
              opacity,
              top: `${Math.max(3, Math.min(97, (region.map_y ?? 0) * 100))}%`,
              width: `${size}px`,
            }}
            title={`${region.display_name} · ${formatHeatmapValue(
              region.value,
              unit,
            )} · ${LEVEL_LABELS[region.level]}`}
          />
        );
      })}

      <div className="absolute bottom-5 left-5 flex flex-wrap gap-3 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur">
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

function HeatmapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-5 border-t border-white/10 pt-4">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6a6b6b]">
        {label}
      </dt>
      <dd className="text-[#cacaca]">{value}</dd>
    </div>
  );
}

function MapNotice({ text }: { text: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(420px,calc(100%_-_48px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0f1011] p-6 text-center text-sm text-[#9f9fa0]">
      {text}
    </div>
  );
}

function formatHeatmapValue(value: number | null, unit: string) {
  if (value === null) {
    return "데이터 없음";
  }

  if (unit === "%") {
    return formatRatio(value);
  }

  return formatNumber(value, unit);
}
