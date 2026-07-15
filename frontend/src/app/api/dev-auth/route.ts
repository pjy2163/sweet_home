import { NextRequest, NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth";

const AUTH_COOKIE = "sweethome-dev-auth";
const PROVIDER_COOKIE = "sweethome-dev-provider";

export function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "지원하지 않는 경로입니다." },
      { status: 404 },
    );
  }

  const redirectPath = safeRedirectPath(
    request.nextUrl.searchParams.get("redirect") ?? undefined,
    "/",
  );
  const response = NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin));

  if (request.nextUrl.searchParams.get("mode") === "logout") {
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(PROVIDER_COOKIE);
    return response;
  }

  const requestedProvider = request.nextUrl.searchParams.get("provider");
  const provider = requestedProvider === "github" ? "github" : "google";
  const cookieOptions = {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax" as const,
    secure: false,
  };
  response.cookies.set(AUTH_COOKIE, "1", cookieOptions);
  response.cookies.set(PROVIDER_COOKIE, provider, cookieOptions);
  return response;
}
