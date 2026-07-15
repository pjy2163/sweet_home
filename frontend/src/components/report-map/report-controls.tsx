import type { HeatmapMetric } from "@/types/sweethome";

export type ReportView = "heatmap" | "map";

type MetricOption = {
  id: HeatmapMetric;
  label: string;
};

const VIEW_OPTIONS: Array<{ id: ReportView; label: string }> = [
  { id: "map", label: "지도" },
  { id: "heatmap", label: "순위 보기" },
];

export function ReportControls({
  metric,
  metrics,
  onMetricChange,
  onViewChange,
  view,
}: {
  metric: HeatmapMetric;
  metrics: MetricOption[];
  onMetricChange: (metric: HeatmapMetric) => void;
  onViewChange: (view: ReportView) => void;
  view: ReportView;
}) {
  return (
    <section
      aria-label="지도 표시 설정"
      className="mb-4 rounded-xl border border-line bg-white p-3 shadow-[0_8px_24px_rgba(67,62,63,.08)] sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex shrink-0 rounded-lg bg-surface-soft p-1" role="group" aria-label="보기 방식">
          {VIEW_OPTIONS.map((option) => (
            <button
              aria-pressed={view === option.id}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === option.id
                  ? "bg-white text-ink shadow-sm"
                  : "text-[#747d8f] hover:text-[#3f4a60]"
              }`}
              key={option.id}
              onClick={() => onViewChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="h-8 w-px bg-[#e2e5ea]" aria-hidden="true" />

        <div className="flex min-w-0 flex-1 flex-wrap gap-2" role="group" aria-label="지도에 표시할 데이터">
          {metrics.map((option) => (
            <button
              aria-pressed={metric === option.id}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                metric === option.id
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-[#626b7d] hover:border-[#9aa5b5]"
              }`}
              key={option.id}
              onClick={() => onMetricChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
