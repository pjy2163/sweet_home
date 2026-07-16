import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RegionSearchCombobox } from "@/components/region-search-combobox";
import type { RegionOption } from "@/types/sweethome";

const REGIONS: RegionOption[] = [
  {
    region_id: "1168064000",
    gu_name: "강남구",
    dong_name: "역삼1동",
    display_name: "강남구 역삼1동",
  },
  {
    region_id: "1162069500",
    gu_name: "관악구",
    dong_name: "신림동",
    display_name: "관악구 신림동",
  },
  {
    region_id: "1111061500",
    gu_name: "종로구",
    dong_name: "종로1·2·3·4가동",
    display_name: "종로구 종로1·2·3·4가동",
  },
];

function renderCombobox({
  excludedRegionId,
  onChange = vi.fn(),
  value = "",
}: {
  excludedRegionId?: string;
  onChange?: (regionId: string) => void;
  value?: string;
} = {}) {
  render(
    <RegionSearchCombobox
      excludedRegionId={excludedRegionId}
      label="후보 지역 1"
      onChange={onChange}
      regions={REGIONS}
      value={value}
    />,
  );

  return screen.getByRole("combobox", { name: "후보 지역 1" });
}

describe("RegionSearchCombobox", () => {
  it("지역 이름으로 결과를 좁혀 선택한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const combobox = renderCombobox({ onChange });

    await user.click(combobox);
    await user.type(combobox, "신림");
    await user.click(screen.getByRole("option", { name: /신림동/ }));

    expect(onChange).toHaveBeenCalledWith("1162069500");
  });

  it("한글 초성으로 지역을 검색한다", async () => {
    const user = userEvent.setup();
    const combobox = renderCombobox();

    await user.click(combobox);
    await user.type(combobox, "ㅇㅅ");

    expect(screen.getByRole("option", { name: /역삼1동/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /신림동/ })).not.toBeInTheDocument();
  });

  it("다른 입력에서 이미 고른 지역은 후보에서 제외한다", async () => {
    const user = userEvent.setup();
    const combobox = renderCombobox({ excludedRegionId: "1162069500" });

    await user.click(combobox);

    expect(screen.queryByRole("option", { name: /신림동/ })).not.toBeInTheDocument();
    expect(screen.getByText("2곳")).toBeInTheDocument();
  });

  it("키보드로 지역을 선택하고 기존 선택을 해제한다", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const combobox = renderCombobox({ onChange, value: "1168064000" });

    expect(combobox).toHaveValue("강남구 역삼1동");
    await user.click(screen.getByRole("button", { name: "후보 지역 1 선택 해제" }));
    expect(onChange).toHaveBeenCalledWith("");

    await user.type(combobox, "신림{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("1162069500");
  });
});
