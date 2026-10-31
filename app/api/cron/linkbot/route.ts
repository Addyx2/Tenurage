import { timingSafeEqual } from "node:crypto";

import { tick } from "@/lib/linkbot/campaign";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  if (!process.env.CRON_SECRET) return false;
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Moves Linkbot on: next waves, reminders, feedback. Call it every few minutes
// with `Authorization: Bearer $CRON_SECRET` (Vercel cron or any scheduler).
// Without it Linkbot still moves on whenever the office uses Tenurage or a text arrives.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: "CRON_SECRET isn't set, so this scheduled run is off." }, { status: 503 });
  if (!authorised(request)) return Response.json({ error: "Unauthorised" }, { status: 401 });
  await tick();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
