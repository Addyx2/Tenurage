import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { prisma } from "@/lib/db";

import { syncReapit } from "./reapit";
import { saveIntegration } from "./store";

// Reapit sync against a stand-in for Reapit Foundations: client-credentials
// sign-in, paged properties and applicants, upsert on the Reapit id (a second
// sync updates, never duplicates), a STOP survives a sync, and a bad secret
// leaves a plain error on the integration.

let reapit: Server;
let agencyId = "";
let rent = 1200;
const calls: string[] = [];

before(async () => {
  reapit = createServer((req, res) => {
    calls.push(`${req.method} ${req.url?.split("?")[0]} ${req.headers["reapit-customer"] ?? ""}`);
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/token") {
      const ok = req.headers.authorization === `Basic ${Buffer.from("cid:good").toString("base64")}`;
      res.statusCode = ok ? 200 : 400;
      return res.end(JSON.stringify(ok ? { access_token: "tok" } : { error: "invalid_client" }));
    }
    if (req.headers.authorization !== "Bearer tok") { res.statusCode = 401; return res.end("{}"); }
    const page = Number(new URL(req.url!, "http://x").searchParams.get("pageNumber") ?? 1);
    if (req.url!.startsWith("/properties/")) {
      const all = [
        { id: "P1", marketingMode: "letting", bedrooms: 2, type: ["flat"], address: { buildingNumber: "1", line1: "Reapit Road", line3: "Bristol", postcode: "BS6 1AA" }, letting: { rent, rentFrequency: "monthly", status: "toLet" } },
        { id: "P2", marketingMode: "selling", bedrooms: 3, type: ["house"], address: { buildingNumber: "2", line1: "Reapit Road", postcode: "BS6 1AB" }, selling: { price: 400000, status: "underOffer" } },
        { id: "P3", marketingMode: "selling", address: { line1: "No price", postcode: "BS6 1AC" }, selling: { status: "forSale" } },
      ];
      return res.end(JSON.stringify({ _embedded: page === 1 ? all.slice(0, 2) : all.slice(2), pageNumber: page, pageCount: 2 }));
    }
    if (req.url!.startsWith("/applicants/")) {
      return res.end(JSON.stringify({ _embedded: [{ id: "A1", marketingMode: "renting", active: true, bedroomsMin: 2, renting: { rentTo: 1500, rentFrequency: "monthly" }, locationOptions: ["BS6"], related: [{ name: "Ms Rae Pit", mobilePhone: "07700 900321" }] }], pageNumber: 1, pageCount: 1 }));
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((done) => reapit.listen(0, done));
  const base = `http://localhost:${(reapit.address() as { port: number }).port}`;
  process.env.REAPIT_TOKEN_URL = `${base}/token`;
  process.env.REAPIT_API_URL = base;
  agencyId = (await prisma.agency.create({ data: { name: "Reapit Test", slug: `reapit-${Date.now()}` } })).id;
});

after(async () => {
  await prisma.agency.delete({ where: { id: agencyId } });
  await prisma.$disconnect();
  reapit.close();
});

test("imports properties and applicants across pages, skipping what it can't use", async () => {
  await saveIntegration({ agencyId, provider: "reapit", config: { customerId: "SBOX" }, secrets: { clientId: "cid", clientSecret: "good" } });
  const r = await syncReapit(agencyId);
  assert.deepEqual(r, { ok: true, properties: 2, applicants: 1, skipped: 1 });
  assert.ok(calls.some((c) => c === "GET /properties/ SBOX"), "sends the customer id");
  const props = await prisma.property.findMany({ where: { agencyId }, orderBy: { reapitId: "asc" } });
  assert.deepEqual(props.map((p) => [p.reapitId, p.market, p.status, p.price]), [["P1", "LET", "AVAILABLE", 1200], ["P2", "SALE", "UNDER_OFFER", 400000]]);
  const a = await prisma.applicant.findFirstOrThrow({ where: { agencyId } });
  assert.equal(a.phone, "+447700900321");
  assert.equal(a.firstName, "Rae");
});

test("a second sync updates in place and keeps a STOP", async () => {
  await prisma.applicant.updateMany({ where: { agencyId }, data: { smsOptOutAt: new Date() } });
  rent = 1250;
  assert.ok((await syncReapit(agencyId)).ok);
  assert.equal(await prisma.property.count({ where: { agencyId } }), 2);
  assert.equal((await prisma.property.findFirstOrThrow({ where: { agencyId, reapitId: "P1" } })).price, 1250);
  assert.ok((await prisma.applicant.findFirstOrThrow({ where: { agencyId } })).smsOptOutAt, "still opted out");
});

test("a bad secret leaves a plain error on the integration", async () => {
  await saveIntegration({ agencyId, provider: "reapit", config: { customerId: "SBOX" }, secrets: { clientId: "cid", clientSecret: "bad" } });
  const r = await syncReapit(agencyId);
  assert.equal(r.ok, false);
  const i = await prisma.integration.findFirstOrThrow({ where: { agencyId, provider: "reapit" } });
  assert.equal(i.status, "ERROR");
  assert.match(i.lastError!, /didn't accept the client id and secret/);
});
