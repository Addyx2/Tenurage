import assert from "node:assert/strict";
import { test } from "node:test";

import { particularsText } from "./docs";

const flat = { market: "LET", address: "Flat 2, 14 Cotham Hill, Bristol", postcode: "BS6 5QX", kind: "flat", bedrooms: 2, price: 1450, summary: "", features: [] as string[] };

test("particulars leave what Tenurage doesn't know as [add …], never a guess", () => {
  const text = particularsText(flat, "Harbour Lettings");
  assert.match(text, /2-bedroom flat to let · £1,450 pcm/);
  assert.match(text, /\[add a description\]/);
  assert.match(text, /• \[add key features\]/);
  assert.match(text, /Council tax band: \[add\]/);
  assert.match(text, /EPC rating: \[add\]/);
  assert.match(text, /Deposit and holding deposit: \[add\]/);
  assert.match(text, /draft: check every detail/);
});

test("for sale, tenure is asked for; features and summary come from the record", () => {
  const text = particularsText({ ...flat, market: "SALE", price: 325000, summary: "Bright top-floor flat.", features: ["Balcony"] }, "Harbour Homes");
  assert.match(text, /for sale · £325,000$/m);
  assert.match(text, /Bright top-floor flat\./);
  assert.match(text, /• Balcony/);
  assert.match(text, /Tenure: \[add/);
});
