import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { prisma } from "@/lib/db";

import { startCampaign, tick } from "./campaign";
import { inboundToLinkbot, inboundToShared } from "./inbound";

// Linkbot end to end against a real database, with a stand-in for Twilio
// that records every text: invitations go out in waves to matched
// applicants, a NO is recorded, the next wave goes when due, the first YES
// gets a slot, everyone still holding an invitation hears when it's full,
// STOP is honoured, and an office text "YES 1234" runs a held job once.

const texts: { to: string; body: string }[] = [];
let twilio: Server;
let agencyId = "";
let linkbotId = "";
let officeUserId = "";
const OFFICE_MOBILE = "+447700900900";
const phones = ["+447700900501", "+447700900502", "+447700900503", "+447700900504"];

// Work that would run after the response, run straight away and awaited.
const pending: Promise<unknown>[] = [];
const later = (work: () => Promise<unknown>) => void pending.push(work());
const settle = async () => { await Promise.all(pending.splice(0)); };

before(async () => {
  twilio = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const form = new URLSearchParams(raw);
      if (form.get("Body")) texts.push({ to: form.get("To") ?? "", body: form.get("Body") ?? "" });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ sid: `SM${texts.length}`, incoming_phone_numbers: [] }));
    });
  });
  await new Promise<void>((done) => twilio.listen(0, done));
  process.env.TWILIO_API_URL = `http://localhost:${(twilio.address() as { port: number }).port}`;
  process.env.TWILIO_ACCOUNT_SID = `AC${"0".repeat(32)}`;
  process.env.TWILIO_AUTH_TOKEN = "test";
  process.env.TWILIO_FROM = "+447700900000";
  delete process.env.ANTHROPIC_API_KEY;

  const agency = await prisma.agency.create({ data: { name: "Contract Lettings", slug: `contract-${Date.now()}` } });
  agencyId = agency.id;
  officeUserId = (await prisma.user.create({ data: { agencyId, email: `office-${Date.now()}@contract.test`, passwordHash: "x", firstName: "Off", lastName: "Ice", role: "ADMIN", mobile: OFFICE_MOBILE } })).id;
  // Already has a number, so no purchase is attempted.
  linkbotId = (await prisma.linkbot.create({ data: { agencyId, number: "+447700900999", numberStatus: "active" } })).id;
  for (const [i, phone] of phones.entries()) {
    await prisma.applicant.create({ data: { agencyId, firstName: `App${i}`, lastName: "Licant", phone, market: "LET", minBedrooms: 2, maxPrice: 1500 + i * 100, areas: ["BS6"] } });
  }
  // Doesn't match (wants a sale): never invited.
  await prisma.applicant.create({ data: { agencyId, firstName: "Buyer", lastName: "Only", phone: "+447700900599", market: "SALE", maxPrice: 300000, areas: ["BS6"] } });
});

after(async () => {
  await prisma.agency.delete({ where: { id: agencyId } });
  await prisma.$disconnect();
  twilio.close();
});

let day = 1;
async function property(slots: number) {
  const p = await prisma.property.create({ data: { agencyId, market: "LET", address: `${day} Test Road, Bristol`, postcode: "BS6 5AA", kind: "flat", bedrooms: 2, price: 1400 } });
  for (let i = 0; i < slots; i++) {
    const startAt = new Date(Date.now() + day * 86_400_000 + i * 20 * 60_000);
    await prisma.viewing.create({ data: { agencyId, propertyId: p.id, startAt, endAt: new Date(startAt.getTime() + 15 * 60_000) } });
  }
  day++;
  return p;
}
const invites = (from = 0) => texts.slice(from).filter((t) => /Reply YES \d{4}/.test(t.body));
const codeFor = (phone: string) => texts.filter((t) => t.to === phone).at(-1)!.body.match(/YES (\d{4})/)![1];

test("waves: NO is recorded, the next wave goes when due, the first YES wins, the rest are told it's full", async () => {
  await prisma.linkbot.update({ where: { id: linkbotId }, data: { waveSize: 2 } });
  const p = await property(1);
  const started = await startCampaign(agencyId, p.id, null);
  assert.ok(started.ok);
  assert.equal(started.invited, 2);
  const wave1 = invites().map((t) => t.to);
  assert.equal(wave1.length, 2);
  assert.ok(!wave1.includes("+447700900599"), "a buyer isn't invited to a let");

  assert.match((await inboundToLinkbot(linkbotId, wave1[0], `no ${codeFor(wave1[0])}`, "in1", later))!, /won't book/);

  await tick();
  assert.equal(invites().length, 2, "the next wave waits until it's due");
  await prisma.viewingCampaign.update({ where: { id: started.ok ? started.campaignId : "" }, data: { nextWaveAt: new Date(Date.now() - 1000) } });
  await tick();
  const all = invites().map((t) => t.to);
  assert.equal(all.length, 4);
  assert.equal(new Set(all).size, 4, "nobody is invited twice");

  const taker = all[3];
  assert.match((await inboundToLinkbot(linkbotId, taker, `YES ${codeFor(taker)}`, "in2", later))!, /^Booked:/);
  const booked = await prisma.viewing.findFirstOrThrow({ where: { propertyId: p.id } });
  assert.equal(booked.status, "BOOKED");
  assert.equal(booked.bookedVia, "linkbot");

  const told = texts.filter((t) => /now full/.test(t.body)).map((t) => t.to).sort();
  assert.deepEqual(told, [wave1[1], all[2]].sort(), "those still holding an invitation are told; the one who said no isn't");
  const late = all[2];
  const lateCode = texts.filter((t) => t.to === late && /Reply YES/.test(t.body)).at(-1)!.body.match(/YES (\d{4})/)![1];
  assert.match((await inboundToLinkbot(linkbotId, late, `YES ${lateCode}`, "in3", later))!, /has closed/);
  const campaign = await prisma.viewingCampaign.findFirstOrThrow({ where: { propertyId: p.id } });
  assert.equal(campaign.outcome, "filled");
});

test("STOP on the shared number opts the applicant out; they aren't invited; START turns texts back on", async () => {
  const phone = phones[0];
  assert.match((await inboundToShared(phone, "STOP", "in4", later))!, /won't get any more texts/);
  const before = texts.length;
  await prisma.linkbot.update({ where: { id: linkbotId }, data: { waveSize: 10 } });
  const p = await property(2);
  const started = await startCampaign(agencyId, p.id, null);
  assert.ok(started.ok);
  assert.equal(invites(before).filter((t) => t.to === phone).length, 0);
  assert.equal(started.invited, 3);
  assert.match((await inboundToShared(phone, "start", "in5", later))!, /back on/);
  assert.equal((await prisma.applicant.findFirstOrThrow({ where: { agencyId, phone } })).smsOptOutAt, null);
});

test("an office job held for a code runs once on YES, and a NO cancels another", async () => {
  const p = await property(1);
  const job = await prisma.linkbotAction.create({ data: { agencyId, userId: officeUserId, code: "4321", tool: "set_property_status", input: { propertyId: p.id, status: "UNDER_OFFER" }, summary: "mark it under offer", expiresAt: new Date(Date.now() + 600_000) } });
  assert.equal(await inboundToLinkbot(linkbotId, OFFICE_MOBILE, "YES 4321", "in6", later), null, "office replies are texted, not returned");
  await settle();
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: p.id } })).status, "UNDER_OFFER");
  assert.equal((await prisma.linkbotAction.findUniqueOrThrow({ where: { id: job.id } })).status, "done");

  await inboundToLinkbot(linkbotId, OFFICE_MOBILE, "YES 4321", "in7", later);
  await settle();
  assert.match(texts.filter((t) => t.to === OFFICE_MOBILE).at(-1)!.body, /No job is waiting/);

  await prisma.linkbotAction.create({ data: { agencyId, userId: officeUserId, code: "5555", tool: "set_property_status", input: { propertyId: p.id, status: "WITHDRAWN" }, summary: "withdraw it", expiresAt: new Date(Date.now() + 600_000) } });
  await inboundToLinkbot(linkbotId, OFFICE_MOBILE, "no 5555", "in8", later);
  await settle();
  assert.equal((await prisma.property.findUniqueOrThrow({ where: { id: p.id } })).status, "UNDER_OFFER");
});

test("texts from unknown numbers get no reply", async () => {
  assert.equal(await inboundToLinkbot(linkbotId, "+447700900777", "hello", "in9", later), null);
  assert.equal(await inboundToShared("+447700900778", "YES 1111", "in10", later), null);
});
