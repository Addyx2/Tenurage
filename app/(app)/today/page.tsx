import Link from "next/link";
import { ArrowRight, CalendarDays, Flame, Home, Plug, Sparkles, Users } from "lucide-react";

import { AskBot } from "@/components/AskBot";
import { Avatar, ContactButtons, Source } from "@/components/people";
import { PropertyCard, street } from "@/components/PropertyCard";
import { PropertyMedia } from "@/components/media";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { candidates, maybeTick } from "@/lib/linkbot/campaign";
import { money } from "@/lib/matching";
import { directionsUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { askBotAction } from "../bot/actions";
import { fillViewingsAction } from "../linkbot/actions";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const TZ = "Europe/London";
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" });
const shortDay = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourNow = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n: number, one: string, many = `${one}s`) => `${WORDS[n] ?? n} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Now", "14 min", "18:05" (today), "Sun", or a date. */
function ago(d: Date, now: Date): string {
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return "Now";
  if (mins < 60) return `${mins} min`;
  if (dayKey.format(d) === dayKey.format(now)) return hm.format(d);
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return shortDay.format(d);
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
}

/** "Today 18:00", "Tomorrow 17:30", "Thursday 12:00". */
function whenLabel(d: Date, now: Date): string {
  const today = dayKey.format(now);
  const tomorrow = dayKey.format(new Date(now.getTime() + 86_400_000));
  const k = dayKey.format(d);
  return `${k === today ? "Today" : k === tomorrow ? "Tomorrow" : weekday.format(d)} · ${hm.format(d)}`;
}

interface Activity {
  key: string;
  at: Date;
  who: "Linkbot" | "Bot" | "Feedback" | "Office";
  title: string;
  detail?: string;
  quote?: string;
  href?: string;
}

interface Need {
  key: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  hot?: boolean;
  person?: { first: string; last: string; phone: string | null };
  icon?: React.ComponentType<{ className?: string }>;
}

export default async function TodayPage() {
  const user = await requireUser();
  await maybeTick();
  const agencyId = user.agencyId;
  const now = new Date();
  const dayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const tomorrowEnd = new Date(dayEnd.getTime() + 86_400_000);
  const week = new Date(now.getTime() - 7 * 86_400_000);

  const [bot, todays, upcoming, openTomorrow, noSlots, emptySoon, unmarked, hot, unreachable, broken, pendingProposals, booked, feedback, campaigns, reminders, decided, market] = await Promise.all([
    prisma.linkbot.findUnique({ where: { agencyId } }),
    prisma.viewing.findMany({ where: { agencyId, status: "BOOKED", startAt: { gte: dayStart, lt: dayEnd } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" } }),
    prisma.viewing.findMany({ where: { agencyId, status: "BOOKED", startAt: { gte: dayEnd } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" }, take: 3 }),
    prisma.viewing.count({ where: { agencyId, status: "OPEN", startAt: { gte: dayEnd, lt: tomorrowEnd } } }),
    prisma.property.findMany({ where: { agencyId, status: "AVAILABLE", viewings: { none: { startAt: { gt: now }, status: { in: ["OPEN", "BOOKED"] } } } }, take: 5 }),
    prisma.viewing.findMany({ where: { agencyId, status: "OPEN", startAt: { gt: now, lt: new Date(now.getTime() + 2 * 86_400_000) } }, include: { property: true }, orderBy: { startAt: "asc" } }),
    prisma.viewing.count({ where: { agencyId, status: "BOOKED", endAt: { lt: new Date(now.getTime() - 2 * 3_600_000) } } }),
    prisma.viewing.findMany({ where: { agencyId, interest: { gte: 4 }, updatedAt: { gte: week } }, include: { applicant: true, property: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.applicant.findMany({ where: { agencyId, status: "ACTIVE", OR: [{ phone: null }, { smsOptOutAt: { not: null } }] }, take: 20 }),
    prisma.integration.findMany({ where: { agencyId, status: "ERROR" } }),
    prisma.botMessage.count({ where: { userId: user.id, status: "pending" } }),
    prisma.viewing.findMany({ where: { agencyId, bookedAt: { gte: week }, bookedVia: { in: ["linkbot", "office"] } }, include: { property: true, applicant: true }, orderBy: { bookedAt: "desc" }, take: 6 }),
    prisma.viewing.findMany({ where: { agencyId, feedback: { not: null }, updatedAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } }, include: { property: true, applicant: true }, orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.viewingCampaign.findMany({ where: { agencyId, OR: [{ createdAt: { gte: week } }, { endedAt: { gte: week } }] }, include: { property: true }, orderBy: { updatedAt: "desc" }, take: 4 }),
    prisma.viewing.findMany({ where: { agencyId, reminderAt: { gte: new Date(now.getTime() - 2 * 86_400_000) } }, include: { property: true, applicant: true }, orderBy: { reminderAt: "desc" }, take: 3 }),
    prisma.botMessage.findMany({ where: { userId: user.id, status: { in: ["approved", "declined"] }, createdAt: { gte: week } }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.property.findMany({
      where: { agencyId, status: { in: ["AVAILABLE", "UNDER_OFFER", "LET_AGREED"] } },
      include: { viewings: { where: { startAt: { gte: now }, status: { in: ["OPEN", "BOOKED"] } }, select: { status: true } }, campaigns: { where: { status: "RUNNING" }, select: { id: true } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
  ]);

  // Linkbot's suggestion: the first property with free slots that nobody is filling yet, and who it would text.
  const toFill = market.find((p) => p.status === "AVAILABLE" && p.campaigns.length === 0 && p.viewings.some((v) => v.status === "OPEN"));
  const pool = toFill ? await candidates(agencyId, toFill.id) : null;
  const suggestion = toFill && pool && pool.ranked.length ? { property: toFill, open: toFill.viewings.filter((v) => v.status === "OPEN").length, names: pool.ranked.slice(0, 2).map((a) => `${a.firstName} ${a.lastName}`), more: pool.ranked.length - 2 } : null;

  // Needs a person.
  const needs: Need[] = [];
  if (pendingProposals) needs.push({ key: "proposals", title: `Bot is waiting for your approval`, detail: `${count(pendingProposals, "change")} proposed in your conversation`, href: "/bot", action: "Review", icon: Sparkles });
  for (const v of hot) {
    if (!v.applicant) continue;
    needs.push({ key: `hot-${v.id}`, hot: true, title: `${v.applicant.firstName} ${v.applicant.lastName} rated ${street(v.property.address)} ${v.interest}/5`, detail: v.feedback ? `“${v.feedback.slice(0, 90)}”` : "Call them about an offer", href: `/applicants/${v.applicant.id}`, action: "Open", person: { first: v.applicant.firstName, last: v.applicant.lastName, phone: v.applicant.phone } });
  }
  if (!bot) needs.push({ key: "bot", title: "Linkbot isn't set up", detail: "So nobody is texted about viewings", href: "/linkbot/settings", action: "Set up", icon: Sparkles });
  else if (bot.numberStatus === "failed") needs.push({ key: "number", title: "Linkbot's number isn't working", detail: bot.numberError ?? "It can't text until it has one", href: "/linkbot/settings", action: "Settings", icon: Sparkles });
  for (const p of noSlots) needs.push({ key: `slots-${p.id}`, title: `${street(p.address)} has no viewings to offer`, detail: "Open some slots and Linkbot can fill them", href: `/properties/${p.id}#viewings`, action: "Open slots", icon: Home });
  const soon = new Map<string, { address: string; n: number }>();
  for (const v of emptySoon) soon.set(v.propertyId, { address: v.property.address, n: (soon.get(v.propertyId)?.n ?? 0) + 1 });
  for (const [id, s] of soon) needs.push({ key: `soon-${id}`, title: `${cap(count(s.n, "free slot"))} at ${street(s.address)}`, detail: "In the next two days", href: `/properties/${id}`, action: "Fill", icon: CalendarDays });
  if (unmarked) needs.push({ key: "unmarked", title: `${cap(count(unmarked, "viewing"))} not marked yet`, detail: "Did they happen, or no-show?", href: "/viewings", action: "Mark", icon: CalendarDays });
  for (const a of unreachable.slice(0, 3)) needs.push({ key: `reach-${a.id}`, title: `${a.firstName} ${a.lastName} can't be texted`, detail: a.smsOptOutAt ? "They texted STOP" : "No mobile, so Linkbot can't text them matches", href: `/applicants/${a.id}`, action: a.smsOptOutAt ? "Open" : "Add number", person: { first: a.firstName, last: a.lastName, phone: a.phone } });
  if (unreachable.length > 3) needs.push({ key: "reach-more", title: `${unreachable.length - 3} more applicants can't be texted`, detail: "No mobile, or they texted STOP", href: "/applicants", action: "Review", icon: Users });
  for (const i of broken) needs.push({ key: `int-${i.id}`, hot: true, title: `${i.provider === "reapit" ? "Reapit" : i.provider} sync failed`, detail: i.lastError ?? "Unknown error", href: "/integrations", action: "Fix", icon: Plug });

  // What happened recently: Linkbot, Bot and the office.
  const activity: Activity[] = [];
  for (const v of booked) {
    if (!v.applicant || !v.bookedAt) continue;
    activity.push({ key: `b-${v.id}`, at: v.bookedAt, who: v.bookedVia === "linkbot" ? "Linkbot" : "Office", title: `Booked ${v.applicant.firstName} ${v.applicant.lastName} for ${street(v.property.address)}`, detail: whenLabel(v.startAt, now), href: `/properties/${v.propertyId}` });
  }
  for (const v of feedback) {
    activity.push({ key: `f-${v.id}`, at: v.feedbackAskedAt && v.feedbackAskedAt > v.updatedAt ? v.feedbackAskedAt : v.updatedAt, who: "Feedback", title: `${v.applicant ? `${v.applicant.firstName} ${v.applicant.lastName} · ` : ""}${street(v.property.address)}${v.interest ? ` · ${v.interest}/5` : ""}`, quote: v.feedback ?? undefined, href: v.applicant ? `/applicants/${v.applicant.id}` : `/properties/${v.propertyId}` });
  }
  for (const c of campaigns) {
    const ended = c.endedAt && c.endedAt >= week;
    const outcome = c.outcome === "filled" ? "Filled every slot" : c.outcome === "exhausted" ? "Ran out of matched applicants" : c.outcome === "expired" ? "Slots passed before they filled" : "Stopped texting";
    activity.push({ key: `c-${c.id}`, at: ended ? c.endedAt! : c.createdAt, who: "Linkbot", title: ended ? `${outcome} at ${street(c.property.address)}` : `Texting matched applicants for ${street(c.property.address)}`, detail: `${cap(count(c.invited, "applicant"))} invited`, href: `/properties/${c.propertyId}` });
  }
  for (const v of reminders) {
    if (!v.applicant || !v.reminderAt) continue;
    activity.push({ key: `r-${v.id}`, at: v.reminderAt, who: "Linkbot", title: `Reminded ${v.applicant.firstName} ${v.applicant.lastName} about ${street(v.property.address)}`, detail: whenLabel(v.startAt, now) });
  }
  for (const m of decided) activity.push({ key: `p-${m.id}`, at: m.createdAt, who: "Bot", title: m.body, detail: m.status === "approved" ? "You approved it" : "You declined it", href: "/bot" });
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  // The headline: two sentences, the second in grey.
  const hour = hourNow(now);
  const greeting = `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${user.firstName}.`;
  const later = todays.filter((v) => v.endAt > now);
  const first = later[0] ?? todays[todays.length - 1] ?? upcoming[0];
  const summary = [
    todays.length ? `${cap(count(todays.length, "viewing"))} today` : upcoming[0] ? `No viewings today; next is ${whenLabel(upcoming[0].startAt, now).replace(" · ", " at ")}` : "No viewings booked",
    openTomorrow ? `${count(openTomorrow, "slot")} to fill tomorrow` : needs.length ? `${count(needs.length, "thing")} for you` : "nothing waiting on you",
  ].join(", ") + ".";
  const rest = todays.filter((v) => v !== first);

  return (
    <div>
      <section className="grid items-center gap-6 pb-8 pt-4 md:pt-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12 lg:pb-16 lg:pt-14">
        <div>
          <p className="mb-3 text-[13px] text-slate-500 lg:mb-[18px]">{longDay.format(now)} · {user.agency.name}</p>
          <h1 className="headline text-[30px] sm:text-5xl xl:text-[62px]">
            {greeting} <span className="text-slate-400">{summary}</span>
          </h1>
          <AskBot action={askBotAction} variant="inline" inHero placeholder={first ? `Ask Bot: “Who’s viewing ${street(first.property.address)}?”` : "Ask Bot: “Which properties need viewings?”"} className="mt-5" />
        </div>

        <div className="relative -mx-4 overflow-hidden p-4 md:mx-0 md:min-h-[520px] md:rounded-[28px] md:p-10">
          <div className="sky" aria-hidden="true"><i /><i /><i /></div>
          <div className="relative flex flex-col gap-3 md:block">
            {first ? (
              <article className="w-full overflow-hidden rounded-card bg-white shadow-float md:w-[340px]">
                <PropertyMedia property={first.property} className="aspect-video" />
                <div className="p-5">
                  <div className="mb-2 flex items-baseline gap-2.5">
                    <b className="tabular text-[30px] font-medium tracking-[-0.03em]">{hm.format(first.startAt)}</b>
                    <span className="text-[13px] text-slate-500">{whenLabel(first.startAt, now).split(" · ")[0]} · {Math.round((first.endAt.getTime() - first.startAt.getTime()) / 60_000)} min</span>
                  </div>
                  <h2 className="text-lg font-semibold tracking-[-0.015em]"><Link href={`/properties/${first.propertyId}`} className="hover:underline">{street(first.property.address)}</Link></h2>
                  <p className="text-sm text-slate-500">{first.property.postcode} · {first.property.bedrooms} bed {first.property.kind} · {money(first.property.price, first.property.market)}</p>
                  {first.applicant ? (
                    <Link href={`/applicants/${first.applicant.id}`} className="mt-4 flex items-center gap-3">
                      <Avatar first={first.applicant.firstName} last={first.applicant.lastName} />
                      <span><b className="block text-[15px] font-medium">{first.applicant.firstName} {first.applicant.lastName}</b><span className="text-sm text-slate-500">Applicant · booked by {first.bookedVia === "linkbot" ? "Linkbot" : first.bookedVia === "reapit" ? "Reapit" : "the office"}</span></span>
                    </Link>
                  ) : null}
                  <ContactButtons className="mt-4" phone={first.applicant?.phone ?? null} name={first.applicant ? `${first.applicant.firstName} ${first.applicant.lastName}` : "applicant"} directions={directionsUrl(first.property.address, first.property.postcode)} />
                </div>
              </article>
            ) : (
              <article className="w-full rounded-card bg-white p-6 shadow-float md:w-[340px]">
                <CalendarDays className="h-6 w-6 text-slate-400" />
                <h2 className="mt-3 text-lg font-semibold tracking-[-0.015em]">No viewings booked</h2>
                <p className="mt-1 text-sm text-slate-500">Open slots on a property and Linkbot will text matched applicants to fill them.</p>
                <Link href="/properties" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Properties <ArrowRight className="h-4 w-4" /></Link>
              </article>
            )}
            {suggestion ? (
              <article className="rounded-card bg-white p-[18px] text-sm leading-[1.45] shadow-float md:absolute md:bottom-9 md:right-8 md:w-[300px]">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ai-500"><Sparkles className="h-3.5 w-3.5" /> Linkbot suggests</p>
                <p>
                  <b className="font-semibold">{street(suggestion.property.address)}</b> has {count(suggestion.open, "open slot")}. {suggestion.names.join(" and ")}{suggestion.more > 0 ? ` and ${suggestion.more} more` : ""} {suggestion.names.length + Math.max(0, suggestion.more) === 1 ? "matches" : "match"}.
                </p>
                <div className="mt-4 flex gap-2">
                  <form action={fillViewingsAction}>
                    <input type="hidden" name="propertyId" value={suggestion.property.id} />
                    <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-black">Text them</button>
                  </form>
                  <Link href={`/properties/${suggestion.property.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Review</Link>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>

      {rest.length ? (
        <section className="mb-6">
          <h2 className="mb-4 flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]">Also today <span className="text-[13px] font-normal text-slate-500">{rest.length}</span></h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-card border border-line bg-white p-3">
                <PropertyMedia property={v.property} video={false} label={false} className="aspect-square w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="tabular text-sm font-semibold">{hm.format(v.startAt)} <span className="font-normal text-slate-500">· {street(v.property.address)}</span></p>
                  <p className="truncate text-sm text-slate-500">{v.applicant ? `${v.applicant.firstName} ${v.applicant.lastName}` : "Free"}</p>
                </div>
                <ContactButtons compact phone={v.applicant?.phone ?? null} name={v.applicant?.firstName ?? "applicant"} directions={directionsUrl(v.property.address, v.property.postcode)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <div className="rounded-card border border-line bg-white p-5 md:p-7">
          <h2 className="mb-4 flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]">Recent activity <span className="text-[13px] font-normal text-slate-500">Linkbot, Bot and the office</span></h2>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing yet this week. When Linkbot texts, books or hears back, it shows here.</p>
          ) : (
            <ul>
              {activity.slice(0, 6).map((a, i) => (
                <li key={a.key} className={cn("flex items-start gap-3.5 py-4", i === 0 ? "pt-1" : "border-t border-slate-200")}>
                  <Source who={a.who} />
                  <div className="min-w-0 flex-1">
                    {a.href ? <Link href={a.href} className="text-[15px] font-medium hover:underline">{a.title}</Link> : <b className="text-[15px] font-medium">{a.title}</b>}
                    {a.quote ? <p className="mt-1 font-serif text-[19px] leading-snug">“{a.quote}”</p> : null}
                    {a.detail ? <p className="text-sm text-slate-500">{a.detail}</p> : null}
                  </div>
                  <time dateTime={a.at.toISOString()} className="shrink-0 text-xs text-slate-500">{ago(a.at, now)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-line bg-white p-5 md:p-7">
          <h2 className="mb-4 flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]">Needs a person <span className="text-[13px] font-normal text-slate-500">{needs.length}</span></h2>
          {needs.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing needs you right now.</p>
          ) : (
            <ul>
              {needs.map((n, i) => (
                <li key={n.key} className={cn("flex items-start gap-3.5 py-4", i === 0 ? "pt-1" : "border-t border-slate-200")}>
                  {n.person ? <Avatar first={n.person.first} last={n.person.last} /> : (
                    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{n.icon ? <n.icon className="h-[18px] w-[18px]" /> : null}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={n.href} className="flex items-center gap-1.5 text-[15px] font-medium hover:underline">{n.hot ? <Flame className="h-4 w-4 shrink-0 text-red-500" aria-label="Urgent" /> : null}{n.title}</Link>
                    <p className="text-sm text-slate-500">{n.detail}</p>
                  </div>
                  {n.person?.phone && n.hot ? (
                    <ContactButtons compact phone={n.person.phone} name={`${n.person.first} ${n.person.last}`} />
                  ) : (
                    <Link href={n.href} className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-[13px] font-medium hover:bg-slate-50">{n.action}</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8 md:mt-14">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="flex items-baseline gap-2.5 text-lg font-semibold tracking-[-0.01em]">On the market <span className="text-[13px] font-normal text-slate-500">{count(market.length, "property", "properties")}</span></h2>
          <Link href="/properties" className="text-sm font-medium text-slate-500 hover:text-slate-900">All properties</Link>
        </div>
        {market.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing on the market. <Link href="/properties/new" className="font-medium text-slate-900 underline">Add a property</Link>.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
            {market.map((p) => (
              <PropertyCard key={p.id} p={p} booked={p.viewings.filter((v) => v.status === "BOOKED").length} open={p.viewings.filter((v) => v.status === "OPEN").length} filling={p.campaigns.length > 0} fillAction={fillViewingsAction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
