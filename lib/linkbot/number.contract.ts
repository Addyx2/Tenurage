import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { prisma } from "@/lib/db";

import { provisionNumber, retryWaitingNumbers } from "./number";
import { smsSender } from "./sms";

// Linkbot gets its own UK mobile number with only the Twilio account set:
// Tenurage finds the approved UK mobile bundle and its address through
// Twilio's API, waits plainly while there isn't one, and buys the number by
// itself within the hour once Twilio approves it.

let twilio: Server;
let agencyId = "";
let linkbotId = "";
let approved = false;
const bought: Record<string, string>[] = [];

before(async () => {
  twilio = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const url = req.url ?? "";
      res.setHeader("Content-Type", "application/json");
      if (url.startsWith("/v2/RegulatoryCompliance/Bundles?")) return res.end(JSON.stringify({ results: approved ? [{ sid: "BUaultrum" }] : [] }));
      if (url.startsWith("/v2/RegulatoryCompliance/Bundles/BUaultrum/ItemAssignments")) return res.end(JSON.stringify({ results: [{ object_sid: "ITenduser" }, { object_sid: "ADaultrum" }] }));
      if (url.includes("/AvailablePhoneNumbers/GB/Mobile.json")) return res.end(JSON.stringify({ available_phone_numbers: [{ phone_number: "+447700900444" }] }));
      if (req.method === "POST" && url.endsWith("/IncomingPhoneNumbers.json")) {
        bought.push(Object.fromEntries(new URLSearchParams(raw)));
        return res.end(JSON.stringify({ sid: "PNlinkbot", phone_number: "+447700900444" }));
      }
      res.statusCode = 404;
      res.end("{}");
    });
  });
  await new Promise<void>((done) => twilio.listen(0, done));
  process.env.TWILIO_API_URL = `http://localhost:${(twilio.address() as { port: number }).port}`;
  process.env.TWILIO_ACCOUNT_SID = `AC${"2".repeat(32)}`;
  process.env.TWILIO_AUTH_TOKEN = "test";
  delete process.env.TWILIO_FROM;
  delete process.env.TWILIO_BUNDLE_SID;
  process.env.APP_URL = "https://tenurage.test";
  agencyId = (await prisma.agency.create({ data: { name: "Number Lettings", slug: `number-${Date.now()}` } })).id;
  linkbotId = (await prisma.linkbot.create({ data: { agencyId } })).id;
});

after(async () => {
  await prisma.agency.delete({ where: { id: agencyId } });
  await prisma.$disconnect();
  twilio.close();
});

test("before the bundle is approved: a plain message, no setting names, and no texting without a shared number", async () => {
  assert.equal((await provisionNumber(linkbotId)).ok, false);
  const bot = await prisma.linkbot.findUniqueOrThrow({ where: { id: linkbotId } });
  assert.equal(bot.numberStatus, "failed");
  assert.match(bot.numberError!, /waiting on UK number approval/);
  assert.doesNotMatch(bot.numberError!, /TWILIO_|SID/);
  assert.equal(await smsSender(agencyId), null);
  assert.equal(bought.length, 0);
});

test("once approved, the waiting Linkbot buys its number by itself under the discovered bundle, and texts from it", async () => {
  approved = true;
  assert.equal(await retryWaitingNumbers(), 0, "not again within the hour");
  assert.equal(await retryWaitingNumbers(new Date(Date.now() + 2 * 3_600_000)), 1);
  assert.deepEqual([bought[0]?.BundleSid, bought[0]?.AddressSid], ["BUaultrum", "ADaultrum"]);
  assert.equal(bought[0]?.SmsUrl, `https://tenurage.test/api/webhooks/twilio/linkbot/${linkbotId}`);
  assert.equal((await smsSender(agencyId))?.from, "+447700900444");
});
