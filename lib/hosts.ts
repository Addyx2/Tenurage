// Which site a request is for. The product lives at APP_URL (e.g.
// https://app.tenurage.com); the marketing site at the same domain without
// "app." (tenurage.com and www.tenurage.com). Anything else, such as
// localhost or a Vercel preview, serves both.

export type Site = "app" | "marketing" | "both";

export function hostsFrom(appUrl: string | undefined): { app: string; marketing: string[] } | null {
  if (!appUrl) return null;
  let app: string;
  try {
    app = new URL(appUrl).host.toLowerCase();
  } catch {
    return null;
  }
  if (!app.startsWith("app.")) return { app, marketing: [] };
  const root = app.slice(4);
  return { app, marketing: [root, `www.${root}`] };
}

export function siteFor(host: string | null | undefined, appUrl: string | undefined): Site {
  const hosts = hostsFrom(appUrl);
  const h = (host ?? "").toLowerCase();
  if (!hosts || !h) return "both";
  if (h === hosts.app) return "app";
  if (hosts.marketing.includes(h)) return "marketing";
  return "both";
}

/** On the marketing site, only the landing page, its files and the API stay; everything else moves to the app. */
export function staysOnMarketing(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/api/") || pathname.startsWith("/landing/") || pathname === "/robots.txt" || pathname === "/sitemap.xml";
}
