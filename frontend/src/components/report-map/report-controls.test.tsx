import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportControls } from "./report-controls";

const METRICS = [
  { id: "jeonse_ratio" as const, label: "전세가" },
  { id: "bus_stop_density" as const, label: "버스정류소 밀도" },
];

describe("ReportControls", () => {
  it("결과 화면에서 보기 방식과 데이터를 바로 변경한다", async () => {
    const user = userEvent.setup();
    const onMetricChange = vi.fn();
    const onViewChange = vi.fn();

    render(
      <ReportControls
        metric="jeonse_ratio"
        metrics={METRICS}
        onMetricChange={onMetricChange}
        onViewChange={onViewChange}
        view="map"
      />,
    );

    await user.click(screen.getByRole("button", { name: "순위 보기" }));
    await user.click(screen.getByRole("button", { name: "버스정류소 밀도" }));

    expect(onViewChange).toHaveBeenCalledWith("heatmap");
    expect(onMetricChange).toHaveBeenCalledWith("bus_stop_density");
  });
});
