import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "./lib/constants";

// The office app needs a session; texts, webhooks and the health check don't.
const PROTECTED = ["/today", "/launchpad", "/properties", "/applicants", "/viewings", "/linkbot", "/bot", "/docs", "/integrations", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/today/:path*", "/launchpad/:path*", "/properties/:path*", "/applicants/:path*", "/viewings/:path*", "/linkbot/:path*", "/bot/:path*", "/docs/:path*", "/integrations/:path*", "/settings/:path*"],
};
