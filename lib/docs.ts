import { prisma } from "@/lib/db";
import { slotLabel } from "@/lib/linkbot/campaign";
import { money } from "@/lib/matching";

import { aiAvailable, aiTurn } from "./ai";

// Docs: drafts for someone to check before they're used. Particulars come
// from the property's own record; what Tenurage doesn't hold (council tax,
// EPC, tenure) is left as "[add …]", never guessed. Letters are written by AI
// from a brief and the facts given. Tenancy agreements and legal notices are
// deliberately not drafted here: use your solicitor's or a recognised template.

export type DocKind = "particulars" | "viewing_confirmation" | "letter";
export type DraftResult = { ok: true; id: string; title: string } | { ok: false; error: string };

const KIND_WORDS: Record<string, string> = { house: "house", flat: "flat", bungalow: "bungalow", other: "property" };

export function particularsText(p: { market: string; address: string; postcode: string; kind: string; bedrooms: number; price: number; summary: string; features: string[] }, agencyName: string, description?: string) {
  const headline = `${p.bedrooms}-bedroom ${KIND_WORDS[p.kind] ?? "property"} ${p.market === "SALE" ? "for sale" : "to let"}`;
  return [
    `${p.address}, ${p.postcode}`,
    `${headline} · ${money(p.price, p.market)}`,
    "",
    description || p.summary || "[add a description]",
    "",
    "Key features",
    ...(p.features.length ? p.features.map((f) => `• ${f}`) : ["• [add key features]"]),
    "",
    "Material information",
    "• Council tax band: [add]",
    "• EPC rating: [add]",
    `• ${p.market === "SALE" ? "Tenure: [add freehold or leasehold, and lease details]" : "Deposit and holding deposit: [add]"}`,
    "",
    `Marketed by ${agencyName}. These particulars are a draft: check every detail before publishing.`,
  ].join("\n");
}

export async function draftDocument(agencyId: string, userId: string | null, input: { kind: DocKind; propertyId?: string; brief?: string }): Promise<DraftResult> {
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { name: true, phone: true, email: true } });
  const property = input.propertyId ? await prisma.property.findFirst({ where: { id: input.propertyId, agencyId } }) : null;
  if (input.propertyId && !property) return { ok: false, error: "That property wasn't found." };
  let title: string;
  let body: string;
  let madeBy = "template";

  if (input.kind === "particulars") {
    if (!property) return { ok: false, error: "Particulars need a property." };
    let description: string | undefined;
    if (aiAvailable() && (property.summary || property.features.length)) {
      description =
        (await aiTurn({
          system: `You write UK property particulars for ${agency.name}. Write one paragraph of 60 to 120 words describing the property, using ONLY the facts given. Never invent rooms, sizes, views, condition, transport, schools or anything not stated. Plain, warm UK English, no exaggeration, no markdown.`,
          messages: [{ role: "user", content: JSON.stringify({ address: property.address, type: property.kind, bedrooms: property.bedrooms, market: property.market, price: money(property.price, property.market), summary: property.summary, features: property.features }) }],
          tools: {},
          ctx: null,
          maxCalls: 1,
        }).catch(() => null)) ?? undefined;
      if (description) madeBy = "ai";
    }
    title = `Particulars: ${property.address}`;
    body = particularsText(property, agency.name, description);
  } else if (input.kind === "viewing_confirmation") {
    if (!property) return { ok: false, error: "A viewing confirmation needs a property." };
    const v = await prisma.viewing.findFirst({ where: { propertyId: property.id, status: "BOOKED", startAt: { gte: new Date() } }, include: { applicant: true }, orderBy: { startAt: "asc" } });
    if (!v?.applicant) return { ok: false, error: "There's no upcoming booked viewing at that property." };
    title = `Viewing confirmation: ${v.applicant.firstName} ${v.applicant.lastName}, ${slotLabel(v.startAt)}`;
    body = [
      `Dear ${v.applicant.firstName},`,
      "",
      `Thank you for booking a viewing of ${property.address}, ${property.postcode}, on ${slotLabel(v.startAt)}.`,
      "",
      `If you can't make it, please let us know${agency.phone ? ` on ${agency.phone}` : ""}${agency.email ? ` or at ${agency.email}` : ""}, or reply to our text.`,
      "",
      "Kind regards,",
      agency.name,
    ].join("\n");
  } else {
    if (!input.brief?.trim()) return { ok: false, error: "Say what the letter should be about." };
    if (!aiAvailable()) return { ok: false, error: "Letters are written by AI, which isn't set up on this deployment yet." };
    const text = await aiTurn({
      system: `You draft short letters and emails for ${agency.name}, a UK estate and letting agency. Use only the facts in the brief and the property details given; where a fact is needed but missing, write [add …] instead of inventing it. Never give legal advice or draft tenancy agreements, notices or contracts: if asked, write one line saying to use the agency's solicitor or a recognised template. Plain UK English, no markdown. Sign off from ${agency.name}.`,
      messages: [{ role: "user", content: JSON.stringify({ brief: input.brief, property: property ? { address: property.address, postcode: property.postcode, price: money(property.price, property.market), bedrooms: property.bedrooms } : null }) }],
      tools: {},
      ctx: null,
      maxCalls: 1,
    }).catch(() => null);
    if (!text) return { ok: false, error: "The letter couldn't be written just now. Try again." };
    title = `Letter: ${input.brief.trim().slice(0, 60)}`;
    body = text;
    madeBy = "ai";
  }
  const doc = await prisma.document.create({ data: { agencyId, propertyId: property?.id, kind: input.kind, title, body, madeBy, createdById: userId } });
  return { ok: true, id: doc.id, title };
}
