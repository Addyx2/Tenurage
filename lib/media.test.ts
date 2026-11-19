import assert from "node:assert/strict";
import { test } from "node:test";

import { directionsUrl, parsePhotoUrls, parseVideoUrl } from "./media";

test("photo links: https only, one per line or comma, duplicates dropped", () => {
  assert.deepEqual(parsePhotoUrls("https://img.example.com/a.jpg\n https://img.example.com/b.jpg ,https://img.example.com/a.jpg\n\n"), {
    photos: ["https://img.example.com/a.jpg", "https://img.example.com/b.jpg"],
  });
  assert.deepEqual(parsePhotoUrls(""), { photos: [] });
  assert.ok("error" in parsePhotoUrls("http://img.example.com/a.jpg"));
  assert.ok("error" in parsePhotoUrls("javascript:alert(1)"));
  assert.ok("error" in parsePhotoUrls("https://localhost/a.jpg"));
  assert.ok("error" in parsePhotoUrls(Array.from({ length: 21 }, (_, i) => `https://img.example.com/${i}.jpg`).join("\n")));
});

test("video tour: an https link to a playable file, or empty to clear", () => {
  assert.deepEqual(parseVideoUrl("https://cdn.example.com/tours/ashley.mp4"), { videoUrl: "https://cdn.example.com/tours/ashley.mp4" });
  assert.deepEqual(parseVideoUrl("  "), { videoUrl: null });
  assert.ok("error" in parseVideoUrl("https://www.youtube.com/watch?v=abc"));
  assert.ok("error" in parseVideoUrl("http://cdn.example.com/a.mp4"));
});

test("directions go to the address, adding the postcode when it isn't in it", () => {
  assert.equal(directionsUrl("3 Ashley Hill, Bristol", "BS7 9LE"), "https://www.google.com/maps/dir/?api=1&destination=3%20Ashley%20Hill%2C%20Bristol%2C%20BS7%209LE");
  assert.ok(directionsUrl("3 Ashley Hill, Bristol BS7 9LE", "BS7 9LE").endsWith("Bristol%20BS7%209LE"));
});
