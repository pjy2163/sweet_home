import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.SWEETHOME_API_BASE_URL ?? "http://127.0.0.1:8000";
const ALLOWED_GET_PATHS = new Set([
  "auth/me",
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
  const developmentPrincipal = process.env.NODE_ENV === "development"
    ? process.env.SWEETHOME_DEV_AUTH_SUBJECT?.trim()
    : undefined;
  const principal = azurePrincipal || developmentPrincipal;
  if (principal) {
    headers.set("x-sweethome-principal-id", principal);
    headers.set(
      "x-sweethome-identity-provider",
      request.headers.get("x-ms-client-principal-idp")?.trim() || "unknown",
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
  if (resource !== "saved-reports") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const targetUrl = new URL("/saved-reports", API_BASE_URL);
  const headers = backendHeaders(request);
  headers.set("content-type", "application/json");

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: await request.text(),
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
