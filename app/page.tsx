import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Landing } from "@/components/Landing";
import { getSessionUser } from "@/lib/auth";
import { siteFor } from "@/lib/hosts";

export const dynamic = "force-dynamic";

/** tenurage.com shows the landing page; app.tenurage.com goes straight into the product. */
export default async function Home() {
  const h = await headers();
  const site = siteFor(h.get("x-forwarded-host") ?? h.get("host"), process.env.APP_URL);
  if (site === "app") redirect((await getSessionUser()) ? "/today" : "/login");
  return <Landing app={site === "marketing" ? process.env.APP_URL!.replace(/\/+$/, "") : ""} />;
}
