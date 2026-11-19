import assert from "node:assert/strict";
import { test } from "node:test";

import { stageLabel, stageOf } from "./pipeline";

const now = new Date("2026-11-17T12:00:00Z");
const later = new Date("2026-11-18T10:00:00Z");
const earlier = new Date("2026-11-15T10:00:00Z");

test("no viewings is new; an upcoming booking is booked; a past one is viewed", () => {
  assert.equal(stageOf({ offerStage: null, viewings: [] }, now), "NEW");
  assert.equal(stageOf({ offerStage: null, viewings: [{ status: "CANCELLED", startAt: later }] }, now), "NEW");
  assert.equal(stageOf({ offerStage: null, viewings: [{ status: "BOOKED", startAt: later }] }, now), "BOOKED");
  assert.equal(stageOf({ offerStage: null, viewings: [{ status: "DONE", startAt: earlier }] }, now), "VIEWED");
  assert.equal(stageOf({ offerStage: null, viewings: [{ status: "BOOKED", startAt: earlier }] }, now), "VIEWED");
});

test("another viewing booked after one they've seen shows as booked", () => {
  assert.equal(stageOf({ offerStage: null, viewings: [{ status: "DONE", startAt: earlier }, { status: "BOOKED", startAt: later }] }, now), "BOOKED");
});

test("the office's offer stage wins over viewings", () => {
  assert.equal(stageOf({ offerStage: "OFFER", viewings: [{ status: "BOOKED", startAt: later }] }, now), "OFFER");
  assert.equal(stageOf({ offerStage: "AGREED", viewings: [] }, now), "AGREED");
  assert.equal(stageOf({ offerStage: "nonsense", viewings: [] }, now), "NEW");
});

test("labels follow the market", () => {
  assert.equal(stageLabel("OFFER", "SALE"), "Offer");
  assert.equal(stageLabel("OFFER", "LET"), "Applied");
  assert.equal(stageLabel("AGREED", "SALE"), "Sold");
  assert.equal(stageLabel("AGREED", "LET"), "Let");
});
