import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.SWEETHOME_API_BASE_URL ?? "http://127.0.0.1:8000";
const ALLOWED_PATHS = new Set([
  "health",
  "regions",
  "metadata",
  "compare",
  "explore",
  "map",
  "ai",
]);
const BACKEND_UNAVAILABLE_MESSAGE =
  "FastAPI 서버에 연결할 수 없습니다. 백엔드를 먼저 실행해 주세요: .venv/bin/uvicorn src.api.main:app --host 127.0.0.1 --port 8000";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const [resource] = path;

  if (!resource || !ALLOWED_PATHS.has(resource)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const targetUrl = new URL(`/${path.join("/")}`, API_BASE_URL);
  targetUrl.search = request.nextUrl.search;

  try {
    const response = await fetch(targetUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json();

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: BACKEND_UNAVAILABLE_MESSAGE,
        target: API_BASE_URL,
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
  const [resource] = path;

  if (!resource || !ALLOWED_PATHS.has(resource)) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 API 경로입니다." },
      { status: 404 },
    );
  }

  const targetUrl = new URL(`/${path.join("/")}`, API_BASE_URL);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
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
        target: API_BASE_URL,
      },
      { status: 503 },
    );
  }
}
