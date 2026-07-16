import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { trustedAzureIdentity } from "@/lib/trusted-identity";

afterEach(() => vi.unstubAllEnvs());

describe("trusted Azure identity", () => {
  it("fails closed until Azure Easy Auth header trust is explicitly enabled", () => {
    const request = new NextRequest("https://sweethome.test/api/backend/auth/me", {
      headers: {
        "x-ms-client-principal-id": "attacker-controlled-subject",
        "x-ms-client-principal-idp": "google",
      },
    });

    expect(trustedAzureIdentity(request)).toBeNull();
  });

  it("accepts bounded identity headers after the deployment boundary is enabled", () => {
    vi.stubEnv("SWEETHOME_TRUST_AZURE_IDENTITY_HEADERS", "true");
    const request = new NextRequest("https://sweethome.test/api/backend/auth/me", {
      headers: {
        "x-ms-client-principal-id": "opaque-subject",
        "x-ms-client-principal-idp": "github",
      },
    });

    expect(trustedAzureIdentity(request)).toEqual({
      subject: "opaque-subject",
      provider: "github",
    });
  });
});
