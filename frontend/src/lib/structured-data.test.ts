import { describe, expect, it } from "vitest";

import { serializeStructuredData } from "./structured-data";

describe("serializeStructuredData", () => {
  it("returns parseable JSON without an executable closing script tag", () => {
    const serialized = serializeStructuredData({
      name: "SweetHome",
      description: "</script><script>alert('xss')</script>",
    });

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual({
      name: "SweetHome",
      description: "</script><script>alert('xss')</script>",
    });
  });

  it("escapes JavaScript line separator characters", () => {
    const serialized = serializeStructuredData({ value: "line\u2028paragraph\u2029end" });

    expect(serialized).toContain("\\u2028");
    expect(serialized).toContain("\\u2029");
  });
});
