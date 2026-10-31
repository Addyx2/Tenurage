import assert from "node:assert/strict";
import { test } from "node:test";

import { optOutWord, parseBookReply, parseInterest } from "./sms";

test("booking replies: a code, and optionally a time", () => {
  assert.deepEqual(parseBookReply("YES 4821"), { yes: true, code: "4821", time: null });
  assert.deepEqual(parseBookReply("yes 4821 10:20"), { yes: true, code: "4821", time: "10:20" });
  assert.deepEqual(parseBookReply("y 4821 9.40"), { yes: true, code: "4821", time: "09:40" });
  assert.deepEqual(parseBookReply("no 4821"), { yes: false, code: "4821", time: null });
  assert.equal(parseBookReply("yes please"), null);
  assert.equal(parseBookReply("can I see it at 10?"), null);
});

test("interest after a viewing is a number from 1 to 5 at the start", () => {
  assert.equal(parseInterest("4"), 4);
  assert.equal(parseInterest("5/5 loved it"), 5);
  assert.equal(parseInterest("6"), null);
  assert.equal(parseInterest("it was nice"), null);
});

test("STOP and START only on their own; never 'cancel'", () => {
  assert.equal(optOutWord("stop"), "stop");
  assert.equal(optOutWord("Start"), "start");
  assert.equal(optOutWord("cancel"), null);
  assert.equal(optOutWord("please stop texting at night"), null);
});
