import assert from "node:assert/strict";
import { test } from "node:test";

import { inArea, matches, mismatch, outwardCode } from "./matching";

const flat = { market: "LET", bedrooms: 2, price: 1450, postcode: "BS6 5QX", address: "Flat 2, 14 Cotham Hill, Bristol" };
const a = (over: Partial<{ id: string; market: string; minBedrooms: number; maxPrice: number; areas: string[] }> = {}) => ({ id: "a", market: "LET", minBedrooms: 1, maxPrice: 1500, areas: [], ...over });

test("outward code is the postcode minus its last three characters", () => {
  assert.equal(outwardCode("BS6 5QX"), "BS6");
  assert.equal(outwardCode("sw1a1aa"), "SW1A");
});

test("areas match by district, by postcode area, or by a town in the address; none means anywhere", () => {
  assert.equal(inArea(flat, []), true);
  assert.equal(inArea(flat, ["BS6"]), true);
  assert.equal(inArea(flat, ["bs6"]), true);
  assert.equal(inArea(flat, ["BS61"]), false);
  assert.equal(inArea(flat, ["BS"]), true);
  assert.equal(inArea(flat, ["Bristol"]), true);
  assert.equal(inArea(flat, ["Bath", "BS7"]), false);
});

test("each rule rules an applicant out on its own, with the reason", () => {
  assert.equal(mismatch(flat, a()), null);
  assert.match(mismatch(flat, a({ market: "SALE" }))!, /buy/);
  assert.match(mismatch(flat, a({ minBedrooms: 3 }))!, /3\+ bedrooms/);
  assert.match(mismatch(flat, a({ maxPrice: 1200 }))!, /budget £1,200/);
  assert.match(mismatch(flat, a({ areas: ["Bath"] }))!, /Bath/);
});

test("best matches first: the budget the price uses most, then the closest on bedrooms", () => {
  const ranked = matches(flat, [a({ id: "rich", maxPrice: 3000 }), a({ id: "tight", maxPrice: 1450 }), a({ id: "two", maxPrice: 1450, minBedrooms: 2 }), a({ id: "no", maxPrice: 900 })]);
  assert.deepEqual(ranked.map((r) => r.id), ["two", "tight", "rich"]);
});
