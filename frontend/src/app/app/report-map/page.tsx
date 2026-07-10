"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchHeatmap } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { HeatmapMetric, HeatmapRegion, HeatmapResponse } from "@/types/sweethome";

const METRICS: Array<{ id: HeatmapMetric; label: string }> = [
  { id: "jeonse_ratio", label: "전세가" },
  { id: "deposit_ratio", label: "실거래가" },
  { id: "safe_facility_density", label: "안전" },
  { id: "store_density", label: "편의" },
  { id: "living_population", label: "생활인구" },
];

const LEVEL_COLORS: Record<string, string> = {
  very_low: "#dfe8e1",
  low: "#bdd0c3",
  medium: "#8fa997",
  high: "#476b59",
  very_high: "#121d17",
  no_data: "#edf1ec",
};

export default function ReportMapPage() {
  const [metric, setMetric] = useState<HeatmapMetric>("jeonse_ratio");
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
    <main className="min-h-screen bg-[#e9eee9] p-4 text-[#121d17]">
      <section className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-[#cbd5cf] bg-[#fbfcf8] lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-[#d7e6df] p-8 lg:border-b-0 lg:border-r">
          <Link
            className="text-xs font-bold uppercase tracking-[0.16em] text-[#607068]"
            href="/app"
          >
            ← Decision Workspace
          </Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-[#607068]">
            Detailed Report
          </p>
          <h1 className="mt-4 text-4xl font-normal leading-[1.05] tracking-[-0.055em]">
            후보군을 지도에서 다시 보기
          </h1>
          <p className="mt-6 text-base leading-7 text-[#5e7069]">
            현재는 내부 히트맵 좌표로 지표 분포를 보여줍니다. 이후 이 영역에
            네이버 지도 또는 카카오 지도 SDK를 연결해 행정동 경계와 후보군을
            함께 표시합니다.
          </p>

          <div className="mt-9 flex flex-wrap gap-2">
            {METRICS.map((item) => {
              const selected = metric === item.id;

              return (
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    selected
                      ? "border-[#121d17] bg-[#121d17] text-[#f5f4ee]"
                      : "border-[#d3ddd6] bg-[#f7faf6] text-[#52655a] hover:border-[#173d31]"
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
            <div className="mt-10 grid gap-4 text-sm text-[#5e7069]">
              <SummaryRow label="지표" value={heatmap.metadata.metric_label} />
              <SummaryRow
                label="행정동"
                value={`${heatmap.metadata.data_region_count}/${heatmap.metadata.region_count}개`}
              />
              <SummaryRow label="단위" value={heatmap.metadata.unit} />
            </div>
          ) : null}
        </aside>

        <div className="relative min-h-[760px] bg-[#edf2ee]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(223,255,98,0.18),transparent_24%),linear-gradient(135deg,rgba(18,29,23,0.08),transparent_36%,rgba(18,29,23,0.06))]" />
          <div className="absolute inset-6 rounded-[2rem] border border-[#c8d4cd]" />
          <div className="absolute left-[8%] right-[8%] top-[46%] h-20 -rotate-6 rounded-full border-y border-[#bdd0c5] opacity-70" />
          <div className="absolute bottom-[21%] left-[12%] right-[16%] h-14 rotate-7 rounded-full border-y border-[#cbd9d1] opacity-70" />

          {isLoading ? (
            <MapNotice text="지도 데이터를 불러오는 중입니다." />
          ) : errorMessage ? (
            <MapNotice text={errorMessage} />
          ) : heatmap ? (
            <MapLayer regions={heatmap.regions} topRegions={topRegions} unit={heatmap.metadata.unit} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-4 border-t border-[#d7e6df] pt-4">
      <dt className="font-bold text-[#172019]">{label}</dt>
      <dd>{value}</dd>
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

      <div className="absolute bottom-8 left-8 right-8 grid gap-4 md:grid-cols-4">
        {topRegions.slice(0, 4).map((region, index) => (
          <article
            className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(18,29,23,0.12)] backdrop-blur"
            key={region.region_id}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#607068]">
              0{index + 1}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{region.display_name}</h2>
            <p className="mt-3 text-sm font-bold text-[#527367]">
              {formatMapValue(region.value, unit)}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function MapNotice({ text }: { text: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(420px,calc(100%-48px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#d7e6df] bg-white p-6 text-center text-sm font-bold text-[#5e7069]">
      {text}
    </div>
  );
}

function formatMapValue(value: number | null, unit: string) {
  if (value === null) {
    return "데이터 없음";
  }

  if (unit === "%") {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  return `${formatNumber(value)}${unit}`;
}
