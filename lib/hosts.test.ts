import assert from "node:assert/strict";
import { test } from "node:test";

import { hostsFrom, siteFor, staysOnMarketing } from "./hosts";

const APP = "https://app.tenurage.com";

test("the marketing site is the app's domain without app., with and without www", () => {
  assert.deepEqual(hostsFrom(APP), { app: "app.tenurage.com", marketing: ["tenurage.com", "www.tenurage.com"] });
  assert.equal(siteFor("tenurage.com", APP), "marketing");
  assert.equal(siteFor("WWW.Tenurage.com", APP), "marketing");
  assert.equal(siteFor("app.tenurage.com", APP), "app");
});

test("previews, localhost and an unset or non-app. APP_URL serve both", () => {
  assert.equal(siteFor("tenurage-git-x.vercel.app", APP), "both");
  assert.equal(siteFor("localhost:3000", undefined), "both");
  assert.equal(siteFor("localhost:3000", "http://localhost:3000"), "app");
  // Before APP_URL moves to app.tenurage.com, tenurage.com stays the app.
  assert.equal(siteFor("tenurage.com", "https://tenurage.com"), "app");
  assert.equal(siteFor("tenurage.com", "not a url"), "both");
});

test("only the landing page, its images and the API stay on the marketing site", () => {
  for (const p of ["/", "/api/webhooks/twilio/shared", "/landing/today-desktop.jpg"]) assert.equal(staysOnMarketing(p), true, p);
  for (const p of ["/login", "/signup", "/today", "/properties/abc", "/launchpad"]) assert.equal(staysOnMarketing(p), false, p);
});
