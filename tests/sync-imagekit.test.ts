// tests/sync-imagekit.test.ts
// Helper ImageKit côté edge (sync-printful) : whitelist, format, idempotence.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateImageSource,
  isImagekitUrl,
  imagekitUrl,
  displayImageUrl,
  imagekitEndpoint,
} from "../supabase/functions/sync-printful/_shared/imagekit.ts";

const PF = "https://files.cdn.printful.com/o/uploaded-url/test.jpg";
const SB = "https://hkbybsycaylobvbnnwak.supabase.co/storage/v1/object/public/x/y.jpg";

test("validateImageSource: Printful + Supabase OK, reste rejeté", () => {
  process.env.SUPABASE_URL = "https://hkbybsycaylobvbnnwak.supabase.co";
  assert.equal(validateImageSource(PF), true);
  assert.equal(validateImageSource(SB), true);
  assert.equal(validateImageSource("https://printful.com.evil.com/x.jpg"), false);
  assert.equal(validateImageSource("http://169.254.169.254/x"), false);
  assert.equal(validateImageSource("javascript:alert(1)"), false);
  assert.equal(validateImageSource("https://example.com/x.jpg"), false);
  assert.equal(validateImageSource(""), false);
});

test("sans endpoint: passthrough (jamais d'image cassée)", () => {
  delete process.env.IMAGEKIT_URL_ENDPOINT;
  assert.equal(imagekitEndpoint(), "");
  assert.equal(imagekitUrl(PF, { quality: 80, format: "webp" }), PF);
  assert.equal(displayImageUrl(PF), PF);
});

test("avec endpoint: format fetch + idempotent", () => {
  process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/testid/";
  const out = imagekitUrl(PF, { quality: 80, format: "webp", width: 800 });
  assert.equal(
    out,
    "https://ik.imagekit.io/testid/tr:w-800,q-80,f-webp/" + encodeURIComponent(PF),
  );
  assert.ok(isImagekitUrl(out));
  assert.equal(imagekitUrl(out, { quality: 80, format: "webp" }), out);
  assert.equal(
    displayImageUrl(SB),
    "https://ik.imagekit.io/testid/tr:q-80,f-webp/" + encodeURIComponent(SB),
  );
});
