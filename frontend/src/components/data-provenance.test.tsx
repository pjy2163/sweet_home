import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataBasis, OfficialSourceLinks } from "./data-provenance";

describe("DataBasis", () => {
  it("모든 화면에서 공통 날짜 형식을 제공한다", () => {
    render(<DataBasis primaryDate="202512" />);

    expect(screen.getByText("기준 2025년 12월")).toBeInTheDocument();
  });
});

describe("OfficialSourceLinks", () => {
  it("공식 원천을 새 탭 링크로 제공한다", () => {
    render(
      <OfficialSourceLinks
        sources={[{ label: "공식 데이터", url: "https://example.com/data" }]}
      />,
    );

    expect(screen.getByRole("link", { name: "공식 데이터 ↗" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
