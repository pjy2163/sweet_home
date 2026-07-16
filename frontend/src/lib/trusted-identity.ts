import type { NextRequest } from "next/server";

const PROVIDER_PATTERN = /^[a-z0-9._-]{1,64}$/;

export function trustedAzureIdentity(request: NextRequest) {
  if (process.env.SWEETHOME_TRUST_AZURE_IDENTITY_HEADERS !== "true") {
    return null;
  }

  const subject = request.headers.get("x-ms-client-principal-id")?.trim();
  if (!subject || subject.length > 255) return null;

  const provider = request.headers.get("x-ms-client-principal-idp")?.trim()
    || "unknown";
  if (!PROVIDER_PATTERN.test(provider)) return null;

  return { subject, provider };
}
