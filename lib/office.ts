import { addMinutes } from "date-fns";
import { z } from "zod";

import { recordAudit, type AuditActor } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { draftDocument } from "@/lib/docs";
import { startCampaign, stopCampaign, slotLabel } from "@/lib/linkbot/campaign";
import { textApplicant } from "@/lib/linkbot/sms";
import { matches, money } from "@/lib/matching";
import { date, id, int, oneOf, optional, shape, str } from "@/lib/schema";

import type { Tool } from "./ai";

// What the office can ask Bot (in Tenurage) or Linkbot (by text) to look up
// or do. Look-ups run at once. Changes are proposals: Bot shows Approve and
// Decline; Linkbot holds them for YES and a code. Drafting a document only
// makes a draft, so it runs at once.

export interface OfficeCtx {
  agencyId: string;
  user: AuditActor & { firstName: string; lastName: string };
}

const statusWords = ["AVAILABLE", "UNDER_OFFER", "LET_AGREED", "SOLD", "LET", "WITHDRAWN"] as const;

export const READS: Record<string, Tool<OfficeCtx>> = {
  find: {
    description: "Find properties by address or postcode, and applicants by name. Use first to turn a name into an id.",
    input: shape({ query: str("Words to search for", 80) }),
    run: async ({ query }, ctx) => {
      const q = String(query);
      const [properties, applicants] = await Promise.all([
        prisma.property.findMany({ where: { agencyId: ctx.agencyId, OR: [{ address: { contains: q, mode: "insensitive" } }, { postcode: { contains: q, mode: "insensitive" } }] }, take: 8 }),
        prisma.applicant.findMany({ where: { agencyId: ctx.agencyId, OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] }, take: 8 }),
      ]);
      return {
        properties: properties.map((p) => ({ propertyId: p.id, address: p.address, postcode: p.postcode, status: p.status, price: money(p.price, p.market) })),
        applicants: applicants.map((a) => ({ applicantId: a.id, name: `${a.firstName} ${a.lastName}`, wants: `${a.market === "SALE" ? "buy" : "rent"}, ${a.minBedrooms}+ beds, up to ${money(a.maxPrice, a.market)}` })),
      };
    },
  },
  property: {
    description: "One property: details, its viewing slots (open and booked) and how many applicants match it.",
    input: shape({ propertyId: id("Property id") }),
    run: async ({ propertyId }, ctx) => {
      const p = await prisma.property.findFirst({ where: { id: String(propertyId), agencyId: ctx.agencyId }, include: { viewings: { where: { startAt: { gte: new Date() } }, include: { applicant: true }, orderBy: { startAt: "asc" } } } });
      if (!p) return { error: "Not found" };
      const applicants = await prisma.applicant.findMany({ where: { agencyId: ctx.agencyId, status: "ACTIVE", market: p.market } });
      const campaign = await prisma.viewingCampaign.findFirst({ where: { propertyId: p.id, status: "RUNNING" } });
      return {
        address: p.address,
        price: money(p.price, p.market),
        bedrooms: p.bedrooms,
        status: p.status,
        slots: p.viewings.map((v) => ({ when: slotLabel(v.startAt), status: v.status, who: v.applicant ? `${v.applicant.firstName} ${v.applicant.lastName}` : null })),
        matchingApplicants: matches(p, applicants).length,
        linkbotFilling: !!campaign,
      };
    },
  },
  viewings: {
    description: "Viewings on a day (default today), or the next 7 days if no day is given and none are today.",
    input: shape({ day: optional(date("The day")) }),
    run: async ({ day }, ctx) => {
      const from = day ? new Date(`${day}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
      const to = new Date(from.getTime() + (day ? 1 : 7) * 86_400_000);
      const v = await prisma.viewing.findMany({ where: { agencyId: ctx.agencyId, startAt: { gte: from, lt: to }, status: { in: ["BOOKED", "OPEN"] } }, include: { property: true, applicant: true }, orderBy: { startAt: "asc" }, take: 40 });
      return v.map((x) => ({ when: slotLabel(x.startAt), address: x.property.address, status: x.status, who: x.applicant ? `${x.applicant.firstName} ${x.applicant.lastName}` : null }));
    },
  },
  applicant: {
    description: "One applicant: what they want, their viewings and the available properties that match them.",
    input: shape({ applicantId: id("Applicant id") }),
    run: async ({ applicantId }, ctx) => {
      const a = await prisma.applicant.findFirst({ where: { id: String(applicantId), agencyId: ctx.agencyId }, include: { viewings: { include: { property: true }, orderBy: { startAt: "desc" }, take: 10 } } });
      if (!a) return { error: "Not found" };
      const props = await prisma.property.findMany({ where: { agencyId: ctx.agencyId, status: "AVAILABLE", market: a.market } });
      const suit = props.filter((p) => matches(p, [a]).length > 0);
      return {
        name: `${a.firstName} ${a.lastName}`,
        wants: `${a.market === "SALE" ? "buy" : "rent"}, ${a.minBedrooms}+ beds, up to ${money(a.maxPrice, a.market)}, ${a.areas.join(", ") || "anywhere"}`,
        viewings: a.viewings.map((v) => ({ when: slotLabel(v.startAt), address: v.property.address, status: v.status, interest: v.interest })),
        matchingProperties: suit.map((p) => ({ propertyId: p.id, address: p.address, price: money(p.price, p.market) })),
      };
    },
  },
  numbers: {
    description: "Today's numbers: available properties, active applicants, viewings booked this week, viewings with no one booked, and Linkbot activity.",
    input: shape({}),
    run: async (_i, ctx) => launchpadNumbers(ctx.agencyId),
  },
};

export async function launchpadNumbers(agencyId: string) {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const [available, applicants, booked, open, running, invited] = await Promise.all([
    prisma.property.count({ where: { agencyId, status: "AVAILABLE" } }),
    prisma.applicant.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.viewing.count({ where: { agencyId, status: "BOOKED", startAt: { gte: now, lt: week } } }),
    prisma.viewing.count({ where: { agencyId, status: "OPEN", startAt: { gte: now, lt: week } } }),
    prisma.viewingCampaign.count({ where: { agencyId, status: "RUNNING" } }),
    prisma.viewingInvite.count({ where: { campaign: { agencyId }, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
  ]);
  return { availableProperties: available, activeApplicants: applicants, viewingsBookedThisWeek: booked, openSlotsThisWeek: open, linkbotFillingNow: running, invitationsSentThisWeek: invited };
}

export interface Change {
  description: string;
  input: { zod: z.ZodTypeAny; json: Record<string, unknown> };
  /** The line shown for approval, or null if the ids don't exist. */
  describe: (input: Record<string, unknown>, ctx: OfficeCtx) => Promise<string | null>;
  run: (input: Record<string, unknown>, ctx: OfficeCtx) => Promise<string>;
}

const propertyLine = async (agencyId: string, propertyId: unknown) => {
  const p = await prisma.property.findFirst({ where: { id: String(propertyId), agencyId } });
  return p?.address ?? null;
};

export const CHANGES: Record<string, Change> = {
  fill_viewings: {
    description: "Have Linkbot text matched applicants about a property's open viewing slots until they're booked.",
    input: shape({ propertyId: id("Property id") }),
    describe: async ({ propertyId }, ctx) => ((await propertyLine(ctx.agencyId, propertyId)) ? `fill the viewings at ${await propertyLine(ctx.agencyId, propertyId)}` : null),
    run: async ({ propertyId }, ctx) => {
      const r = await startCampaign(ctx.agencyId, String(propertyId), ctx.user.id);
      return r.ok ? `Linkbot is on it: invited ${r.invited} applicant${r.invited === 1 ? "" : "s"} so far.` : r.error;
    },
  },
  stop_filling: {
    description: "Stop Linkbot inviting applicants to a property's viewings.",
    input: shape({ propertyId: id("Property id") }),
    describe: async ({ propertyId }, ctx) => ((await propertyLine(ctx.agencyId, propertyId)) ? `stop filling the viewings at ${await propertyLine(ctx.agencyId, propertyId)}` : null),
    run: async ({ propertyId }, ctx) => {
      const c = await prisma.viewingCampaign.findFirst({ where: { agencyId: ctx.agencyId, propertyId: String(propertyId), status: "RUNNING" } });
      if (!c) return "Linkbot wasn't filling it.";
      await stopCampaign(ctx.agencyId, c.id);
      return "Stopped.";
    },
  },
  add_slots: {
    description: "Open viewing slots at a property: a number of back-to-back slots from a start time.",
    input: shape({ propertyId: id("Property id"), day: date("The day"), time: str("Start time, HH:MM", 5), count: int("How many slots", 1, 12), minutes: int("Minutes each", 10, 120) }),
    describe: async (i, ctx) => {
      const address = await propertyLine(ctx.agencyId, i.propertyId);
      return address && /^\d{1,2}:\d{2}$/.test(String(i.time)) ? `open ${i.count} ${i.minutes}-minute viewing slot${Number(i.count) === 1 ? "" : "s"} at ${address} from ${i.time} on ${i.day}` : null;
    },
    run: async (i, ctx) => {
      const start = new Date(`${i.day}T${String(i.time).padStart(5, "0")}:00`);
      if (Number.isNaN(start.getTime()) || start < new Date()) return "That time has passed.";
      const n = Number(i.count);
      const m = Number(i.minutes);
      await prisma.viewing.createMany({ data: Array.from({ length: n }, (_, k) => ({ agencyId: ctx.agencyId, propertyId: String(i.propertyId), startAt: addMinutes(start, k * m), endAt: addMinutes(start, (k + 1) * m) })) });
      return `Opened ${n} slot${n === 1 ? "" : "s"}.`;
    },
  },
  text_applicant: {
    description: "Text an applicant from the agency, in the person's words.",
    input: shape({ applicantId: id("Applicant id"), message: str("The text", 400) }),
    describe: async ({ applicantId, message }, ctx) => {
      const a = await prisma.applicant.findFirst({ where: { id: String(applicantId), agencyId: ctx.agencyId } });
      return a ? `text ${a.firstName} ${a.lastName}: "${String(message).slice(0, 120)}"` : null;
    },
    run: async ({ applicantId, message }, ctx) => {
      const agency = await prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId }, select: { name: true } });
      const r = await textApplicant(ctx.agencyId, String(applicantId), `${agency.name}: ${String(message)}`);
      return r.sent ? "Sent." : `Not sent: ${r.reason}.`;
    },
  },
  set_property_status: {
    description: "Change a property's status (e.g. under offer, let agreed, withdrawn).",
    input: shape({ propertyId: id("Property id"), status: oneOf(statusWords, "New status") }),
    describe: async ({ propertyId, status }, ctx) => {
      const address = await propertyLine(ctx.agencyId, propertyId);
      return address ? `mark ${address} as ${String(status).toLowerCase().replace("_", " ")}` : null;
    },
    run: async ({ propertyId, status }, ctx) => {
      await prisma.property.updateMany({ where: { id: String(propertyId), agencyId: ctx.agencyId }, data: { status: String(status) } });
      if (status !== "AVAILABLE") {
        const c = await prisma.viewingCampaign.findFirst({ where: { propertyId: String(propertyId), status: "RUNNING" } });
        if (c) await stopCampaign(ctx.agencyId, c.id);
      }
      return "Done.";
    },
  },
};

/** Drafting is safe (it only makes a draft), so Bot and Linkbot do it at once. */
export const DRAFT_TOOL: Tool<OfficeCtx> = {
  description: "Draft a document: property particulars, a viewing confirmation, or a short letter or email. It's saved as a draft in Docs for someone to check.",
  input: shape({ kind: oneOf(["particulars", "viewing_confirmation", "letter"] as const, "What to draft"), propertyId: optional(id("Property id, if it's about one")), brief: optional(str("For a letter: what it should say", 600)) }),
  run: async (i, ctx) => {
    const r = await draftDocument(ctx.agencyId, ctx.user.id, { kind: i.kind as "particulars" | "viewing_confirmation" | "letter", propertyId: i.propertyId as string | undefined, brief: i.brief as string | undefined });
    return r.ok ? { drafted: r.title, where: `Docs (/docs/${r.id})` } : { error: r.error };
  },
};

export async function runChange(name: string, input: Record<string, unknown>, ctx: OfficeCtx): Promise<string> {
  const change = CHANGES[name];
  if (!change) return "That can't be done here.";
  const result = await change.run(input, ctx);
  await recordAudit(ctx.user, { action: `office.${name}`, summary: `${(await change.describe(input, ctx)) ?? name}: ${result}` });
  return result;
}

