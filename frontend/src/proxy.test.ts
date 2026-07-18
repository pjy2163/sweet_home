import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("apex domain routing", () => {
  it("rewrites the apex homepage to the Parang Labs introduction", () => {
    const response = proxy(
      new NextRequest("https://paranglabs.com/", {
        headers: { host: "paranglabs.com" },
      }),
    );

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://paranglabs.com/parang-labs",
    );
  });

  it("keeps apex robots available to crawlers", () => {
    const response = proxy(
      new NextRequest("https://paranglabs.com/robots.txt", {
        headers: { host: "paranglabs.com" },
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps the apex authorized seller file available to ad crawlers", () => {
    const response = proxy(
      new NextRequest("https://paranglabs.com/ads.txt", {
        headers: { host: "paranglabs.com" },
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects other apex paths to the canonical SweetHome origin", () => {
    const response = proxy(
      new NextRequest("https://paranglabs.com/privacy?from=review", {
        headers: { host: "paranglabs.com" },
      }),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://sweethome.paranglabs.com/privacy?from=review",
    );
  });

  it("does not change SweetHome requests", () => {
    const response = proxy(
      new NextRequest("https://sweethome.paranglabs.com/app", {
        headers: { host: "sweethome.paranglabs.com" },
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
