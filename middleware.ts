import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "./lib/constants";
import { siteFor, staysOnMarketing } from "./lib/hosts";

// The office app needs a session; texts, webhooks and the health check don't.
const PROTECTED = ["/today", "/launchpad", "/properties", "/applicants", "/viewings", "/linkbot", "/bot", "/docs", "/integrations", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  // tenurage.com is the marketing site: sign in, sign up and the app move to app.tenurage.com.
  if (siteFor(host, process.env.APP_URL) === "marketing" && !staysOnMarketing(pathname)) {
    return NextResponse.redirect(`${process.env.APP_URL!.replace(/\/+$/, "")}${pathname}${search}`, 308);
  }

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own files; the API is let through above.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
