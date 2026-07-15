import { useMemo } from "react";

import { formatNumber, formatRatio } from "@/lib/format";
import type { HeatmapLevel, HeatmapRegion } from "@/types/sweethome";

import type { ReportRegion } from "./types";

export function HeatmapDistribution({
  regions,
  topRegions,
  unit,
}: {
  regions: HeatmapRegion[];
  topRegions: ReportRegion[];
  unit: string;
}) {
  const chartRegions = useMemo(
    () =>
      regions
        .filter((region) => region.has_data && region.value !== null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
        .slice(0, 20),
    [regions],
  );

  const maxValue = chartRegions[0]?.value ?? 1;
  const minValue = chartRegions[chartRegions.length - 1]?.value ?? 0;
  const range = Math.max(maxValue - minValue, 1);

  const levelColor: Record<HeatmapLevel, string> = {
    very_high: "#847dff",
    high: "#00b3dd",
    medium: "#6a6b6b",
    low: "#3f4041",
    very_low: "#252829",
    no_data: "#191b1c",
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden p-6 sm:p-8">
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

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid gap-[6px]">
          {chartRegions.map((region, index) => {
            const barWidth = ((region.value ?? 0) - minValue) / range * 100;
            const isTopRegion = topRegions.some(
              (candidate) => candidate.region_id === region.region_id,
            );
            const color = levelColor[region.level];

            return (
              <div
                className="group flex items-center gap-3"
                key={region.region_id}
                title={`${region.display_name}: ${formatMapValue(region.value, unit)}`}
              >
                <span className="w-5 shrink-0 text-right font-mono text-[10px] text-[#6a6b6b]">
                  {index + 1}
                </span>
                <span
                  className={`w-[88px] shrink-0 truncate text-xs font-semibold ${
                    isTopRegion ? "text-[#f5f5f7]" : "text-[#9f9fa0]"
                  }`}
                >
                  {region.dong_name}
                  {isTopRegion ? (
                    <span className="ml-1 text-[9px] font-bold text-[#847dff]">
                      ●
                    </span>
                  ) : null}
                </span>
                <div className="relative h-[18px] flex-1 overflow-hidden rounded-[3px] bg-white/[0.05]">
                  <div
                    className="h-full rounded-[3px] transition-all duration-300"
                    style={{
                      width: `${Math.max(barWidth, 2)}%`,
                      background: color,
                      opacity: isTopRegion ? 1 : 0.55,
                    }}
                  />
                </div>
                <span className="w-[56px] shrink-0 text-right font-mono text-[10px] text-[#9f9fa0] group-hover:text-[#f5f5f7]">
                  {formatMapValue(region.value, unit)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {topRegions.length > 0 ? (
        <p className="mt-4 text-[10px] text-[#6a6b6b]">
          <span className="text-[#847dff]">●</span> 후보군에 포함된 행정동
        </p>
      ) : null}
    </div>
  );
}

function formatMapValue(value: number | null, unit: string) {
  if (value === null) return "데이터 없음";
  return unit === "%" ? formatRatio(value) : formatNumber(value, unit);
}
