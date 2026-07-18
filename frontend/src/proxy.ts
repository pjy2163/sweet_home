import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const APEX_DOMAIN = "paranglabs.com";
const SWEETHOME_ORIGIN = "https://sweethome.paranglabs.com";

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":", 1)[0].toLowerCase();

  if (hostname !== APEX_DOMAIN) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/parang-labs", request.url));
  }

  if (["/ads.txt", "/robots.txt"].includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(
    new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, SWEETHOME_ORIGIN),
    308,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
