import { NextRequest, NextResponse } from "next/server";

import {
  createDevelopmentReport,
  deleteDevelopmentReport,
  developmentAgreementStatus,
  getDevelopmentReport,
  listDevelopmentReports,
} from "@/lib/dev-user-storage";
import type { SavedReportCreate } from "@/types/sweethome";
import {
  applyRateLimit,
  READ_RATE_LIMIT,
  readLimitedJsonBody,
  rejectCrossSiteMutation,
  WRITE_RATE_LIMIT,
} from "@/lib/request-security";
import { trustedAzureIdentity } from "@/lib/trusted-identity";

const API_BASE_URL = process.env.SWEETHOME_API_BASE_URL ?? "http://127.0.0.1:8000";
const ALLOWED_GET_PATHS = new Set([
  "auth/me",
  "agreements/me",
  "health",
  "regions",
  "metadata",
  "compare",
  "explore",
  "map/heatmap",
  "saved-reports",
]);
const SAVED_REPORT_DETAIL_PATH = /^saved-reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BACKEND_UNAVAILABLE_MESSAGE =
  "서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
const BACKEND_REQUEST_TIMEOUT_MS = 10_000;
const AGREEMENT_REQUEST_INTENT = "accept-current-agreement";

function backendHeaders(request: NextRequest) {
  const headers = new Headers({ accept: "application/json" });

  const internalKey = process.env.SWEETHOME_INTERNAL_API_KEY?.trim();
  if (internalKey) headers.set("x-sweethome-internal-key", internalKey);

  const azureIdentity = trustedAzureIdentity(request);
  const hasDevelopmentCookie = process.env.NODE_ENV === "development"
    && request.cookies.get("sweethome-dev-auth")?.value === "1";
  const developmentPrincipal = process.env.NODE_ENV === "development"
    ? process.env.SWEETHOME_DEV_AUTH_SUBJECT?.trim()
      || (hasDevelopmentCookie ? "local-development-user" : undefined)
    : undefined;
  const principal = azureIdentity?.subject || developmentPrincipal;
  if (principal) {
    headers.set("x-sweethome-principal-id", principal);
    headers.set(
      "x-sweethome-identity-provider",
      azureIdentity?.provider
        || (hasDevelopmentCookie
          ? request.cookies.get("sweethome-dev-provider")?.value
          : undefined)
        || "unknown",
    );
  }
  return headers;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const resource = path.join("/");

  if (!ALLOWED_GET_PATHS.has(resource) && !SAVED_REPORT_DETAIL_PATH.test(resource)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const rateLimitScope = SAVED_REPORT_DETAIL_PATH.test(resource)
    ? "saved-reports:detail"
    : resource;
  const rateLimitResponse = applyRateLimit(
    request,
    `get:${rateLimitScope}`,
    READ_RATE_LIMIT,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const developmentResponse = developmentGetResponse(request, resource);
  if (developmentResponse) return developmentResponse;

  const targetUrl = new URL(`/${path.join("/")}`, API_BASE_URL);
  targetUrl.search = request.nextUrl.search;

  try {
    const response = await fetch(targetUrl, {
      headers: backendHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_REQUEST_TIMEOUT_MS),
    });
    const payload = await response.json();

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: BACKEND_UNAVAILABLE_MESSAGE,
      },
      { status: 503 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const resource = path.join("/");
  if (resource !== "saved-reports" && resource !== "agreements/me") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const identity = trustedAzureIdentity(request);
  if (resource === "agreements/me" && !identity && !hasDevelopmentSession(request)) {
    return NextResponse.json(
      { code: "AUTHENTICATION_REQUIRED", message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }
  if (
    resource === "agreements/me"
    && request.headers.get("x-sweethome-request-intent") !== AGREEMENT_REQUEST_INTENT
  ) {
    return NextResponse.json(
      { code: "INVALID_REQUEST_INTENT", message: "약관 확인 요청을 다시 시도해 주세요." },
      { status: 403 },
    );
  }

  // Azure Easy Auth가 검증해 주입한 사용자 신원이 있는 약관 확인 요청은
  // 프록시 환경마다 달라질 수 있는 Fetch Metadata 대신 인증 신원과
  // 브라우저의 교차 출처 폼으로는 보낼 수 없는 명시적 요청 의도를 검증합니다.
  // 저장 리포트처럼 사용자 데이터를 변경하는 나머지 요청은 기존 출처 검증을 유지합니다.
  if (resource !== "agreements/me") {
    const crossSiteResponse = rejectCrossSiteMutation(request);
    if (crossSiteResponse) return crossSiteResponse;
  }
  const rateLimitResponse = applyRateLimit(request, `post:${resource}`, WRITE_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  const bodyResult = await readLimitedJsonBody(request);
  if (bodyResult.response) return bodyResult.response;

  const targetUrl = new URL(`/${resource}`, API_BASE_URL);
  const headers = backendHeaders(request);
  headers.set("content-type", "application/json");
  const body = bodyResult.body;
  const developmentResponse = developmentPostResponse(request, resource, body);
  if (developmentResponse) return developmentResponse;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_REQUEST_TIMEOUT_MS),
    });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: BACKEND_UNAVAILABLE_MESSAGE,
      },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const resource = path.join("/");
  if (!SAVED_REPORT_DETAIL_PATH.test(resource)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;
  const rateLimitResponse = applyRateLimit(request, "delete:saved-reports", WRITE_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  if (hasDevelopmentSession(request)) {
    return deleteDevelopmentReport(path[1])
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(
        { code: "SAVED_REPORT_NOT_FOUND", message: "삭제할 리포트를 찾지 못했습니다." },
        { status: 404 },
      );
  }

  try {
    const response = await fetch(new URL(`/${resource}`, API_BASE_URL), {
      method: "DELETE",
      headers: backendHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_REQUEST_TIMEOUT_MS),
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { code: "BACKEND_UNAVAILABLE", message: BACKEND_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }
}

function developmentGetResponse(request: NextRequest, resource: string) {
  if (!hasDevelopmentSession(request)) return null;
  if (resource === "auth/me") {
    return NextResponse.json({
      authenticated: true,
      provider: request.cookies.get("sweethome-dev-provider")?.value ?? "google",
    });
  }
  if (resource === "agreements/me") {
    return NextResponse.json(developmentAgreementStatus());
  }
  if (resource === "saved-reports") {
    return NextResponse.json(listDevelopmentReports());
  }
  if (SAVED_REPORT_DETAIL_PATH.test(resource)) {
    const report = getDevelopmentReport(resource.split("/")[1]);
    return report
      ? NextResponse.json(report)
      : NextResponse.json(
        { code: "SAVED_REPORT_NOT_FOUND", message: "저장한 리포트를 찾지 못했습니다." },
        { status: 404 },
      );
  }
  return null;
}

function developmentPostResponse(
  request: NextRequest,
  resource: string,
  body: string,
) {
  if (!hasDevelopmentSession(request)) return null;
  if (resource === "agreements/me") {
    return NextResponse.json(developmentAgreementStatus());
  }
  if (resource === "saved-reports") {
    try {
      return NextResponse.json(
        createDevelopmentReport(JSON.parse(body) as SavedReportCreate),
        { status: 201 },
      );
    } catch {
      return NextResponse.json(
        { code: "INVALID_REPORT", message: "로컬 리포트 요청을 확인해 주세요." },
        { status: 422 },
      );
    }
  }
  return null;
}

function hasDevelopmentSession(request: NextRequest) {
  return process.env.NODE_ENV === "development"
    && request.cookies.get("sweethome-dev-auth")?.value === "1";
}
