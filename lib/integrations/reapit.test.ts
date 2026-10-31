import assert from "node:assert/strict";
import { test } from "node:test";

import { mapApplicant, mapProperty } from "./reapit";

test("maps a Reapit letting with weekly rent to monthly", () => {
  const p = mapProperty({ id: "RPT1", marketingMode: "letting", address: { buildingNumber: "12", line1: "Elm Road", line3: "Bristol", postcode: "bs6 5ab" }, bedrooms: 2, type: ["flat"], letting: { rent: 300, rentFrequency: "weekly", status: "toLet" } });
  assert.deepEqual(p && { market: p.market, address: p.address, postcode: p.postcode, kind: p.kind, price: p.price, status: p.status }, { market: "LET", address: "12 Elm Road, Bristol", postcode: "BS6 5AB", kind: "flat", price: 1300, status: "AVAILABLE" });
});

test("skips a property with no status Tenurage understands", () => {
  assert.equal(mapProperty({ id: "X", marketingMode: "selling", address: { line1: "A", postcode: "BS1 1AA" }, selling: { price: 1, status: "preAppraisal" } }), null);
});

test("maps a buying applicant and their mobile", () => {
  const a = mapApplicant({ id: "A1", marketingMode: "buying", buying: { priceTo: 350000 }, bedroomsMin: 3, locationOptions: ["BS6", " BS7 "], related: [{ name: "Mrs Jane Smith", mobilePhone: "07700 900123" }] });
  assert.equal(a?.firstName, "Jane");
  assert.equal(a?.lastName, "Smith");
  assert.equal(a?.phone, "+447700900123");
  assert.deepEqual(a?.areas, ["BS6", "BS7"]);
  assert.equal(a?.market, "SALE");
});
