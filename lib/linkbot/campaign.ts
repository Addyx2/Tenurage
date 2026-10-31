import { randomInt } from "node:crypto";

import type { ViewingCampaign } from "@prisma/client";

import { prisma } from "@/lib/db";
import { mismatch, money } from "@/lib/matching";

import { textApplicant } from "./sms";

// Linkbot filling a property's open viewing slots. It texts the best-matched
// applicants a few at a time, each with a code; "YES 4821" books the first
// free slot, "YES 4821 10:20" a chosen one. The first to reply get the slots.
// When every slot is booked, everyone still holding an invitation is told.
// If nobody's left to ask, or the last slot has passed, the campaign ends.

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" });
const hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
export const slotLabel = (d: Date) => `${day.format(d)} ${hm.format(d)}`;

/** The applicants Linkbot may invite to a property's viewings, best first. */
export async function candidates(agencyId: string, propertyId: string, campaignId?: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, agencyId } });
  if (!property) return { property: null, ranked: [], skipped: [] as { name: string; reason: string }[] };
  const [applicants, invited, booked] = await Promise.all([
    prisma.applicant.findMany({ where: { agencyId, status: "ACTIVE", market: property.market } }),
    campaignId ? prisma.viewingInvite.findMany({ where: { campaignId }, select: { applicantId: true } }) : Promise.resolve([]),
    prisma.viewing.findMany({ where: { propertyId, applicantId: { not: null }, status: { in: ["BOOKED", "DONE"] } }, select: { applicantId: true } }),
  ]);
  const already = new Set([...invited.map((i) => i.applicantId), ...booked.map((b) => b.applicantId!)]);
  const skipped: { name: string; reason: string }[] = [];
  const ranked = applicants
    .filter((a) => {
      const name = `${a.firstName} ${a.lastName}`;
      const why = mismatch(property, a) ?? (already.has(a.id) ? "already invited or booked" : !a.phone ? "no mobile" : a.smsOptOutAt ? "texted STOP" : null);
      if (why) skipped.push({ name, reason: why });
      return !why;
    })
    .sort((x, y) => property.price / y.maxPrice - property.price / x.maxPrice);
  return { property, ranked, skipped };
}

export type StartResult = { ok: true; campaignId: string; invited: number } | { ok: false; error: string };

export async function startCampaign(agencyId: string, propertyId: string, startedById: string | null): Promise<StartResult> {
  const property = await prisma.property.findFirst({ where: { id: propertyId, agencyId } });
  if (!property) return { ok: false, error: "Property not found." };
  if (property.status !== "AVAILABLE") return { ok: false, error: "Only an available property can be shown." };
  const open = await prisma.viewing.count({ where: { propertyId, status: "OPEN", startAt: { gt: new Date() } } });
  if (open === 0) return { ok: false, error: "Add some viewing slots first." };
  if (await prisma.viewingCampaign.findFirst({ where: { propertyId, status: "RUNNING" } })) return { ok: false, error: "Linkbot is already filling this property's viewings." };
  const bot = await prisma.linkbot.findUnique({ where: { agencyId }, select: { waveSize: true, waveGapMins: true } });
  const campaign = await prisma.viewingCampaign.create({
    data: { agencyId, propertyId, startedById, waveSize: bot?.waveSize ?? 5, waveGapMins: bot?.waveGapMins ?? 30 },
  });
  const invited = await runWave(campaign);
  return { ok: true, campaignId: campaign.id, invited };
}

async function openSlots(propertyId: string) {
  return prisma.viewing.findMany({ where: { propertyId, status: "OPEN", startAt: { gt: new Date() } }, orderBy: { startAt: "asc" } });
}

async function runWave(campaign: ViewingCampaign): Promise<number> {
  const { property, ranked } = await candidates(campaign.agencyId, campaign.propertyId, campaign.id);
  const slots = await openSlots(campaign.propertyId);
  if (!property || slots.length === 0) {
    await finish(campaign, slots.length === 0 ? "filled" : "stopped");
    return 0;
  }
  const next = ranked.slice(0, campaign.waveSize);
  if (next.length === 0) {
    const waiting = await prisma.viewingInvite.count({ where: { campaignId: campaign.id, status: "SENT" } });
    if (waiting === 0 || campaign.wave === 0) await finish(campaign, "exhausted");
    else await prisma.viewingCampaign.update({ where: { id: campaign.id }, data: { nextWaveAt: new Date(Date.now() + campaign.waveGapMins * 60_000) } });
    return 0;
  }
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: campaign.agencyId }, select: { name: true } });
  const times = slots.slice(0, 4).map((s) => slotLabel(s.startAt)).join(", ");
  for (const a of next) {
    const code = String(randomInt(1000, 10000));
    await prisma.viewingInvite.create({ data: { campaignId: campaign.id, applicantId: a.id, code } });
    const body = `${agency.name}: hi ${a.firstName}, a ${property.bedrooms}-bed ${property.kind} at ${property.address} (${money(property.price, property.market)}) matches what you're after. Viewings: ${times}${slots.length > 4 ? " and more" : ""}. Reply YES ${code} for the first free slot, or YES ${code} and a time. Reply NO ${code} if not.`;
    await textApplicant(campaign.agencyId, a.id, body, code);
  }
  await prisma.viewingCampaign.update({
    where: { id: campaign.id },
    data: { wave: { increment: 1 }, invited: { increment: next.length }, nextWaveAt: new Date(Date.now() + campaign.waveGapMins * 60_000) },
  });
  return next.length;
}

async function finish(campaign: ViewingCampaign, outcome: "filled" | "exhausted" | "stopped" | "expired") {
  const ended = await prisma.viewingCampaign.updateMany({
    where: { id: campaign.id, status: "RUNNING" },
    data: { status: outcome === "stopped" ? "STOPPED" : "DONE", outcome, endedAt: new Date(), nextWaveAt: null },
  });
  if (ended.count === 0) return;
  const waiting = await prisma.viewingInvite.findMany({ where: { campaignId: campaign.id, status: "SENT" } });
  await prisma.viewingInvite.updateMany({ where: { campaignId: campaign.id, status: "SENT" }, data: { status: "CLOSED" } });
  if (outcome === "filled") {
    const property = await prisma.property.findUnique({ where: { id: campaign.propertyId }, include: { agency: { select: { name: true } } } });
    for (const w of waiting) await textApplicant(campaign.agencyId, w.applicantId, `${property?.agency.name}: the viewings at ${property?.address} are now full, sorry. We'll text you when something else matches.`);
  }
}

export type BookOutcome = { booked: true; label: string; address: string } | { booked: false; why: "full" | "gone" | "no_such_time" | "declined" };

/** An applicant's YES or NO to an invitation. Booking is atomic: two people can't get one slot. */
export async function answerInvite(agencyId: string, applicantId: string, code: string, yes: boolean, time: string | null): Promise<BookOutcome> {
  const invite = await prisma.viewingInvite.findFirst({ where: { code, applicantId, status: "SENT", campaign: { agencyId } }, include: { campaign: { include: { property: true } } } });
  if (!invite) return { booked: false, why: "gone" };
  if (!yes) {
    await prisma.viewingInvite.update({ where: { id: invite.id }, data: { status: "DECLINED", answeredAt: new Date() } });
    return { booked: false, why: "declined" };
  }
  const slots = await openSlots(invite.campaign.propertyId);
  const wanted = time ? slots.filter((s) => hm.format(s.startAt) === time) : slots;
  if (time && wanted.length === 0) return slots.length ? { booked: false, why: "no_such_time" } : { booked: false, why: "full" };
  for (const slot of wanted) {
    const took = await prisma.viewing.updateMany({ where: { id: slot.id, status: "OPEN" }, data: { status: "BOOKED", applicantId, bookedVia: "linkbot", bookedAt: new Date(), campaignId: invite.campaignId } });
    if (took.count === 1) {
      await prisma.viewingInvite.update({ where: { id: invite.id }, data: { status: "BOOKED", viewingId: slot.id, answeredAt: new Date() } });
      if ((await openSlots(invite.campaign.propertyId)).length === 0) await finish(invite.campaign, "filled");
      return { booked: true, label: slotLabel(slot.startAt), address: invite.campaign.property.address };
    }
  }
  return { booked: false, why: "full" };
}

export async function stopCampaign(agencyId: string, campaignId: string) {
  const c = await prisma.viewingCampaign.findFirst({ where: { id: campaignId, agencyId, status: "RUNNING" } });
  if (c) await finish(c, "stopped");
  return !!c;
}

/**
 * Moves everything on: next waves when due, campaigns whose slots have
 * passed, viewing reminders, and asking how a viewing went.
 */
export async function tick(now = new Date()) {
  const running = await prisma.viewingCampaign.findMany({ where: { status: "RUNNING" }, take: 200 });
  for (const c of running) {
    try {
      const slots = await prisma.viewing.count({ where: { propertyId: c.propertyId, status: "OPEN", startAt: { gt: now } } });
      if (slots === 0) await finish(c, (await prisma.viewing.count({ where: { campaignId: c.id, status: "BOOKED" } })) ? "filled" : "expired");
      else if (c.nextWaveAt && c.nextWaveAt <= now) {
        const claimed = await prisma.viewingCampaign.updateMany({ where: { id: c.id, nextWaveAt: c.nextWaveAt }, data: { nextWaveAt: null } });
        if (claimed.count === 1) await runWave(c);
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "linkbot_tick_failed", campaignId: c.id, error: String(error) }));
    }
  }

  const bots = await prisma.linkbot.findMany({ where: { enabled: true }, select: { agencyId: true, reminderHours: true, agency: { select: { name: true } } } });
  for (const bot of bots) {
    const soon = await prisma.viewing.findMany({
      where: { agencyId: bot.agencyId, status: "BOOKED", reminderAt: null, startAt: { gt: now, lte: new Date(now.getTime() + bot.reminderHours * 3_600_000) }, applicantId: { not: null } },
      include: { property: true },
    });
    for (const v of soon) {
      const claimed = await prisma.viewing.updateMany({ where: { id: v.id, reminderAt: null }, data: { reminderAt: now } });
      if (claimed.count) await textApplicant(bot.agencyId, v.applicantId!, `${bot.agency.name}: reminder, your viewing at ${v.property.address} is ${slotLabel(v.startAt)}. Reply if you can't make it.`);
    }
    const done = await prisma.viewing.findMany({
      where: { agencyId: bot.agencyId, status: "BOOKED", feedbackAskedAt: null, endAt: { lte: new Date(now.getTime() - 3_600_000), gte: new Date(now.getTime() - 3 * 86_400_000) }, applicantId: { not: null } },
      include: { property: true },
    });
    for (const v of done) {
      const claimed = await prisma.viewing.updateMany({ where: { id: v.id, feedbackAskedAt: null }, data: { feedbackAskedAt: now } });
      if (claimed.count) await textApplicant(bot.agencyId, v.applicantId!, `${bot.agency.name}: how was the viewing at ${v.property.address}? Reply 1 (not for me) to 5 (I'd like to make an offer), and any thoughts.`);
    }
  }
}

const LAST_TICK = "linkbot-last-tick";

/** At most once a minute, from whichever request gets there first. */
export async function maybeTick(now = new Date()) {
  try {
    const last = await prisma.serviceKey.findUnique({ where: { name: LAST_TICK } });
    if (last && now.getTime() - Number(last.value) < 60_000) return;
    if (last) {
      const claimed = await prisma.serviceKey.updateMany({ where: { name: LAST_TICK, value: last.value }, data: { value: String(now.getTime()) } });
      if (claimed.count === 0) return;
    } else await prisma.serviceKey.create({ data: { name: LAST_TICK, value: String(now.getTime()) } }).catch(() => undefined);
    await tick(now);
  } catch (error) {
    console.error("linkbot tick failed", error);
  }
}
