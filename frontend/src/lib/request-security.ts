import { NextRequest, NextResponse } from "next/server";

import { trustedAzureIdentity } from "@/lib/trusted-identity";

const MAX_JSON_BODY_BYTES = 64 * 1024;
const MAX_RATE_LIMIT_KEYS = 10_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

export const READ_RATE_LIMIT: RateLimitPolicy = { limit: 180, windowMs: 60_000 };
export const WRITE_RATE_LIMIT: RateLimitPolicy = { limit: 10, windowMs: 60_000 };

export function rejectCrossSiteMutation(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return forbiddenResponse();
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const requestOrigin = new URL(origin).origin;
    if (!trustedRequestOrigins(request).has(requestOrigin)) return forbiddenResponse();
  } catch {
    return forbiddenResponse();
  }
  return null;
}

function trustedRequestOrigins(request: NextRequest) {
  const origins = new Set([request.nextUrl.origin]);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    try {
      origins.add(new URL(configuredSiteUrl).origin);
    } catch {
      // 배포 설정 검증 단계에서 잘못된 URL을 차단하며, 런타임에서는 안전하게 무시합니다.
    }
  }

  return origins;
}

export async function readLimitedJsonBody(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return {
      response: NextResponse.json(
        { code: "UNSUPPORTED_MEDIA_TYPE", message: "JSON 요청만 지원합니다." },
        { status: 415 },
      ),
    };
  }

  const contentLength = request.headers.get("content-length");
  const declaredLength = contentLength === null ? 0 : Number(contentLength);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return { response: payloadTooLargeResponse() };
  }

  const reader = request.body?.getReader();
  if (!reader) return { body: "" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      return { response: payloadTooLargeResponse() };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body: new TextDecoder().decode(bytes) };
}

export function applyRateLimit(
  request: NextRequest,
  scope: string,
  policy: RateLimitPolicy,
) {
  const now = Date.now();
  const key = `${scope}:${requestIdentity(request)}`;
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : existing;

  bucket.count += 1;
  buckets.set(key, bucket);
  pruneBuckets(now);

  if (bucket.count <= policy.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    {
      code: "RATE_LIMITED",
      message: "요청이 잠시 많습니다. 잠시 후 다시 시도해 주세요.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function resetRateLimitsForTests() {
  if (process.env.NODE_ENV === "test") buckets.clear();
}

function requestIdentity(request: NextRequest) {
  const identity = trustedAzureIdentity(request);
  if (identity) return `user:${identity.subject}`;

  const forwardedChain = request.headers.get("x-forwarded-for")?.split(",");
  const nearestForwardedAddress = forwardedChain?.at(-1)?.trim();
  return `ip:${(nearestForwardedAddress || "unknown").slice(0, 64)}`;
}

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_RATE_LIMIT_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now || buckets.size > MAX_RATE_LIMIT_KEYS) {
      buckets.delete(key);
    }
    if (buckets.size <= MAX_RATE_LIMIT_KEYS) break;
  }
}

function forbiddenResponse() {
  return NextResponse.json(
    { code: "CROSS_SITE_REQUEST_REJECTED", message: "허용되지 않은 요청입니다." },
    { status: 403 },
  );
}

function payloadTooLargeResponse() {
  return NextResponse.json(
    { code: "PAYLOAD_TOO_LARGE", message: "요청 데이터가 너무 큽니다." },
    { status: 413 },
  );
}
