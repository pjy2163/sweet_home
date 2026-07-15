import { NextRequest, NextResponse } from "next/server";

import {
  createDevelopmentReport,
  deleteDevelopmentReport,
  developmentAgreementStatus,
  getDevelopmentReport,
  listDevelopmentReports,
} from "@/lib/dev-user-storage";
import type { SavedReportCreate } from "@/types/sweethome";

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
const SAVED_REPORT_DETAIL_PATH = /^saved-reports\/[0-9a-f-]{36}$/i;
const BACKEND_UNAVAILABLE_MESSAGE =
  "서비스 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";

function backendHeaders(request: NextRequest) {
  const headers = new Headers({ accept: "application/json" });

  const internalKey = process.env.SWEETHOME_INTERNAL_API_KEY?.trim();
  if (internalKey) headers.set("x-sweethome-internal-key", internalKey);

  const azurePrincipal = request.headers.get("x-ms-client-principal-id")?.trim();
  const hasDevelopmentCookie = process.env.NODE_ENV === "development"
    && request.cookies.get("sweethome-dev-auth")?.value === "1";
  const developmentPrincipal = process.env.NODE_ENV === "development"
    ? process.env.SWEETHOME_DEV_AUTH_SUBJECT?.trim()
      || (hasDevelopmentCookie ? "local-development-user" : undefined)
    : undefined;
  const principal = azurePrincipal || developmentPrincipal;
  if (principal) {
    headers.set("x-sweethome-principal-id", principal);
    headers.set(
      "x-sweethome-identity-provider",
      request.headers.get("x-ms-client-principal-idp")?.trim()
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

  const developmentResponse = developmentGetResponse(request, resource);
  if (developmentResponse) return developmentResponse;

  const targetUrl = new URL(`/${path.join("/")}`, API_BASE_URL);
  targetUrl.search = request.nextUrl.search;

  try {
    const response = await fetch(targetUrl, {
      headers: backendHeaders(request),
      cache: "no-store",
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

  const targetUrl = new URL(`/${resource}`, API_BASE_URL);
  const headers = backendHeaders(request);
  headers.set("content-type", "application/json");
  const body = await request.text();
  const developmentResponse = developmentPostResponse(request, resource, body);
  if (developmentResponse) return developmentResponse;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
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
