import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, CalendarClock, Flame, Home, MessageSquareText, Users } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maybeTick } from "@/lib/linkbot/campaign";
import { launchpadNumbers } from "@/lib/office";

export const metadata = { title: "Launchpad" };
export const dynamic = "force-dynamic";

const hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
const today = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" });

interface Attention {
  key: string;
  tone: "red" | "amber" | "blue";
  text: string;
  href: string;
  action: string;
}

export default async function LaunchpadPage() {
  const user = await requireUser();
  await maybeTick();
  const agencyId = user.agencyId;
  const now = new Date();
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const [n, bot, noSlots, emptySoon, unmarked, hot, unreachable, broken, todays, texts] = await Promise.all([
    launchpadNumbers(agencyId),
    prisma.linkbot.findUnique({ where: { agencyId } }),
    prisma.property.findMany({ where: { agencyId, status: "AVAILABLE", viewings: { none: { startAt: { gt: now }, status: { in: ["OPEN", "BOOKED"] } } } }, take: 5 }),
    prisma.viewing.findMany({ where: { agencyId, status: "OPEN", startAt: { gt: now, lt: new Date(now.getTime() + 2 * 86_400_000) } }, include: { property: true }, orderBy: { startAt: "asc" } }),
    prisma.viewing.count({ where: { agencyId, status: "BOOKED", endAt: { lt: new Date(now.getTime() - 2 * 3_600_000) } } }),
    prisma.viewing.findMany({ where: { agencyId, interest: { gte: 4 }, updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } }, include: { applicant: true, property: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.applicant.count({ where: { agencyId, status: "ACTIVE", OR: [{ phone: null }, { smsOptOutAt: { not: null } }] } }),
    prisma.integration.findMany({ where: { agencyId, status: "ERROR" } }),
    prisma.viewing.findMany({ where: { agencyId, status: "BOOKED", startAt: { gte: dayStart, lt: dayEnd } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" } }),
    prisma.smsMessage.findMany({ where: { agencyId, applicantId: { not: null } }, include: { applicant: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const attention: Attention[] = [];
  if (!bot) attention.push({ key: "bot", tone: "blue", text: "Linkbot isn't set up, so nobody is texted about viewings.", href: "/linkbot/settings", action: "Create Linkbot" });
  else if (bot.numberStatus === "failed") attention.push({ key: "number", tone: "amber", text: bot.numberError ?? "Linkbot's number isn't set up.", href: "/linkbot/settings", action: "Settings" });
  for (const p of noSlots) attention.push({ key: `slots-${p.id}`, tone: "amber", text: `${p.address} is available but has no viewings to offer.`, href: `/properties/${p.id}`, action: "Open slots" });
  const soon = new Map<string, { address: string; count: number }>();
  for (const v of emptySoon) soon.set(v.propertyId, { address: v.property.address, count: (soon.get(v.propertyId)?.count ?? 0) + 1 });
  for (const [id, s] of soon) attention.push({ key: `soon-${id}`, tone: "amber", text: `${s.count} free viewing slot${s.count === 1 ? "" : "s"} in the next two days at ${s.address}.`, href: `/properties/${id}`, action: "Fill" });
  if (unmarked) attention.push({ key: "unmarked", tone: "blue", text: `${unmarked} viewing${unmarked === 1 ? "" : "s"} finished but not marked as happened or no-show.`, href: "/viewings", action: "Mark them" });
  for (const v of hot) attention.push({ key: `hot-${v.id}`, tone: "red", text: `${v.applicant?.firstName} ${v.applicant?.lastName} rated ${v.property.address} ${v.interest}/5. Call them about an offer.`, href: v.applicant ? `/applicants/${v.applicant.id}` : "/viewings", action: "Open" });
  if (unreachable) attention.push({ key: "unreachable", tone: "blue", text: `${unreachable} active applicant${unreachable === 1 ? "" : "s"} can't be texted (no mobile, or they texted STOP).`, href: "/applicants", action: "Review" });
  for (const i of broken) attention.push({ key: `int-${i.id}`, tone: "red", text: `${i.provider === "reapit" ? "Reapit" : i.provider} sync failed: ${i.lastError ?? "unknown error"}`, href: "/integrations", action: "Fix" });

  const tiles = [
    { label: "Available properties", value: n.availableProperties, icon: Home, href: "/properties" },
    { label: "Active applicants", value: n.activeApplicants, icon: Users, href: "/applicants" },
    { label: "Viewings booked, next 7 days", value: n.viewingsBookedThisWeek, icon: CalendarClock, href: "/viewings" },
    { label: "Free slots, next 7 days", value: n.openSlotsThisWeek, icon: CalendarClock, href: "/properties" },
    { label: "Invitations sent, last 7 days", value: n.invitationsSentThisWeek, icon: MessageSquareText, href: "/linkbot" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{today.format(now)}</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">Launchpad</h1>
        </div>
        <form action="/bot" className="flex w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-card sm:w-auto sm:min-w-[380px]">
          <Bot className="h-4 w-4 shrink-0 text-brand-700" />
          <input name="q" placeholder="Ask Bot: who's viewing today? fill the slots at…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Ask Bot" />
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group">
            <Card className="h-full p-4 transition group-hover:border-brand-200">
              <div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{t.label}</p><t.icon className="h-4 w-4 text-slate-300" /></div>
              <p className="tabular mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h2 className="text-sm font-semibold text-slate-900">Needs attention</h2><span className="text-xs text-slate-400">{attention.length}</span></div>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nothing needs you right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {attention.map((a) => (
                <li key={a.key} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="flex items-start gap-2 text-sm text-slate-700">
                    {a.tone === "red" ? <Flame className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === "amber" ? "bg-amber-500" : "bg-sky-500"}`} />}
                    {a.text}
                  </span>
                  <Link href={a.href} className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">{a.action} <ArrowRight className="h-3.5 w-3.5" /></Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Today&apos;s viewings</h2>
            {todays.length === 0 ? <p className="mt-2 text-sm text-slate-500">None booked today.</p> : (
              <ul className="mt-2 divide-y divide-slate-100">
                {todays.map((v) => (
                  <li key={v.id} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="tabular font-medium text-slate-900">{hm.format(v.startAt)}</span>
                    <span className="flex-1 truncate text-slate-600"><Link href={`/properties/${v.propertyId}`} className="hover:text-brand-700">{v.property.address}</Link></span>
                    <span className="text-slate-500">{v.applicant?.firstName} {v.applicant?.lastName?.charAt(0)}.</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Linkbot, latest</h2><Link href="/linkbot/texts" className="text-xs font-medium text-brand-700">All texts</Link></div>
            {texts.length === 0 ? <p className="mt-2 text-sm text-slate-500">No texts yet.</p> : (
              <ul className="mt-2 space-y-2 text-sm">
                {texts.map((t) => (
                  <li key={t.id} className="flex gap-2">
                    <Badge tone={t.direction === "IN" ? "blue" : "slate"}>{t.direction === "IN" ? t.applicant?.firstName ?? "In" : "Linkbot"}</Badge>
                    <span className="min-w-0 truncate text-slate-600">{t.body}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
